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

    suspend fun pick(base: String, videoUrl: String?, token: String?, resolve: suspend (String) -> ResolveReply): String? =
        decide(base, videoUrl, token, resolve).url

    /** Igual que [pick], pero distingue "sin sesión" (401) y "sin plan" (403) para mostrar el muro. */
    suspend fun decide(base: String, videoUrl: String?, token: String?, resolve: suspend (String) -> ResolveReply): Decision {
        val direct = Parse.absolute(base, videoUrl?.trim())
        // URL externa (no es un stream de nuestros discos): el resolver no aplica, igual que la web.
        if (direct != null && !isLocalStream(direct)) return Decision(direct)
        if (!token.isNullOrBlank()) {
            val reply = runCatching { resolve(token) }.getOrDefault(ResolveReply(0))
            if (reply.status in 200..299) Parse.absolute(base, reply.url?.trim())?.let { return Decision(it) }
            // Sin sesión o sin plan también aplica a videoUrl: no tiene sentido el respaldo.
            if (reply.status == 401) return Decision(null, Block.LOGIN)
            if (reply.status == 403) return Decision(null, Block.PLAN)
        }
        return Decision(direct)
    }

    enum class Block { LOGIN, PLAN }
    data class Decision(val url: String?, val block: Block? = null)
}
