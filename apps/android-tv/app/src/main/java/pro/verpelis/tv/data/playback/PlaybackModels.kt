package pro.verpelis.tv.data.playback

/** Qué tipo de título abre la ficha: decide el endpoint de detalle y cómo se reproduce. */
enum class TitleKind(val routeKey: String) {
    MOVIE("movie"),
    SERIES("series"),
    ANIME("anime");

    companion object {
        fun fromRoute(value: String?): TitleKind =
            entries.firstOrNull { it.routeKey == value } ?: MOVIE
    }
}

data class SubtitleTrack(val label: String, val lang: String, val url: String)

/** Ficha normalizada de una película, serie o anime (URLs ya absolutas). */
data class TitleDetail(
    val id: String,
    val kind: TitleKind,
    val name: String,
    val year: String = "",
    val synopsis: String = "",
    val genre: String = "",
    val classification: String = "",
    val poster: String? = null,
    val backdrop: String? = null,
    val videoUrl: String? = null,
    val token: String? = null,
    val episodes: Int = 0,
    val comingSoon: Boolean = false,
    val subtitles: List<SubtitleTrack> = emptyList(),
    val cast: String = "",
) {
    /** Las series del servidor guardan un solo video: el episodio 1. */
    fun isEpisodeAvailable(episode: Int): Boolean = when (kind) {
        TitleKind.ANIME -> episode >= 1
        TitleKind.SERIES -> episode == 1 && !comingSoon
        TitleKind.MOVIE -> !comingSoon
    }

    /** Número de episodios a mostrar en el selector (0 = sin selector). */
    val episodeCount: Int
        get() = when (kind) {
            TitleKind.MOVIE -> 0
            TitleKind.SERIES -> episodes.coerceAtLeast(1)
            TitleKind.ANIME -> episodes.takeIf { it > 0 } ?: 12
        }

    /** El progreso se guarda en history (FK a movie): solo películas y series. */
    val savesProgress: Boolean get() = kind != TitleKind.ANIME
}

/** Fuente reproducible por ExoPlayer (HLS o archivo progresivo). */
data class PlayableSource(
    val url: String,
    val isHls: Boolean,
    /** Cabeceras que exige el CDN (p. ej. Referer de Consumet); vacío para nuestro dominio. */
    val headers: Map<String, String> = emptyMap(),
)

object ResumePolicy {
    private const val MIN_PROGRESS_SEC = 15L
    private const val END_MARGIN_SEC = 60L

    /**
     * Posición desde la que ofrecer "Continuar", o null si conviene empezar de cero
     * (casi sin ver o ya en los créditos).
     */
    fun resumeFromMs(progressSec: Long, durationSec: Long): Long? {
        if (progressSec < MIN_PROGRESS_SEC) return null
        if (durationSec > 0 && progressSec >= durationSec - END_MARGIN_SEC) return null
        return progressSec * 1000
    }

    /** Debe guardarse el progreso al salir: más de 5 s vistos y duración conocida. */
    fun shouldSave(positionMs: Long, durationMs: Long): Boolean = positionMs > 5_000 && durationMs > 0

    fun formatClock(ms: Long): String {
        val total = (ms.coerceAtLeast(0) / 1000)
        val h = total / 3600
        val m = (total % 3600) / 60
        val s = total % 60
        return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
    }

    /** Salto con el control remoto, acotado a [0, duración]. */
    fun seekTarget(positionMs: Long, durationMs: Long, forward: Boolean, stepMs: Long = 10_000): Long {
        val next = if (forward) positionMs + stepMs else positionMs - stepMs
        val max = if (durationMs > 0) durationMs else Long.MAX_VALUE
        return next.coerceIn(0, max)
    }
}

object PlaybackUrls {
    /** Une la base ("https://verpelis.pro/") con rutas relativas del API. */
    fun absolute(base: String, url: String?): String? {
        val value = url?.trim().orEmpty()
        if (value.isEmpty()) return null
        if (value.startsWith("http://") || value.startsWith("https://")) return value
        if (value.startsWith("//")) return "https:$value"
        val root = base.trimEnd('/')
        return if (value.startsWith("/")) root + value else "$root/$value"
    }

    fun resolveEndpoint(base: String, token: String): String =
        base.trimEnd('/') + "/api/stream/resolve?token=" + java.net.URLEncoder.encode(token, "UTF-8")

    /** Manifiesto HLS servido por nuestros discos (/api/stream/<token>/playlist.m3u8). */
    fun isLocalStream(url: String?): Boolean =
        url != null && url.contains("/api/stream/") && url.contains(".m3u8")

    fun looksHls(url: String): Boolean {
        val path = url.substringBefore('#').lowercase()
        return path.contains(".m3u8") || path.contains("/api/stream/") || path.contains("/api/anime/stream")
    }
}

object SynopsisText {
    private val CAST_MARKER = Regex("""\*\*\s*REPARTO\s*\*\*\s*:?|\bREPARTO\s*:""")

    /** Separa "sinopsis **REPARTO**: nombres" (formato del catálogo) y quita el markdown. */
    fun split(raw: String?, actors: String?): Pair<String, String> {
        val text = raw.orEmpty()
        val m = CAST_MARKER.find(text)
        val synopsis = (if (m != null) text.substring(0, m.range.first) else text).replace("**", "").trim()
        val castFromText = m?.let { text.substring(it.range.last + 1).replace("**", "").trim() }.orEmpty()
        val cast = actors?.trim()?.takeIf { it.isNotEmpty() } ?: castFromText
        return synopsis to cast.replace(Regex("\\s+"), " ")
    }
}
