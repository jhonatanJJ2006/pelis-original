package pro.verpelis.tv.ui.playback

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import coil.compose.AsyncImage
import coil.request.ImageRequest
import pro.verpelis.tv.data.TvImages
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.tv.data.tv.addFavorite
import pro.verpelis.tv.data.tv.animeSeasons
import pro.verpelis.tv.data.tv.isFavorite
import pro.verpelis.tv.data.tv.removeFavorite
import pro.verpelis.tv.data.tv.similar
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.PelisApiClient
import pro.verpelis.tv.data.playback.ApiCallException
import pro.verpelis.tv.data.playback.PlaybackErrors
import pro.verpelis.tv.data.playback.PlaybackRepository
import pro.verpelis.tv.data.playback.ResumePolicy
import pro.verpelis.tv.data.playback.TitleCache
import pro.verpelis.tv.data.playback.TitleDetail
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.ui.login.LocalMnFocusSound
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.components.TvLoadError

/**
 * Ficha Maison Noir de película / serie / anime (diseño Stitch
 * "PELIS - Detalle de Película (Android TV)"): fondo a sangre, insignias,
 * título serif, metadatos, sinopsis, Reproducir / Continuar y selector de episodios.
 */
@Composable
fun DetailScreen(
    kind: TitleKind,
    id: String,
    repository: PlaybackRepository,
    onPlay: (kind: TitleKind, id: String, episode: Int, startMs: Long) -> Unit,
    onNeedLogin: () -> Unit,
    onBack: () -> Unit,
    onOpenTitle: (TitleKind, String) -> Unit = { _, _ -> },
) {
    val uiSounds = LocalUiSounds.current
    val tvRepo = pro.verpelis.tv.data.tv.LocalTvRepository.current
    val scope = rememberCoroutineScope()
    var favorite by remember(id) { mutableStateOf<Boolean?>(null) }
    var similar by remember(id) { mutableStateOf<List<pro.verpelis.tv.data.api.CatalogItem>>(emptyList()) }
    var seasons by remember(id) { mutableStateOf<List<pro.verpelis.tv.data.tv.SeasonDto>>(emptyList()) }
    val session = LocalSessionStore.current
    var detail by remember(kind, id) { mutableStateOf(TitleCache.get(kind, id)) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var resumeMs by remember { mutableStateOf<Long?>(null) }
    var episode by remember { mutableIntStateOf(1) }
    var attempt by remember { mutableIntStateOf(0) }
    val playFocus = remember { FocusRequester() }
    val lifecycle = LocalLifecycleOwner.current

    LaunchedEffect(kind, id, attempt) {
        loadError = null
        try {
            val loaded = repository.title(kind, id)
            TitleCache.put(loaded)
            detail = loaded
        } catch (e: Exception) {
            if (detail == null) loadError = detailLoadError(e)
        }
    }
    // Al volver del reproductor se relee el historial (Continuar desde…).
    LaunchedEffect(detail?.id) {
        val d = detail ?: return@LaunchedEffect
        if (!d.savesProgress || !session.hasSession()) return@LaunchedEffect
        lifecycle.lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
            delay(700)
            resumeMs = repository.history(d.id)?.let { (p, dur) -> ResumePolicy.resumeFromMs(p, dur) }
        }
    }
    LaunchedEffect(detail != null) { if (detail != null) runCatching { playFocus.requestFocus() } }
    // Mi lista (solo películas y series: favorites usa Movie) y "Más como esto" (mismo género).
    LaunchedEffect(detail?.id) {
        val d = detail ?: return@LaunchedEffect
        if (d.kind != TitleKind.ANIME && session.hasSession()) {
            favorite = runCatching { tvRepo.isFavorite(d.id) }.getOrNull()
        }
        if (d.kind == TitleKind.ANIME) {
            seasons = runCatching { tvRepo.animeSeasons(d.id) }.getOrDefault(emptyList()).filter { it.isExtra != true }
        }
        similar = runCatching { tvRepo.similar(d.kind, d.genre, d.id).map { with(pro.verpelis.tv.data.tv.TvLibraryMappers) { it.item() } } }.getOrDefault(emptyList())
    }

    CompositionLocalProvider(LocalMnFocusSound provides { uiSounds.playFocus() }) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Mn.Bg)
                // Una sola pulsación de Atrás vuelve (Compose usaría la primera para soltar el foco).
                .onPreviewKeyEvent { ev ->
                    if (ev.nativeKeyEvent.keyCode != android.view.KeyEvent.KEYCODE_BACK) return@onPreviewKeyEvent false
                    if (ev.type == KeyEventType.KeyUp) onBack()
                    true
                },
        ) {
            val d = detail
            if (d == null) {
                if (loadError == null) {
                    Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                        NoirSpinner()
                        Spacer(Modifier.height(12.dp))
                        MnText("Cargando ficha…", color = Mn.Variant, size = 10.sp)
                    }
                } else {
                    TvLoadError(
                        onRetry = { attempt++ },
                        title = "No pudimos cargar esta ficha",
                        message = loadError ?: "Revisa la conexión a internet de tu TV e inténtalo de nuevo.",
                        retryFocus = playFocus,
                        extraActions = { NoirButton("Volver", { uiSounds.playClick(); onBack() }, icon = NoirIcon.ArrowLeft) },
                    )
                }
                return@Box
            }
            DetailContent(
                favorite = favorite,
                onToggleFavorite = {
                    uiSounds.playClick()
                    val now = favorite ?: return@DetailContent
                    favorite = !now
                    scope.launch {
                        runCatching { if (now) tvRepo.removeFavorite(d.id) else tvRepo.addFavorite(d.id) }
                            .onFailure { favorite = now; message = "No se pudo actualizar Mi lista. Inténtalo de nuevo." }
                    }
                },
                similar = similar,
                seasons = seasons,
                onOpenTitle = { k, i -> uiSounds.playClick(); onOpenTitle(k, i) },
                d = d,
                episode = episode,
                resumeMs = resumeMs,
                message = message,
                playFocus = playFocus,
                onSelectEpisode = { ep ->
                    uiSounds.playClick()
                    episode = ep
                    if (d.isEpisodeAvailable(ep)) {
                        message = null
                        onPlay(d.kind, d.id, ep, 0L)
                    } else {
                        message = "El episodio $ep aún no está disponible: Próximamente."
                    }
                },
                onPlay = { fromStart ->
                    uiSounds.playClick()
                    when {
                        !session.hasSession() -> onNeedLogin()
                        !d.isEpisodeAvailable(episode) -> message =
                            if (d.comingSoon) "Próximamente: este título todavía no tiene video."
                            else "El episodio $episode aún no está disponible: Próximamente."
                        else -> {
                            message = null
                            onPlay(d.kind, d.id, episode, if (fromStart) 0L else resumeMs ?: 0L)
                        }
                    }
                },
            )
        }
    }
}

