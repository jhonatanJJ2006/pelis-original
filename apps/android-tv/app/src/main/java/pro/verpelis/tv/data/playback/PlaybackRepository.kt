package pro.verpelis.tv.data.playback

import com.squareup.moshi.Json
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.io.IOException
import java.util.concurrent.TimeUnit

internal data class MovieDto(
    @Json(name = "_id") val id: String? = null,
    val name: String? = null,
    val title: String? = null,
    val image: String? = null,
    val backdropImage: String? = null,
    val synopsis: String? = null,
    val genre: Any? = null,
    val releaseYear: String? = null,
    val year: Any? = null,
    val classification: String? = null,
    val videoUrl: String? = null,
    val token: String? = null,
    val mediaType: String? = null,
    val episodes: Any? = null,
    val totalEpisodes: Any? = null,
    val comingSoon: Boolean? = null,
    val actors: String? = null,
    val subtitleTracks: List<Map<String, Any?>>? = null,
)

internal data class HistoryDto(val progress: Double? = null, val duration: Double? = null)

class ApiCallException(val status: Int, message: String) : IOException(message)

/**
 * Datos de reproducción de películas/series/anime contra el API web existente
 * (mismas funciones que usan la web y la app nativa: movies.getById, anime.getById,
 * history.*, anime.getEpisodeStream y /api/stream/resolve).
 */
class PlaybackRepository(baseUrl: String, apiHttp: OkHttpClient) : PlaybackBackend {
    override val base: String = baseUrl.trimEnd('/') + "/"
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val json = "application/json; charset=utf-8".toMediaType()

    private val http: OkHttpClient = apiHttp

    /** anime.getEpisodeStream tiene un presupuesto de 25 s en el servidor. */
    private val slowHttp: OkHttpClient = apiHttp.newBuilder().readTimeout(45, TimeUnit.SECONDS).build()

    /**
     * Cliente de ExoPlayer: mismas cookies/sesión que el API, sin log por segmento
     * y sin forzar Accept: application/json.
     */
    val streamHttp: OkHttpClient = apiHttp.newBuilder().apply {
        interceptors().removeAll { it is HttpLoggingInterceptor }
        addInterceptor(Interceptor { chain -> chain.proceed(chain.request().newBuilder().header("Accept", "*/*").build()) })
        readTimeout(30, TimeUnit.SECONDS)
    }.build()

    private suspend fun function(name: String, body: String, client: OkHttpClient = http): String =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(base + "api/function/" + name)
                .post(body.toRequestBody(json))
                .header("Content-Type", "application/json")
                .build()
            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val message = runCatching {
                        moshi.adapter(Map::class.java).fromJson(text)?.get("error") as? String
                    }.getOrNull()
                    throw ApiCallException(response.code, message ?: "HTTP ${response.code}")
                }
                text
            }
        }

    private fun quote(value: String): String = moshi.adapter(String::class.java).toJson(value)

    override suspend fun title(kind: TitleKind, id: String): TitleDetail {
        val fn = if (kind == TitleKind.ANIME) "anime.getById" else "movies.getById"
        val text = function(fn, """{"id":${quote(id)}}""")
        val dto = moshi.adapter(MovieDto::class.java).fromJson(text)
            ?: throw ApiCallException(404, "Título no encontrado")
        return toDetail(kind, dto)
    }

    private fun intOf(value: Any?): Int = when (value) {
        is Number -> value.toInt()
        is String -> value.toIntOrNull() ?: 0
        else -> 0
    }

    private fun toDetail(requested: TitleKind, dto: MovieDto): TitleDetail {
        val kind = when {
            requested == TitleKind.ANIME -> TitleKind.ANIME
            dto.mediaType == "series" || dto.mediaType == "tv" -> TitleKind.SERIES
            else -> TitleKind.MOVIE
        }
        val genre = when (val g = dto.genre) {
            is List<*> -> g.filterNotNull().joinToString(", ")
            is String -> g
            else -> ""
        }
        val year = dto.releaseYear?.takeIf { it.isNotBlank() }
            ?: when (val y = dto.year) { is Number -> y.toInt().toString(); is String -> y; else -> "" }
        val subs = dto.subtitleTracks.orEmpty().mapNotNull { s ->
            val url = PlaybackUrls.absolute(base, (s["url"] ?: s["src"]) as? String) ?: return@mapNotNull null
            val lang = (s["lang"] ?: s["srclang"]) as? String ?: "es"
            SubtitleTrack((s["label"] as? String) ?: lang, lang, url)
        }
        val (synopsis, cast) = SynopsisText.split(dto.synopsis, dto.actors)
        return TitleDetail(
            id = dto.id.orEmpty(),
            kind = kind,
            name = dto.name?.takeIf { it.isNotBlank() } ?: dto.title.orEmpty(),
            year = year,
            synopsis = synopsis,
            cast = cast,
            genre = genre,
            classification = dto.classification.orEmpty(),
            poster = PlaybackUrls.absolute(base, dto.image),
            // Solo fondo horizontal: el póster estirado a 1920 px se veía pixelado.
            backdrop = PlaybackUrls.absolute(base, dto.backdropImage),
            videoUrl = if (kind == TitleKind.ANIME) null else dto.videoUrl,
            token = dto.token,
            episodes = intOf(dto.episodes).takeIf { it > 0 } ?: intOf(dto.totalEpisodes),
            comingSoon = dto.comingSoon == true,
            subtitles = subs,
        )
    }

    /** Progreso guardado (segundos) o null sin sesión / sin historial. */
    suspend fun history(movieId: String): Pair<Long, Long>? = runCatching {
        val text = function("history.getByUserAndMovie", """{"movieId":${quote(movieId)}}""")
        if (text.isBlank() || text == "null") return@runCatching null
        val dto = moshi.adapter(HistoryDto::class.java).fromJson(text) ?: return@runCatching null
        (dto.progress ?: 0.0).toLong() to (dto.duration ?: 0.0).toLong()
    }.getOrNull()

    suspend fun saveProgress(movieId: String, progressSec: Long, durationSec: Long) {
        runCatching {
            function(
                "history.upsert",
                """{"movieId":${quote(movieId)},"progress":$progressSec,"duration":$durationSec}""",
            )
        }
    }

    private suspend fun fetch(url: String, method: String): HttpReply = withContext(Dispatchers.IO) {
        try {
            val builder = Request.Builder().url(url)
            if (method == "HEAD") builder.head() else builder.get()
            streamHttp.newCall(builder.build()).execute().use { r ->
                HttpReply(r.code, if (method == "HEAD") null else r.body?.string())
            }
        } catch (_: IOException) {
            HttpReply(0)
        }
    }

    val resolver = PlaybackResolver(base, get = { fetch(it, "GET") }, head = { fetch(it, "HEAD") })

    override suspend fun resolve(detail: TitleDetail): Resolution = resolver.resolve(detail.videoUrl, detail.token)

    override suspend fun animeEpisode(animeId: String, episode: Int, exclude: List<String>): EpisodeStreamResponse? {
        val excluded = exclude.joinToString(",", "[", "]") { quote(it) }
        val text = function(
            "anime.getEpisodeStream",
            """{"animeId":${quote(animeId)},"episodeNumber":$episode,"excludeProviders":$excluded,"nativeOnly":true}""",
            slowHttp,
        )
        return moshi.adapter(EpisodeStreamResponse::class.java).fromJson(text)
    }
}
