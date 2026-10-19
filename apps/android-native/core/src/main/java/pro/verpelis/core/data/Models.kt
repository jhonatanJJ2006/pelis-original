package pro.verpelis.core.data

import org.json.JSONArray
import org.json.JSONObject

enum class Kind { MOVIE, SERIES, ANIME }

data class Title(
    val id: String,
    val name: String,
    val poster: String?,
    val backdrop: String?,
    val synopsis: String,
    val genre: String,
    val year: String,
    val classification: String,
    val videoUrl: String?,
    val kind: Kind,
    val subtitles: List<Subtitle> = emptyList(),
    val token: String? = null,
    val episodes: Int = 0,
    val actors: String = "",
    val progress: Float = 0f,
    /** Serie sin video todavía: se muestra como Próximamente y nunca va al hero. */
    val comingSoon: Boolean = false,
)

data class Subtitle(val label: String, val lang: String, val url: String)

data class Channel(val id: String, val name: String, val logo: String?, val category: String, val online: Boolean)

data class Plan(val id: String, val name: String, val price: Double, val months: Int, val description: String, val features: List<String>, val recommended: Boolean)

data class Me(val id: String, val email: String, val name: String, val role: String, val planName: String?)

data class Pairing(val code: String, val displayCode: String, val deviceId: String, val verifyUrl: String, val expiresAt: String)

internal fun JSONObject.str(key: String): String? =
    if (has(key) && !isNull(key)) optString(key).takeIf { it.isNotBlank() } else null

internal fun JSONArray.objects(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }

/** Página del servidor: { items, total, offset, limit, hasMore }. */
data class Page<T>(val items: List<T>, val total: Int, val offset: Int, val limit: Int, val hasMore: Boolean) {
    val pageCount: Int get() = if (limit <= 0) 1 else maxOf(1, (total + limit - 1) / limit)
    val pageNumber: Int get() = if (limit <= 0) 1 else offset / limit + 1
}

object Parse {
    /** Ancho del fondo: 1080 en el celular, 1920 en la TV (lo fija cada app al arrancar). */
    @Volatile var backdropWidth: Int = 1080
    private val NEXT_WIDTHS = intArrayOf(64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920)

    /**
     * Imágenes propias (/uploads, /peliculas) por el optimizador de Next al ancho pedido:
     * nada de originales de 2 MB en el celular ni pósters estirados en el hero.
     */
    fun sized(base: String, url: String?, width: Int): String? {
        val u = url?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val path = when {
            u.startsWith(base) -> u.removePrefix(base)
            u.startsWith("http") -> return u
            u.startsWith("/") -> u
            else -> "/$u"
        }
        if (!path.startsWith("/uploads/") && !path.startsWith("/peliculas/")) return base + path
        val w = NEXT_WIDTHS.firstOrNull { it >= width } ?: NEXT_WIDTHS.last()
        return "$base/_next/image?url=" + java.net.URLEncoder.encode(path, "UTF-8") + "&w=$w&q=75"
    }

    fun absolute(base: String, url: String?): String? = when {
        url.isNullOrBlank() -> null
        url.startsWith("http") -> url
        url.startsWith("/") -> base + url
        else -> "$base/$url"
    }

    fun movie(base: String, o: JSONObject): Title {
        val type = o.str("mediaType")
        val subs = o.optJSONArray("subtitleTracks")?.objects()?.mapNotNull { s ->
            val u = absolute(base, s.str("url") ?: s.str("src")) ?: return@mapNotNull null
            Subtitle(s.str("label") ?: s.str("lang") ?: "Subtítulos", s.str("lang") ?: s.str("srclang") ?: "es", u)
        } ?: emptyList()
        return Title(
            id = o.str("_id") ?: o.str("id") ?: "",
            name = o.str("name") ?: o.str("title") ?: "",
            poster = sized(base, o.str("image"), 384),
            // Fondo horizontal a ancho de pantalla; sin fondo, el póster grande (nunca la miniatura).
            backdrop = o.str("backdropImage")?.let { sized(base, it, backdropWidth) } ?: sized(base, o.str("image"), 780),
            synopsis = o.str("synopsis") ?: "",
            genre = o.optJSONArray("genre")?.let { a -> (0 until a.length()).joinToString(", ") { a.optString(it) } } ?: o.str("genre") ?: "",
            year = o.str("releaseYear") ?: o.opt("year")?.toString() ?: "",
            classification = o.str("classification") ?: "",
            videoUrl = absolute(base, o.str("videoUrl")),
            kind = if (type == "series" || type == "tv") Kind.SERIES else Kind.MOVIE,
            subtitles = subs,
            token = o.str("token"),
            episodes = o.optInt("episodes", o.optInt("totalEpisodes", 0)),
            actors = o.str("actors") ?: "",
            comingSoon = o.optBoolean("comingSoon", false),
        )
    }

    fun anime(base: String, o: JSONObject): Title = movie(base, o).copy(kind = Kind.ANIME, videoUrl = null)

    fun channel(base: String, o: JSONObject) = Channel(
        id = o.str("_id") ?: o.str("id") ?: "",
        name = o.str("name") ?: "",
        logo = absolute(base, o.str("logo")),
        category = o.str("category") ?: "General",
        online = o.str("streamStatus") != "offline",
    )

    fun plan(o: JSONObject) = Plan(
        id = o.str("_id") ?: o.str("id") ?: "",
        name = o.str("name") ?: "",
        price = o.optDouble("price", 0.0),
        months = o.optInt("months", 1),
        description = o.str("description") ?: "",
        features = o.optJSONArray("features")?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: emptyList(),
        recommended = o.optBoolean("recommended"),
    )
}