@Composable
private fun DetailContent(
    favorite: Boolean?,
    onToggleFavorite: () -> Unit,
    similar: List<pro.verpelis.tv.data.api.CatalogItem>,
    seasons: List<pro.verpelis.tv.data.tv.SeasonDto>,
    onOpenTitle: (TitleKind, String) -> Unit,
    d: TitleDetail,
    episode: Int,
    resumeMs: Long?,
    message: String?,
    playFocus: FocusRequester,
    onSelectEpisode: (Int) -> Unit,
    onPlay: (fromStart: Boolean) -> Unit,
) {
    val context = LocalContext.current
    Box(Modifier.fillMaxSize()) {
        val lowRam = (context.applicationContext as? pro.verpelis.tv.PelisTvApp)?.lowRam == true
        val backdrop = remember(d.backdrop, lowRam) {
            val width = if (lowRam) TvImages.BACKDROP_WIDTH_LOW_RAM else TvImages.BACKDROP_WIDTH
            ImageRequest.Builder(context)
                .data(TvImages.sized(pro.verpelis.tv.BuildConfig.API_BASE_URL, d.backdrop, width))
                .size(width, width * 9 / 16)
                .build()
        }
        AsyncImage(
            model = backdrop,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(0f to Mn.Bg, 0.42f to Mn.Bg.copy(alpha = 0.88f), 1f to Mn.Bg.copy(alpha = 0.15f))))
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Mn.Bg.copy(alpha = 0.55f), 0.3f to Color.Transparent, 0.62f to Color.Transparent, 1f to Mn.Bg)))

        val listState = androidx.compose.foundation.lazy.rememberLazyListState()
        val scope = rememberCoroutineScope()
        androidx.compose.foundation.lazy.LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(bottom = 44.dp)) {
          item(key = "hero") {
          // Con el foco en los botones, la ficha se ve entera (sin desplazar la cabecera).
          Column(Modifier.onFocusChanged { if (it.hasFocus) scope.launch { delay(16); listState.scrollToItem(0) } }.fillParentMaxHeight(if (d.episodeCount > 0 || seasons.size > 1) 0.72f else 0.9f).padding(start = 48.dp, end = 40.dp, top = 22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                pro.verpelis.tv.ui.components.PelisLogo(13.sp, 2.sp)
                NoirDivider(Modifier.padding(horizontal = 6.dp))
                NoirBadge(when (d.kind) { TitleKind.MOVIE -> "Película"; TitleKind.SERIES -> "Serie"; TitleKind.ANIME -> "Anime" })
                Spacer(Modifier.width(6.dp))
                NoirBadge("HD · HLS")
                if (d.classification.isNotBlank()) { Spacer(Modifier.width(6.dp)); NoirBadge(d.classification) }
            }
            Spacer(Modifier.weight(1f))
            Column(Modifier.width(470.dp)) {
                MnText(d.name, color = Mn.Text, size = 30.sp, family = Mn.Serif, lines = 2)
                Spacer(Modifier.height(8.dp))
                val meta = listOfNotNull(
                    d.year.takeIf { it.isNotBlank() },
                    d.classification.takeIf { it.isNotBlank() },
                    d.genre.takeIf { it.isNotBlank() }?.replace(",", " •"),
                    if (d.episodeCount > 0) "${d.episodeCount} episodios" else null,
                )
                MnText(meta.joinToString("  ·  "), color = Mn.Variant, size = 8.5.sp, lines = 1)
                Spacer(Modifier.height(10.dp))
                MnText(d.synopsis.ifBlank { "Sin sinopsis disponible." }, color = Mn.Text.copy(alpha = 0.86f), size = 10.sp, lines = 4)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    val available = d.isEpisodeAvailable(episode)
                    val label = when {
                        d.comingSoon && d.kind != TitleKind.ANIME -> "Próximamente"
                        !available -> "Episodio $episode · Próximamente"
                        resumeMs != null -> "Continuar · ${ResumePolicy.formatClock(resumeMs)}"
                        d.kind == TitleKind.MOVIE -> "Reproducir"
                        else -> "Reproducir episodio $episode"
                    }
                    NoirButton(label, { onPlay(false) }, icon = NoirIcon.Play, primary = true, enabled = available, focusRequester = playFocus)
                    if (resumeMs != null && available) {
                        NoirButton("Desde el inicio", { onPlay(true) }, icon = NoirIcon.Restart)
                    }
                    if (favorite != null) {
                        NoirButton(if (favorite) "En Mi lista" else "Mi lista", onToggleFavorite, icon = if (favorite) NoirIcon.Check else null, selected = favorite)
                    }
                }
                if (message != null) {
                    Spacer(Modifier.height(10.dp))
                    MnText(message, color = Mn.Error, size = 9.sp)
                }
                if (d.cast.isNotBlank()) {
                    Spacer(Modifier.height(14.dp))
                    Row(verticalAlignment = Alignment.Top) {
                        MnText("REPARTO\nPRINCIPAL", color = Mn.Outline, size = 6.5.sp, weight = FontWeight.SemiBold, spacing = 1.2.sp)
                        Spacer(Modifier.width(14.dp))
                        MnText(d.cast, color = Mn.Variant, size = 8.5.sp, lines = 2)
                    }
                }
            }
          }
          }
            if (seasons.size > 1) item(key = "seasons") {
                Column(Modifier.padding(start = 48.dp, top = 10.dp)) {
                    MnText("TEMPORADAS", color = Mn.Gold, size = 8.sp, weight = FontWeight.SemiBold, spacing = 1.6.sp)
                    Spacer(Modifier.height(8.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(end = 40.dp, top = 2.dp, bottom = 2.dp)) {
                        items(seasons, key = { it.id }) { s ->
                            NoirButton(s.seasonLabel ?: s.title ?: "Temporada", { if (s.id != d.id) onOpenTitle(TitleKind.ANIME, s.id) }, selected = s.id == d.id)
                        }
                    }
                }
            }
            if (d.episodeCount > 0) item(key = "episodes") {
                Column(Modifier.padding(start = 48.dp, end = 40.dp, top = 14.dp)) { EpisodePicker(d, episode, onSelectEpisode) }
            }
            if (similar.isNotEmpty()) item(key = "similar") {
                Box(Modifier.padding(top = 16.dp)) {
                    pro.verpelis.tv.ui.components.CatalogRow(title = "Más como esto", items = similar, onOpen = { onOpenTitle(if (d.kind == TitleKind.ANIME) TitleKind.ANIME else if (it.mediaType == "series") TitleKind.SERIES else TitleKind.MOVIE, it.id) })
                }
            }
        }
        TvHintBar(listOf(TvHints.Select, TvHints.Move, TvHints.Back), Modifier.align(Alignment.BottomStart).background(Mn.Bg.copy(alpha = 0.94f)).padding(start = 48.dp, end = 40.dp, bottom = 14.dp, top = 10.dp))
    }
}

