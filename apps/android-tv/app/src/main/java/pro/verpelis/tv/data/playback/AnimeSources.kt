package pro.verpelis.tv.data.playback

/** Respuesta de anime.getEpisodeStream (kind = hls | embed | none). */
data class EpisodeStreamResponse(
    val kind: String? = null,
    val provider: String? = null,
    val sources: List<AnimeSourceDto>? = null,
    val subtitles: List<AnimeSubtitleDto>? = null,
    val url: String? = null,
    val error: String? = null,
)

data class AnimeSourceDto(
    val url: String? = null,
    val quality: String? = null,
    val isM3U8: Boolean? = null,
    val type: String? = null,
)

data class AnimeSubtitleDto(val url: String? = null, val lang: String? = null, val label: String? = null)

sealed interface AnimePick {
    /** Fuentes reproducibles en orden de preferencia (HLS primero, luego mp4). */
    data class Playable(val sources: List<PlayableSource>, val subtitles: List<SubtitleTrack>, val provider: String?) : AnimePick
    /** Solo hay un iframe (Mega, VidNest web…): ExoPlayer no lo puede abrir. */
    data class EmbedOnly(val provider: String?) : AnimePick
    data class Unavailable(val message: String) : AnimePick
}

object AnimeSources {
    /** Hosts que entregan una página/iframe, no un stream, aunque vengan como fuente. */
    private val IFRAME_HOSTS = listOf("mega.nz", "mega.co.nz", "drive.google.", "ok.ru/videoembed")

    private fun isIframe(url: String): Boolean {
        val lower = url.lowercase()
        if (lower.contains("/api/anime/stream")) return false
        return IFRAME_HOSTS.any { lower.contains(it) }
    }

    /** null si la fuente no se puede reproducir de forma nativa. */
    fun toPlayable(base: String, src: AnimeSourceDto): PlayableSource? {
        val url = PlaybackUrls.absolute(base, src.url) ?: return null
        if (isIframe(url)) return null
        val lower = url.substringBefore('?').lowercase()
        val hls = src.isM3U8 == true || src.type.equals("hls", true) || PlaybackUrls.looksHls(url)
        val mp4 = lower.endsWith(".mp4") || src.type.equals("mp4", true) ||
            url.lowercase().contains(".mp4")
        return when {
            hls -> PlayableSource(url, isHls = true)
            mp4 -> PlayableSource(url, isHls = false)
            else -> null
        }
    }

    fun pick(base: String, response: EpisodeStreamResponse?): AnimePick {
        if (response == null) return AnimePick.Unavailable("El servidor no devolvió fuentes para este episodio.")
        return when (response.kind) {
            "hls" -> {
                val playable = response.sources.orEmpty().mapNotNull { toPlayable(base, it) }
                    .distinctBy { it.url }
                    .sortedBy { if (it.isHls) 0 else 1 }
                if (playable.isEmpty()) AnimePick.EmbedOnly(response.provider)
                else AnimePick.Playable(
                    sources = playable,
                    subtitles = response.subtitles.orEmpty().mapNotNull { s ->
                        val u = PlaybackUrls.absolute(base, s.url) ?: return@mapNotNull null
                        val label = s.label ?: s.lang ?: "Subtítulos"
                        SubtitleTrack(label, s.lang ?: label, u)
                    },
                    provider = response.provider,
                )
            }
            "embed" -> AnimePick.EmbedOnly(response.provider)
            else -> AnimePick.Unavailable(
                response.error?.takeIf { it.isNotBlank() } ?: "Ningún servidor tiene este episodio ahora mismo.",
            )
        }
    }
}
