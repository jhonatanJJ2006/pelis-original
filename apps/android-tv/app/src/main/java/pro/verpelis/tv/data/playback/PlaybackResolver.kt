package pro.verpelis.tv.data.playback

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

/** Respuesta HTTP mínima; status <= 0 significa que no hubo respuesta (red). */
data class HttpReply(val status: Int, val body: String? = null) {
    val ok: Boolean get() = status in 200..299
}

sealed interface Resolution {
    data class Ok(val source: PlayableSource) : Resolution
    data class Failed(val error: PlaybackError) : Resolution
}

internal data class ResolveBody(val url: String? = null, val code: String? = null, val error: String? = null)

/**
 * Elige la URL que carga el reproductor o la causa real de que no pueda.
 * Port de resolveVideoPlayback (apps/web/src/hooks/use-resolved-video-url.ts):
 * con token, el resolver del servidor va primero porque prefiere master.m3u8
 * (varias calidades) sobre la playlist de una sola calidad guardada en videoUrl.
 */
class PlaybackResolver(
    private val base: String,
    private val get: suspend (String) -> HttpReply,
    private val head: suspend (String) -> HttpReply,
) {
    private val adapter = Moshi.Builder().add(KotlinJsonAdapterFactory()).build().adapter(ResolveBody::class.java)

    private fun parse(body: String?): ResolveBody? =
        body?.takeIf { it.isNotBlank() }?.let { runCatching { adapter.fromJson(it) }.getOrNull() }

    private suspend fun byToken(token: String): Pair<String?, PlaybackError?> {
        val reply = get(PlaybackUrls.resolveEndpoint(base, token))
        if (reply.status <= 0) return null to PlaybackErrors.of(PlaybackErrorKind.NETWORK)
        val body = parse(reply.body)
        if (!reply.ok) return null to PlaybackErrors.fromStatus(reply.status, body?.code)
        if (body == null) return null to PlaybackErrors.of(PlaybackErrorKind.NETWORK)
        val url = PlaybackUrls.absolute(base, body.url)
        return if (url != null) url to null else null to PlaybackErrors.of(PlaybackErrorKind.MISSING)
    }

    private suspend fun headCheck(url: String): PlaybackError? {
        val reply = head(url)
        if (reply.status <= 0) return PlaybackErrors.of(PlaybackErrorKind.NETWORK)
        return if (reply.ok) null else PlaybackErrors.fromStatus(reply.status)
    }

    suspend fun resolve(videoUrl: String?, token: String?): Resolution {
        val absolute = PlaybackUrls.absolute(base, videoUrl)
        if (absolute != null && !PlaybackUrls.isLocalStream(absolute)) {
            return Resolution.Ok(PlayableSource(absolute, PlaybackUrls.looksHls(absolute)))
        }
        var tokenError: PlaybackError? = null
        if (!token.isNullOrBlank()) {
            val (url, error) = byToken(token)
            if (url != null) return Resolution.Ok(PlayableSource(url, PlaybackUrls.looksHls(url)))
            tokenError = error
            if (error != null && (error.kind == PlaybackErrorKind.UNAUTHENTICATED || error.kind == PlaybackErrorKind.NO_PLAN)) {
                return Resolution.Failed(error)
            }
        }
        if (absolute != null) {
            val headError = headCheck(absolute) ?: return Resolution.Ok(PlayableSource(absolute, true))
            return Resolution.Failed(PlaybackErrors.worst(headError, tokenError))
        }
        return Resolution.Failed(tokenError ?: PlaybackErrors.of(PlaybackErrorKind.MISSING))
    }
}