@Composable
private fun EpisodePicker(d: TitleDetail, selected: Int, onSelect: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        MnText(if (d.kind == TitleKind.ANIME) "Episodios" else "Temporada 1 · Episodios", color = Mn.Text, size = 12.sp, family = Mn.Serif)
        Spacer(Modifier.width(10.dp))
        NoirBadge(if (d.kind == TitleKind.SERIES) "Solo episodios en el servidor" else "${d.episodeCount} episodios", gold = true)
    }
    Spacer(Modifier.height(8.dp))
    val state = rememberLazyListState(initialFirstVisibleItemIndex = (selected - 1).coerceAtLeast(0))
    LazyRow(state = state, horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(vertical = 6.dp, horizontal = 2.dp)) {
        items((1..d.episodeCount).toList(), key = { it }) { ep ->
            EpisodeCard(ep, d.isEpisodeAvailable(ep), ep == selected) { onSelect(ep) }
        }
    }
}

@Composable
private fun EpisodeCard(ep: Int, available: Boolean, selected: Boolean, onClick: () -> Unit) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    Column(
        Modifier
            .width(104.dp)
            .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
            .noirFocus(focused, shape, 1.06f)
            .clip(shape)
            .background(if (selected) Mn.Gold.copy(alpha = 0.12f) else Mn.Low.copy(alpha = 0.9f))
            .border(if (focused) 2.dp else 1.dp, if (focused) Mn.Gold else if (selected) Mn.Gold.copy(alpha = 0.5f) else Mn.OutlineVar, shape)
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MnText("EP. %02d".format(ep), color = if (focused || selected) Mn.Gold else Mn.Text, size = 12.sp, family = Mn.Serif)
            Spacer(Modifier.weight(1f))
            if (available) NoirGlyph(NoirIcon.Play, color = if (focused) Mn.Gold else Mn.Outline, size = 8.dp)
        }
        Spacer(Modifier.height(4.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(Mn.OutlineVar))
        Spacer(Modifier.height(4.dp))
        MnText(if (available) "Disponible" else "Próximamente", color = if (available) Mn.Variant else Mn.Outline, size = 7.5.sp, spacing = 0.6.sp)
    }
}

private fun detailLoadError(e: Throwable): String = when {
    e is ApiCallException && e.status == 404 -> "No encontramos este título."
    e is ApiCallException && e.status in listOf(401, 403, 503) -> PlaybackErrors.fromStatus(e.status).message
    e is ApiCallException -> "No se pudo cargar la ficha (${e.status})."
    else -> PelisApiClient.friendlyNetworkError(e)
}
