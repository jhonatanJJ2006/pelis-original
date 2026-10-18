package pro.verpelis.tv.data.playback

enum class PlaybackErrorKind { UNAUTHENTICATED, NO_PLAN, MISSING, DISK, NETWORK, EMBED_ONLY, UNSUPPORTED }

/** Por qué no se puede reproducir, en palabras que el usuario puede resolver. */
data class PlaybackError(val kind: PlaybackErrorKind, val message: String) {
    /** 401: el overlay ofrece "Iniciar sesión" además de reintentar. */
    val needsLogin: Boolean get() = kind == PlaybackErrorKind.UNAUTHENTICATED
}

object PlaybackErrors {
    val MESSAGES: Map<PlaybackErrorKind, String> = mapOf(
        PlaybackErrorKind.UNAUTHENTICATED to "Inicia sesión para ver este contenido.",
        PlaybackErrorKind.NO_PLAN to "Necesitas un plan activo para ver este contenido.",
        PlaybackErrorKind.MISSING to "Este video no está disponible en el servidor.",
        PlaybackErrorKind.DISK to "El servidor de videos no está disponible ahora. Intenta de nuevo en unos minutos.",
        PlaybackErrorKind.NETWORK to "Error de conexión al cargar el video. Revisa tu red y reintenta.",
        PlaybackErrorKind.EMBED_ONLY to "Este episodio solo está disponible en un reproductor web (Mega u otros) que no funciona en la TV.",
        PlaybackErrorKind.UNSUPPORTED to "Esta TV no pudo reproducir el video.",
    )

    fun of(kind: PlaybackErrorKind, message: String? = null): PlaybackError =
        PlaybackError(kind, message?.takeIf { it.isNotBlank() } ?: MESSAGES.getValue(kind))

    /**
     * Estado HTTP (+ `code` del servidor) de /api/stream/resolve, /api/stream/... o del API.
     * Mismo criterio que apps/web/src/lib/playback-errors.ts.
     */
    fun fromStatus(status: Int, code: String? = null): PlaybackError = when {
        code == "disk_unavailable" -> of(PlaybackErrorKind.DISK)
        code == "video_missing" -> of(PlaybackErrorKind.MISSING)
        code == "no_plan" || status == 403 -> of(PlaybackErrorKind.NO_PLAN)
        code == "unauthenticated" || status == 401 -> of(PlaybackErrorKind.UNAUTHENTICATED)
        status == 503 -> of(PlaybackErrorKind.DISK)
        status == 404 || status == 410 -> of(PlaybackErrorKind.MISSING)
        else -> of(PlaybackErrorKind.NETWORK)
    }

    /**
     * Falla de ExoPlayer: [httpStatus] viene de InvalidResponseCodeException; si no hay
     * estado HTTP y fue de E/S es la red; si no, el decodificador/formato.
     */
    fun fromPlayerFailure(httpStatus: Int?, ioFailure: Boolean): PlaybackError = when {
        httpStatus != null && httpStatus > 0 -> fromStatus(httpStatus)
        ioFailure -> of(PlaybackErrorKind.NETWORK)
        else -> of(PlaybackErrorKind.UNSUPPORTED)
    }

    /** Sesión/plan explican cualquier 404 posterior: ganan. */
    fun worst(a: PlaybackError?, b: PlaybackError?): PlaybackError {
        val rank = mapOf(
            PlaybackErrorKind.UNAUTHENTICATED to 5,
            PlaybackErrorKind.NO_PLAN to 4,
            PlaybackErrorKind.DISK to 3,
            PlaybackErrorKind.NETWORK to 2,
            PlaybackErrorKind.MISSING to 1,
        )
        if (a == null) return b ?: of(PlaybackErrorKind.MISSING)
        if (b == null) return a
        return if ((rank[a.kind] ?: 0) >= (rank[b.kind] ?: 0)) a else b
    }
}
