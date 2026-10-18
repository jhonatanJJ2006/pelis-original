package pro.verpelis.tv.data.playback

import java.io.IOException

/** Lo que el cargador necesita del API (el repositorio real o un doble en tests). */
interface PlaybackBackend {
    val base: String
    suspend fun title(kind: TitleKind, id: String): TitleDetail
    suspend fun resolve(detail: TitleDetail): Resolution
    suspend fun animeEpisode(animeId: String, episode: Int, exclude: List<String>): EpisodeStreamResponse?
}

sealed interface LoadResult {
    data class Ready(
        val detail: TitleDetail,
        val sources: List<PlayableSource>,
        val subtitles: List<SubtitleTrack>,
        /** Aviso no bloqueante (p. ej. se saltó un servidor que solo era iframe). */
        val notice: String? = null,
    ) : LoadResult

    data class Failed(val error: PlaybackError, val detail: TitleDetail? = null) : LoadResult
}

/**
 * Convierte (tipo, id, episodio) en fuentes que ExoPlayer puede abrir, o en la
 * causa real del fallo. Para anime, si el servidor solo ofrece un iframe (Mega,
 * VidNest web…) se avisa y se vuelve a pedir excluyendo ese servidor.
 */
class PlaybackLoader(private val backend: PlaybackBackend, private val maxAnimeAttempts: Int = 2) {

    private fun apiError(e: Throwable): PlaybackError = when (e) {
        is ApiCallException -> PlaybackErrors.fromStatus(e.status)
        is IOException -> PlaybackErrors.of(PlaybackErrorKind.NETWORK)
        else -> PlaybackErrors.of(PlaybackErrorKind.NETWORK, e.message)
    }

    suspend fun load(
        kind: TitleKind,
        id: String,
        episode: Int,
        cached: TitleDetail? = null,
        onStatus: (String) -> Unit = {},
    ): LoadResult {
        val detail = cached ?: try {
            backend.title(kind, id)
        } catch (e: Exception) {
            return LoadResult.Failed(apiError(e))
        }
        return when (detail.kind) {
            TitleKind.ANIME -> loadAnime(detail, episode, onStatus)
            else -> loadMovie(detail, episode)
        }
    }

    private suspend fun loadMovie(detail: TitleDetail, episode: Int): LoadResult {
        if (detail.comingSoon) {
            return LoadResult.Failed(PlaybackErrors.of(PlaybackErrorKind.MISSING, "Próximamente: este título todavía no tiene video."), detail)
        }
        if (!detail.isEpisodeAvailable(episode)) {
            return LoadResult.Failed(PlaybackErrors.of(PlaybackErrorKind.MISSING, "El episodio $episode aún no está disponible (Próximamente)."), detail)
        }
        return when (val r = try { backend.resolve(detail) } catch (e: Exception) { Resolution.Failed(apiError(e)) }) {
            is Resolution.Ok -> LoadResult.Ready(detail, listOf(r.source), detail.subtitles)
            is Resolution.Failed -> LoadResult.Failed(r.error, detail)
        }
    }

    private suspend fun loadAnime(detail: TitleDetail, episode: Int, onStatus: (String) -> Unit): LoadResult {
        val exclude = mutableListOf<String>()
        val skipped = mutableListOf<String>()
        repeat(maxAnimeAttempts) { attempt ->
            onStatus(
                if (attempt == 0) "Buscando fuentes del episodio $episode…"
                else "${skipped.last()} solo ofrece reproductor web; buscando otra fuente…",
            )
            val response = try {
                backend.animeEpisode(detail.id, episode, exclude.toList())
            } catch (e: Exception) {
                return LoadResult.Failed(apiError(e), detail)
            }
            // nativeOnly: el servidor ya buscó todas las fuentes nativas en UNA llamada;
            // repetirla excluyendo iframes sería la "doble búsqueda".
            if (response?.kind == "none" && response.embedAvailable == true) {
                return embedOnly(detail, skipped.ifEmpty { listOf("VidNest/Mega") })
            }
            when (val pick = AnimeSources.pick(backend.base, response)) {
                is AnimePick.Playable -> {
                    val notice = if (skipped.isEmpty()) null
                    else "Se omitió ${skipped.joinToString()} (solo reproductor web)."
                    return LoadResult.Ready(detail, pick.sources, pick.subtitles, notice)
                }
                is AnimePick.EmbedOnly -> {
                    val provider = pick.provider ?: "El servidor"
                    skipped += provider
                    pick.provider?.let { exclude += it }
                    // "vidnest" es el servidor pedido por defecto (iframe): sin excluirlo el
                    // servidor vuelve a ofrecer el mismo reproductor web.
                    if ("vidnest" !in exclude) exclude += "vidnest"
                }
                is AnimePick.Unavailable ->
                    // Si ya descartamos reproductores web, la causa real es "solo iframe".
                    return if (skipped.isEmpty()) {
                        LoadResult.Failed(PlaybackErrors.of(PlaybackErrorKind.MISSING, pick.message), detail)
                    } else {
                        embedOnly(detail, skipped)
                    }
            }
        }
        return embedOnly(detail, skipped)
    }

    private fun embedOnly(detail: TitleDetail, skipped: List<String>): LoadResult {
        val names = skipped.distinct().joinToString()
        return LoadResult.Failed(
            PlaybackErrors.of(
                PlaybackErrorKind.EMBED_ONLY,
                "Este episodio solo está disponible en un reproductor web ($names) que no funciona en la TV. " +
                    "Prueba otro episodio o míralo en verpelis.pro.",
            ),
            detail,
        )
    }
}

/** Ficha ya cargada por la pantalla de detalle, para que el reproductor no la pida otra vez. */
object TitleCache {
    private val map = object : LinkedHashMap<String, TitleDetail>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, TitleDetail>?) = size > 24
    }

    private fun key(kind: TitleKind, id: String) = "${kind.routeKey}:$id"

    @Synchronized fun put(detail: TitleDetail) {
        map[key(detail.kind, detail.id)] = detail
        // Un título pedido como "movie" puede resultar serie: que ambas claves lo encuentren.
        if (detail.kind == TitleKind.SERIES) map[key(TitleKind.MOVIE, detail.id)] = detail
    }

    @Synchronized fun get(kind: TitleKind, id: String): TitleDetail? = map[key(kind, id)]
}
