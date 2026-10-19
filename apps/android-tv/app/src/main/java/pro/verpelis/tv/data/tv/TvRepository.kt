package pro.verpelis.tv.data.tv

import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import com.squareup.moshi.Json
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import pro.verpelis.tv.data.playback.ApiCallException
import pro.verpelis.tv.data.playback.TitleKind

/** Usuario de la sesión (users.me). */
data class MeDto(
    @Json(name = "_id") val id: String = "",
    val name: String? = null,
    val email: String? = null,
    val role: String? = null,
    val planId: String? = null,
    val planExpiresAt: Double? = null,
) {
    val displayName: String get() = name?.trim()?.takeIf { it.isNotEmpty() } ?: email?.substringBefore('@').orEmpty()
    val initials: String
        get() = displayName.split(' ', '.', '_').filter { it.isNotBlank() }.take(2)
            .joinToString("") { it.take(1).uppercase() }.ifBlank { "?" }
}

/** Película/serie con la forma pública del API (toMovieShape). */
data class TitleDto(
    @Json(name = "_id") val id: String = "",
    val name: String? = null,
    val title: String? = null,
    val image: String? = null,
    val backdropImage: String? = null,
    val synopsis: String? = null,
    val genre: Any? = null,
    val releaseYear: String? = null,
    val year: Any? = null,
    val classification: String? = null,
    val mediaType: String? = null,
    val comingSoon: Boolean? = null,
    val rating: Any? = null,
    val seriesKey: String? = null,
    val seasonCount: Any? = null,
    val totalEpisodes: Any? = null,
) {
    val displayName: String get() = name?.takeIf { it.isNotBlank() } ?: title.orEmpty()
    val kind: TitleKind get() = if (mediaType == "series") TitleKind.SERIES else TitleKind.MOVIE
    val yearText: String get() = releaseYear?.takeIf { it.isNotBlank() } ?: year?.toString()?.removeSuffix(".0").orEmpty()
    val genreText: String
        get() = when (val g = genre) {
            is List<*> -> g.filterNotNull().joinToString(", ")
            null -> ""
            else -> g.toString().trim('[', ']').replace("'", "")
        }
}

/** Fila cruda de Prisma en history.getContinueWatching (`movie` sin forma pública). */
data class RawMovieDto(
    val id: String = "",
    val name: String? = null,
    val image: String? = null,
    val backdropImage: String? = null,
    val mediaType: String? = null,
)

data class ContinueDto(
    val progress: Double = 0.0,
    val duration: Double = 0.0,
    val movie: RawMovieDto? = null,
)

/** Algo que se sigue viendo: id, tipo, nombre, poster y fracción vista. */
data class ContinueItem(val id: String, val kind: TitleKind, val name: String, val image: String?, val fraction: Float, val progressSec: Long)

/**
 * Datos de las pantallas 2.0.0 contra las funciones existentes del API web
 * (POST /api/function/<nombre>, misma sesión/cookies que el resto de la app).
 */
class TvRepository(baseUrl: String, private val http: OkHttpClient) {
    private val base = baseUrl.trimEnd('/') + "/"
    internal val moshi: Moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val json = "application/json; charset=utf-8".toMediaType()

    suspend fun call(name: String, body: String = "{}"): String = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(base + "api/function/" + name).post(body.toRequestBody(json)).build()
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val message = runCatching { moshi.adapter(Map::class.java).fromJson(text)?.get("error") as? String }.getOrNull()
                throw ApiCallException(response.code, message ?: "HTTP ${response.code}")
            }
            text
        }
    }

    /** Llama y convierte fuera del hilo principal (las listas grandes pesan cientos de KB). */
    internal suspend inline fun <reified T> fetchList(name: String, body: String = "{}"): List<T> {
        val text = call(name, body)
        return withContext(Dispatchers.Default) { list<T>(text) }
    }

    internal inline fun <reified T> list(text: String): List<T> {
        if (text.isBlank() || text == "null") return emptyList()
        val type = Types.newParameterizedType(List::class.java, T::class.java)
        return moshi.adapter<List<T>>(type).fromJson(text).orEmpty()
    }

    fun quote(value: String): String = moshi.adapter(String::class.java).toJson(value)

    // ---- Sesión ----
    suspend fun me(): MeDto? {
        val text = call("users.me")
        if (text.isBlank() || text == "null") return null
        return moshi.adapter(MeDto::class.java).fromJson(text)
    }

    // ---- Inicio ----
    suspend fun featured(): List<TitleDto> = fetchList("movies.getFeatured")

    suspend fun continueWatching(limit: Int = 12): List<ContinueItem> =
        fetchList<ContinueDto>("history.getContinueWatching", """{"limit":$limit}""").mapNotNull { row ->
            val m = row.movie ?: return@mapNotNull null
            if (m.id.isBlank() || row.duration <= 0) return@mapNotNull null
            ContinueItem(
                id = m.id,
                kind = if (m.mediaType == "SERIES") TitleKind.SERIES else TitleKind.MOVIE,
                name = m.name.orEmpty(),
                image = m.image,
                fraction = (row.progress / row.duration).toFloat().coerceIn(0f, 1f),
                progressSec = row.progress.toLong(),
            )
        }
}

val LocalTvRepository = staticCompositionLocalOf<TvRepository> { error("TvRepository not provided") }

/** Sesión en memoria: se pide una vez y se comparte entre pantallas (rail, cabecera, perfil). */
object MeCache {
    /** Estado observable: el menú y la cabecera se actualizan al cerrar o iniciar sesión. */
    var me by androidx.compose.runtime.mutableStateOf<MeDto?>(null)
    var loadedAt = 0L
    fun clear() { me = null; loadedAt = 0L }
    suspend fun get(repo: TvRepository, force: Boolean = false): MeDto? {
        if (!force && loadedAt != 0L && System.currentTimeMillis() - loadedAt < 10 * 60_000) return me
        runCatching { repo.me() }.onSuccess {
            me = it
            loadedAt = System.currentTimeMillis()
        }
        return me
    }
}
