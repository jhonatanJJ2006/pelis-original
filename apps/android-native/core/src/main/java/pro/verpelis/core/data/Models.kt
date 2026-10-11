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
)

data class Subtitle(val label: String, val lang: String, val url: String)

data class Channel(val id: String, val name: String, val logo: String?, val category: String, val online: Boolean)

data class Plan(val id: String, val name: String, val price: Double, val months: Int, val description: String, val features: List<String>, val recommended: Boolean)

data class Me(val id: String, val email: String, val name: String, val role: String, val planName: String?)

data class Pairing(val code: String, val displayCode: String, val deviceId: String, val verifyUrl: String, val expiresAt: String)

internal fun JSONObject.str(key: String): String? =
    if (has(key) && !isNull(key)) optString(key).takeIf { it.isNotBlank() } else null

internal fun JSONArray.objects(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }

object Parse {
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
            poster = absolute(base, o.str("image")),
            backdrop = absolute(base, o.str("backdropImage") ?: o.str("image")),
            synopsis = o.str("synopsis") ?: "",
            genre = o.str("genre") ?: o.optJSONArray("genre")?.let { a -> (0 until a.length()).joinToString(", ") { a.optString(it) } } ?: "",
            year = o.str("releaseYear") ?: o.opt("year")?.toString() ?: "",
            classification = o.str("classification") ?: "",
            videoUrl = absolute(base, o.str("videoUrl")),
            kind = if (type == "series" || type == "tv") Kind.SERIES else Kind.MOVIE,
            subtitles = subs,
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
