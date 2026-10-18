package pro.verpelis.core.data

/** Respuesta de GET /api/stream/resolve; status <= 0 = sin respuesta (red). */
data class ResolveReply(val status: Int, val url: String? = null)

/**
 * Elige la URL que carga el reproductor. Port de resolveVideoPlayback
 * (apps/web/src/hooks/use-resolved-video-url.ts) y de PlaybackResolver (apps/android-tv):
 * con token, el resolver del servidor va primero porque prefiere master.m3u8 (HLS adaptativo
 * con varias calidades) sobre la playlist de una sola calidad guardada en videoUrl.
 * videoUrl queda como respaldo si el resolver falla o no está disponible.
 */
object StreamResolution {
    /** Manifiesto HLS servido por nuestros discos (/api/stream/<token>/playlist.m3u8). */
    fun isLocalStream(url: String?): Boolean =
        url != null && url.contains("/api/stream/") && url.contains(".m3u8")

    suspend fun pick(base: String, videoUrl: String?, token: String?, resolve: suspend (String) -> ResolveReply): String? {
        val direct = Parse.absolute(base, videoUrl?.trim())
        // URL externa (no es un stream de nuestros discos): el resolver no aplica, igual que la web.
        if (direct != null && !isLocalStream(direct)) return direct
        if (!token.isNullOrBlank()) {
            val reply = runCatching { resolve(token) }.getOrDefault(ResolveReply(0))
            if (reply.status in 200..299) Parse.absolute(base, reply.url?.trim())?.let { return it }
            // Sin sesión o sin plan también aplica a videoUrl: no tiene sentido el respaldo.
            if (reply.status == 401 || reply.status == 403) return null
        }
        return direct
    }
}
