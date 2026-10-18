package pro.verpelis.tv.ui.playback

import android.net.Uri
import android.view.KeyEvent as AndroidKeyEvent
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.util.Util
import androidx.media3.datasource.HttpDataSource
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.playback.LoadResult
import pro.verpelis.tv.data.playback.PlayableSource
import pro.verpelis.tv.data.playback.PlaybackError
import pro.verpelis.tv.data.playback.PlaybackErrors
import pro.verpelis.tv.data.playback.PlaybackLoader
import pro.verpelis.tv.data.playback.PlaybackRepository
import pro.verpelis.tv.data.playback.QualityLevel
import pro.verpelis.tv.data.playback.QualityLevels
import pro.verpelis.tv.data.playback.ResumePolicy
import pro.verpelis.tv.data.playback.SubtitleTrack
import pro.verpelis.tv.data.playback.TitleCache
import pro.verpelis.tv.data.playback.TitleDetail
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.ui.login.LocalMnFocusSound
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText

/** Guarda el progreso aunque la pantalla ya se haya destruido. */
private val progressScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

private sealed interface Phase {
    data class Loading(val message: String) : Phase
    data object Playing : Phase
    data class Failed(val error: PlaybackError) : Phase
}

private const val CONTROLS_TIMEOUT_MS = 5_000L
private const val SAVE_EVERY_MS = 30_000L

/** Factoría compartida para poder fijar las cabeceras de cada fuente (Referer de Consumet). */
@OptIn(UnstableApi::class)
private class VodPlayerParts(val player: ExoPlayer, val displayHeight: Int, val http: OkHttpDataSource.Factory)

@OptIn(UnstableApi::class)
private fun buildVodPlayer(context: android.content.Context, repository: PlaybackRepository): VodPlayerParts {
    val display = Util.getCurrentDisplayModeSize(context)
    val selector = DefaultTrackSelector(context).apply {
        setParameters(
            buildUponParameters()
                // Adaptativo, sin pedir variantes más grandes que la pantalla.
                .setMaxVideoSize(display.x.coerceAtLeast(1), display.y.coerceAtLeast(1))
                .setViewportSizeToPhysicalDisplaySize(context, true)
                .setPreferredAudioLanguage("es")
                .setPreferredTextLanguage("es"),
        )
    }
    // Mismo tope que hls.js en la web (60 MB): los TV box tienen poca memoria.
    val loadControl = DefaultLoadControl.Builder()
        .setBufferDurationsMs(20_000, 60_000, 2_500, 5_000)
        .setTargetBufferBytes(60 * 1024 * 1024)
        .setPrioritizeTimeOverSizeThresholds(false)
        .build()
    val http = OkHttpDataSource.Factory(repository.streamHttp)
    val player = ExoPlayer.Builder(context)
        .setTrackSelector(selector)
        .setLoadControl(loadControl)
        .setMediaSourceFactory(DefaultMediaSourceFactory(http))
        .setSeekBackIncrementMs(10_000)
        .setSeekForwardIncrementMs(10_000)
        .build()
    return VodPlayerParts(player, display.y, http)
}

@OptIn(UnstableApi::class)
private fun mediaItemFor(source: PlayableSource, title: String, subtitles: List<SubtitleTrack>): MediaItem =
    MediaItem.Builder()
        .setUri(source.url)
        .apply { if (source.isHls) setMimeType(MimeTypes.APPLICATION_M3U8) }
        .setMediaMetadata(MediaMetadata.Builder().setTitle(title).build())
        .setSubtitleConfigurations(
            subtitles.map {
                MediaItem.SubtitleConfiguration.Builder(Uri.parse(it.url))
                    .setMimeType(if (it.url.substringBefore('?').endsWith(".srt")) MimeTypes.APPLICATION_SUBRIP else MimeTypes.TEXT_VTT)
                    .setLanguage(it.lang)
                    .setLabel(it.label)
                    .build()
            },
        )
        .build()

/** Causa real de una falla de ExoPlayer (estado HTTP del segmento/manifiesto o red). */
@OptIn(UnstableApi::class)
private fun errorFor(e: PlaybackException): PlaybackError {
    val http = generateSequence<Throwable>(e) { it.cause }
        .filterIsInstance<HttpDataSource.InvalidResponseCodeException>()
        .firstOrNull()?.responseCode
    val io = e.errorCode in 2000..2999
    return PlaybackErrors.fromPlayerFailure(http, io)
}

@OptIn(UnstableApi::class)
private fun qualityCandidates(tracks: Tracks): List<QualityLevel> {
    val out = mutableListOf<QualityLevel>()
    tracks.groups.forEachIndexed { gi, g ->
        if (g.type != C.TRACK_TYPE_VIDEO) return@forEachIndexed
        for (i in 0 until g.length) {
            if (!g.isTrackSupported(i)) continue
            val f = g.getTrackFormat(i)
            out += QualityLevel(f.height, f.bitrate.coerceAtLeast(f.peakBitrate), gi, i)
        }
    }
    return out
}

private data class TextOption(val label: String, val group: Int, val track: Int)

@OptIn(UnstableApi::class)
private fun textOptions(tracks: Tracks): List<TextOption> {
    val out = mutableListOf<TextOption>()
    tracks.groups.forEachIndexed { gi, g ->
        if (g.type != C.TRACK_TYPE_TEXT) return@forEachIndexed
        for (i in 0 until g.length) {
            val f = g.getTrackFormat(i)
            out += TextOption(f.label ?: f.language?.let { java.util.Locale(it).displayLanguage.replaceFirstChar(Char::uppercase) } ?: "Pista ${out.size + 1}", gi, i)
        }
    }
    return out
}

/**
 * Reproductor nativo de películas, series y anime (Media3 ExoPlayer + HLS) con el
 * diseño Stitch "Reproductor Android TV": controles Maison Noir, calidad, subtítulos,
 * errores con su causa real y guardado de progreso (history.upsert).
 */
@OptIn(UnstableApi::class)
@Composable
fun VodPlayerScreen(
    kind: TitleKind,
    id: String,
    episode: Int,
    startMs: Long,
    repository: PlaybackRepository,
    onBack: () -> Unit,
    onNeedLogin: () -> Unit,
) {
    val context = LocalContext.current
    val uiSounds = LocalUiSounds.current
    val loader = remember { PlaybackLoader(repository) }
    val parts = remember { buildVodPlayer(context, repository) }
    val player = parts.player
    val displayHeight = parts.displayHeight
    val httpFactory = parts.http

    var phase by remember { mutableStateOf<Phase>(Phase.Loading("Preparando…")) }
    var detail by remember { mutableStateOf<TitleDetail?>(TitleCache.get(kind, id)) }
    var sources by remember { mutableStateOf<List<PlayableSource>>(emptyList()) }
    var subtitles by remember { mutableStateOf<List<SubtitleTrack>>(emptyList()) }
    var sourceIndex by remember { mutableIntStateOf(0) }
    var notice by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    var resumeAt by remember { mutableLongStateOf(startMs) }

    var buffering by remember { mutableStateOf(true) }
    var playing by remember { mutableStateOf(false) }
    var ended by remember { mutableStateOf(false) }
    var position by remember { mutableLongStateOf(0L) }
    var duration by remember { mutableLongStateOf(0L) }
    var tracks by remember { mutableStateOf(Tracks.EMPTY) }
    var controls by remember { mutableStateOf(true) }
    var panel by remember { mutableStateOf(false) }
    var lastInput by remember { mutableLongStateOf(System.currentTimeMillis()) }

    val rootFocus = remember { FocusRequester() }
    val seekFocus = remember { FocusRequester() }
    val playFocus = remember { FocusRequester() }
    val retryFocus = remember { FocusRequester() }
    val panelFocus = remember { FocusRequester() }

    val title = detail?.let { d -> if (d.kind == TitleKind.MOVIE) d.name else "${d.name} · Ep. $episode" } ?: ""
    val movieId = detail?.takeIf { it.savesProgress }?.id

    fun save(final: Boolean = false) {
        val mid = movieId ?: return
        val pos = player.currentPosition
        val dur = player.duration.takeIf { it != C.TIME_UNSET } ?: 0L
        if (!ResumePolicy.shouldSave(pos, dur)) return
        val p = if (final && player.playbackState == Player.STATE_ENDED) dur else pos
        progressScope.launch { repository.saveProgress(mid, p / 1000, dur / 1000) }
    }

    fun start(index: Int, atMs: Long) {
        val src = sources.getOrNull(index) ?: return
        sourceIndex = index
        ended = false
        httpFactory.setDefaultRequestProperties(src.headers)
        player.setMediaItem(mediaItemFor(src, title, subtitles), atMs.coerceAtLeast(0))
        player.prepare()
        player.playWhenReady = true
        phase = Phase.Playing
    }

    LaunchedEffect(attempt) {
        phase = Phase.Loading(if (kind == TitleKind.ANIME) "Buscando fuentes del episodio $episode…" else "Preparando video…")
        val result = loader.load(kind, id, episode, detail ?: TitleCache.get(kind, id)) { status -> phase = Phase.Loading(status) }
        when (result) {
            is LoadResult.Ready -> {
                detail = result.detail
                sources = result.sources
                subtitles = result.subtitles
                notice = result.notice
                start(0, resumeAt)
            }
            is LoadResult.Failed -> {
                result.detail?.let { detail = it }
                phase = Phase.Failed(result.error)
            }
        }
    }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                buffering = state == Player.STATE_BUFFERING
                ended = state == Player.STATE_ENDED
                if (ended) { save(final = true); controls = true }
            }
            override fun onIsPlayingChanged(isPlaying: Boolean) { playing = isPlaying }
            override fun onTracksChanged(t: Tracks) { tracks = t }
            override fun onPlayerError(error: PlaybackException) {
                val cause = errorFor(error)
                resumeAt = player.currentPosition.takeIf { it > 0 } ?: resumeAt
                val auth = cause.kind == pro.verpelis.tv.data.playback.PlaybackErrorKind.UNAUTHENTICATED ||
                    cause.kind == pro.verpelis.tv.data.playback.PlaybackErrorKind.NO_PLAN
                if (!auth && sourceIndex + 1 < sources.size) {
                    notice = "La fuente ${sourceIndex + 1} falló (${cause.message}); probando la siguiente…"
                    start(sourceIndex + 1, resumeAt)
                } else {
                    phase = Phase.Failed(cause)
                }
            }
        }
        player.addListener(listener)
        onDispose {
            save(final = true)
            player.removeListener(listener)
            player.release()
        }
    }

    // Reloj de la barra de progreso.
    LaunchedEffect(player) {
        while (true) {
            position = player.currentPosition
            duration = player.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: 0L
            delay(500)
        }
    }
    // Guardado periódico mientras se reproduce.
    LaunchedEffect(movieId) {
        while (movieId != null) {
            delay(SAVE_EVERY_MS)
            if (player.isPlaying) save()
        }
    }
    // Ocultar controles tras 5 s sin teclas mientras se reproduce.
    LaunchedEffect(controls, lastInput, playing, panel) {
        if (controls && playing && !panel) {
            delay(CONTROLS_TIMEOUT_MS)
            controls = false
        }
    }
    LaunchedEffect(notice) { if (notice != null) { delay(7_000); notice = null } }

    // Foco: con controles → barra de progreso; sin controles → raíz (las teclas van al reproductor).
    LaunchedEffect(controls, phase, panel) {
        runCatching {
            when {
                phase is Phase.Failed -> retryFocus.requestFocus()
                panel -> panelFocus.requestFocus()
                controls && phase is Phase.Playing -> seekFocus.requestFocus()
                else -> rootFocus.requestFocus()
            }
        }
    }

    fun exit() {
        uiSounds.playClick()
        onBack()
    }

    BackHandler {
        if (panel) panel = false else exit()
    }

    fun togglePlay() {
        if (ended) { player.seekTo(0); player.play() }
        else if (player.isPlaying) player.pause() else player.play()
    }

    fun seekBy(forward: Boolean) {
        player.seekTo(ResumePolicy.seekTarget(player.currentPosition, duration, forward))
        position = player.currentPosition
    }

    val levels = QualityLevels.build(qualityCandidates(tracks), displayHeight)
    val texts = textOptions(tracks)
    val params = player.trackSelectionParameters
    val textDisabled = params.disabledTrackTypes.contains(C.TRACK_TYPE_TEXT)
    val subsOn = !textDisabled && tracks.groups.any { it.type == C.TRACK_TYPE_TEXT && it.isSelected }
    val videoOverride = params.overrides.values.firstOrNull { it.type == C.TRACK_TYPE_VIDEO }
    val qualityLabel = videoOverride?.let { o ->
        levels.firstOrNull { tracks.groups.getOrNull(it.group)?.mediaTrackGroup == o.mediaTrackGroup && o.trackIndices.contains(it.track) }?.label
    } ?: "Auto"

    fun setSubtitles(on: Boolean, option: TextOption? = null) {
        val b = player.trackSelectionParameters.buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, !on)
        val pick = option ?: texts.firstOrNull().takeIf { on && !subsOn }
        if (on && pick != null) {
            tracks.groups.getOrNull(pick.group)?.let { b.setOverrideForType(TrackSelectionOverride(it.mediaTrackGroup, pick.track)) }
        }
        if (!on) b.clearOverridesOfType(C.TRACK_TYPE_TEXT)
        player.trackSelectionParameters = b.build()
    }

    fun setQuality(level: QualityLevel?) {
        val b = player.trackSelectionParameters.buildUpon().clearOverridesOfType(C.TRACK_TYPE_VIDEO)
        if (level != null) tracks.groups.getOrNull(level.group)?.let { b.setOverrideForType(TrackSelectionOverride(it.mediaTrackGroup, level.track)) }
        player.trackSelectionParameters = b.build()
    }

    CompositionLocalProvider(LocalMnFocusSound provides { uiSounds.playFocus() }) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black)
                .onPreviewKeyEvent { ev ->
                    // Atrás se atiende aquí: Compose usaría la primera pulsación solo para quitar el foco.
                    if (ev.nativeKeyEvent.keyCode == AndroidKeyEvent.KEYCODE_BACK) {
                        if (ev.type == KeyEventType.KeyUp) { if (panel) panel = false else exit() }
                        return@onPreviewKeyEvent true
                    }
                    if (ev.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                    lastInput = System.currentTimeMillis()
                    if (phase !is Phase.Playing) return@onPreviewKeyEvent false
                    when (ev.nativeKeyEvent.keyCode) {
                        AndroidKeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { togglePlay(); controls = true; true }
                        AndroidKeyEvent.KEYCODE_MEDIA_PLAY -> { player.play(); controls = true; true }
                        AndroidKeyEvent.KEYCODE_MEDIA_PAUSE -> { player.pause(); controls = true; true }
                        AndroidKeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> { seekBy(true); controls = true; true }
                        AndroidKeyEvent.KEYCODE_MEDIA_REWIND -> { seekBy(false); controls = true; true }
                        AndroidKeyEvent.KEYCODE_DPAD_CENTER, AndroidKeyEvent.KEYCODE_ENTER, AndroidKeyEvent.KEYCODE_NUMPAD_ENTER ->
                            if (!controls && !panel) { togglePlay(); controls = true; true } else false
                        AndroidKeyEvent.KEYCODE_DPAD_LEFT, AndroidKeyEvent.KEYCODE_DPAD_RIGHT ->
                            if (!controls && !panel) {
                                seekBy(ev.nativeKeyEvent.keyCode == AndroidKeyEvent.KEYCODE_DPAD_RIGHT); controls = true; true
                            } else false
                        AndroidKeyEvent.KEYCODE_DPAD_UP, AndroidKeyEvent.KEYCODE_DPAD_DOWN ->
                            if (!controls && !panel) { controls = true; true } else false
                        else -> false
                    }
                }
                .focusRequester(rootFocus)
                .focusable(),
        ) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        useController = false
                        isFocusable = false
                        descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS
                        keepScreenOn = true
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setShutterBackgroundColor(android.graphics.Color.BLACK)
                        setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
                        layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                        this.player = player
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )

            val p = phase
            if (p is Phase.Loading) LoadingOverlay(detail, title, p.message)
            if (p is Phase.Playing && buffering) {
                Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                    NoirSpinner(size = 40.dp)
                    Spacer(Modifier.height(10.dp))
                    MnText("Cargando…", color = Mn.Variant, size = 9.sp)
                }
            }
            if (p is Phase.Playing && (controls || !playing)) {
                ControlsOverlay(
                    title = title,
                    detail = detail,
                    playing = playing,
                    ended = ended,
                    position = position,
                    duration = duration,
                    showQuality = QualityLevels.showSelector(levels),
                    qualityLabel = qualityLabel,
                    hasSubtitles = texts.isNotEmpty(),
                    multipleSubtitles = texts.size > 1,
                    subsOn = subsOn,
                    seekFocus = seekFocus,
                    playFocus = playFocus,
                    onSeek = { fwd -> lastInput = System.currentTimeMillis(); seekBy(fwd) },
                    onTogglePlay = { togglePlay() },
                    onSubtitles = { setSubtitles(!subsOn) },
                    onSettings = { panel = true },
                    onExit = { exit() },
                )
            }
            if (p is Phase.Playing && panel) {
                SettingsPanel(
                    modifier = Modifier.align(Alignment.CenterEnd),
                    levels = levels,
                    selectedQuality = qualityLabel,
                    texts = texts,
                    subsOn = subsOn,
                    selectedText = tracks.groups.withIndex().firstNotNullOfOrNull { (gi, g) ->
                        if (g.type != C.TRACK_TYPE_TEXT) null else (0 until g.length).firstOrNull { g.isTrackSelected(it) }?.let { gi to it }
                    },
                    firstFocus = panelFocus,
                    onQuality = { setQuality(it) },
                    onText = { opt -> if (opt == null) setSubtitles(false) else setSubtitles(true, opt) },
                    onClose = { panel = false },
                )
            }
            if (p is Phase.Failed) {
                ErrorOverlay(
                    detail = detail,
                    title = title,
                    error = p.error,
                    retryFocus = retryFocus,
                    onRetry = { uiSounds.playClick(); attempt++ },
                    onLogin = { uiSounds.playClick(); onNeedLogin() },
                    onBack = { exit() },
                )
            }
            notice?.let {
                Box(
                    Modifier.align(Alignment.TopCenter).padding(top = 18.dp).widthIn(max = 560.dp)
                        .clip(RoundedCornerShape(4.dp)).background(Mn.Lowest.copy(alpha = 0.92f))
                        .border(1.dp, Mn.Gold.copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                ) { MnText(it, color = Mn.Text, size = 9.sp) }
            }
        }
    }
}

@Composable
private fun LoadingOverlay(detail: TitleDetail?, title: String, message: String) {
    Box(Modifier.fillMaxSize().background(Brush.radialGradient(listOf(Mn.High, Mn.Low, Mn.Lowest)))) {
        Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
            MnText("PELIS", color = Mn.Gold, size = 14.sp, family = Mn.Serif, spacing = 3.sp)
            Spacer(Modifier.height(18.dp))
            NoirSpinner(size = 42.dp)
            Spacer(Modifier.height(16.dp))
            MnText(title.ifBlank { detail?.name ?: "" }, color = Mn.Text, size = 16.sp, family = Mn.Serif, lines = 1)
            Spacer(Modifier.height(6.dp))
            MnText(message, color = Mn.Variant, size = 9.sp)
        }
    }
}

@Composable
private fun ControlsOverlay(
    title: String,
    detail: TitleDetail?,
    playing: Boolean,
    ended: Boolean,
    position: Long,
    duration: Long,
    showQuality: Boolean,
    qualityLabel: String,
    hasSubtitles: Boolean,
    multipleSubtitles: Boolean,
    subsOn: Boolean,
    seekFocus: FocusRequester,
    playFocus: FocusRequester,
    onSeek: (Boolean) -> Unit,
    onTogglePlay: () -> Unit,
    onSubtitles: () -> Unit,
    onSettings: () -> Unit,
    onExit: () -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxWidth().height(120.dp).background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.85f), Color.Transparent))))
        Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(220.dp).background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.92f)))))

        Row(Modifier.padding(start = 40.dp, top = 24.dp, end = 40.dp), verticalAlignment = Alignment.CenterVertically) {
            NoirButton("Salir", onExit, icon = NoirIcon.ArrowLeft)
            Spacer(Modifier.width(14.dp))
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MnText(title, color = Mn.Text, size = 18.sp, family = Mn.Serif, lines = 1)
                    Spacer(Modifier.width(10.dp))
                    NoirBadge("HLS", gold = true)
                }
                val meta = listOfNotNull(detail?.year?.takeIf { it.isNotBlank() }, detail?.genre?.takeIf { it.isNotBlank() }, if (duration > 0) ResumePolicy.formatClock(duration) else null)
                MnText(meta.joinToString(" • "), color = Mn.Variant, size = 8.sp, lines = 1)
            }
        }

        Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(start = 40.dp, end = 40.dp, bottom = 18.dp)) {
            SeekBar(position, duration, seekFocus, onSeek)
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                NoirButton("−10 s", { onSeek(false) }, icon = NoirIcon.Back10)
                NoirButton(
                    if (ended) "Repetir" else if (playing) "Pausa" else "Reproducir",
                    onTogglePlay,
                    icon = if (playing && !ended) NoirIcon.Pause else NoirIcon.Play,
                    primary = true,
                    focusRequester = playFocus,
                )
                NoirButton("+10 s", { onSeek(true) }, icon = NoirIcon.Forward10)
                Spacer(Modifier.width(8.dp))
                if (hasSubtitles) NoirButton(if (subsOn) "Subtítulos: Sí" else "Subtítulos: No", onSubtitles, icon = NoirIcon.Subtitles, selected = subsOn)
                if (showQuality) NoirButton("Calidad: $qualityLabel", onSettings, icon = NoirIcon.Quality)
                if (!showQuality && multipleSubtitles) NoirButton("Idioma de subtítulos", onSettings, icon = NoirIcon.Quality)
            }
            Spacer(Modifier.height(12.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(Mn.OutlineVar.copy(alpha = 0.6f)))
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.CenterVertically) {
                NoirKeyHint("OK", "Seleccionar / Pausa")
                NoirKeyHint("◀ ▶", "Retroceder / Adelantar 10 s")
                NoirKeyHint("▲ ▼", "Controles")
                NoirKeyHint("ATRÁS", "Salir")
            }
        }
    }
}

@Composable
private fun SeekBar(position: Long, duration: Long, focus: FocusRequester, onSeek: (Boolean) -> Unit) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val fraction = if (duration > 0) (position.toFloat() / duration).coerceIn(0f, 1f) else 0f
    Row(verticalAlignment = Alignment.CenterVertically) {
        MnText(ResumePolicy.formatClock(position), color = Mn.Gold, size = 9.sp, family = Mn.Mono, weight = FontWeight.SemiBold)
        Spacer(Modifier.width(12.dp))
        Box(
            Modifier
                .weight(1f)
                .height(18.dp)
                .focusRequester(focus)
                .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
                .onKeyEvent { ev ->
                    if (ev.type != KeyEventType.KeyDown) return@onKeyEvent false
                    when (ev.nativeKeyEvent.keyCode) {
                        AndroidKeyEvent.KEYCODE_DPAD_LEFT -> { onSeek(false); true }
                        AndroidKeyEvent.KEYCODE_DPAD_RIGHT -> { onSeek(true); true }
                        else -> false
                    }
                }
                .focusable(),
            contentAlignment = Alignment.CenterStart,
        ) {
            val h = if (focused) 6.dp else 4.dp
            Box(Modifier.fillMaxWidth().height(h).clip(RoundedCornerShape(3.dp)).background(Mn.Highest))
            Box(Modifier.fillMaxWidth(fraction).height(h).clip(RoundedCornerShape(3.dp)).background(Mn.Gold))
            Row(Modifier.fillMaxWidth()) {
                Spacer(Modifier.fillMaxWidth(fraction))
                Box(
                    Modifier.size(if (focused) 14.dp else 10.dp).clip(RoundedCornerShape(7.dp))
                        .background(if (focused) Mn.GoldLight else Mn.Text)
                        .border(if (focused) 2.dp else 0.dp, Color.White, RoundedCornerShape(7.dp)),
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        MnText(if (duration > 0) ResumePolicy.formatClock(duration) else "--:--", color = Mn.Variant, size = 9.sp, family = Mn.Mono)
    }
}

@Composable
private fun SettingsPanel(
    modifier: Modifier,
    levels: List<QualityLevel>,
    selectedQuality: String,
    texts: List<TextOption>,
    subsOn: Boolean,
    selectedText: Pair<Int, Int>?,
    firstFocus: FocusRequester,
    onQuality: (QualityLevel?) -> Unit,
    onText: (TextOption?) -> Unit,
    onClose: () -> Unit,
) {
    Column(
        modifier.fillMaxHeight().width(330.dp).background(Mn.Low.copy(alpha = 0.97f))
            .border(1.dp, Mn.OutlineVar.copy(alpha = 0.6f))
            .padding(horizontal = 20.dp, vertical = 22.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            NoirGlyph(NoirIcon.Quality, color = Mn.Gold, size = 12.dp)
            Spacer(Modifier.width(10.dp))
            MnText("Ajustes de reproducción", color = Mn.Text, size = 14.sp, family = Mn.Serif, modifier = Modifier.weight(1f))
            NoirButton("Cerrar", onClose)
        }
        Spacer(Modifier.height(10.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(Mn.OutlineVar.copy(alpha = 0.6f)))
        LazyColumn(Modifier.weight(1f)) {
            var first = true
            fun Modifier.firstFocus(): Modifier = if (first) { first = false; this.focusRequester(firstFocus) } else this
            if (QualityLevels.showSelector(levels)) {
                item { PanelHeader("Calidad de transmisión", "Máx. pantalla") }
                val autoMod = Modifier.firstFocus()
                item { PanelOption("Auto (Adaptativo)", "Ajuste dinámico según la conexión", selectedQuality == "Auto", autoMod) { onQuality(null) } }
                levels.forEach { lv ->
                    item { PanelOption(lv.label, lv.detail, selectedQuality == lv.label) { onQuality(lv) } }
                }
            }
            if (texts.isNotEmpty()) {
                item { PanelHeader("Subtítulos", if (subsOn) "Activos" else "Desactivados") }
                val offMod = Modifier.firstFocus()
                item { PanelOption("Desactivados", "", !subsOn, offMod) { onText(null) } }
                texts.forEach { t ->
                    item { PanelOption(t.label, "", subsOn && selectedText == (t.group to t.track)) { onText(t) } }
                }
            }
        }
        MnText("ATRÁS cierra el panel", color = Mn.Outline, size = 8.sp)
    }
}

@Composable
private fun PanelHeader(title: String, tag: String) {
    Row(Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        MnText(title, color = Mn.Text, size = 11.sp, weight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        MnText(tag.uppercase(), color = Mn.Gold, size = 7.5.sp, weight = FontWeight.Bold, spacing = 1.sp)
    }
}

@Composable
private fun PanelOption(label: String, detail: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    Row(
        modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp)
            .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
            .noirFocus(focused, shape, 1.02f)
            .clip(shape)
            .background(if (focused) Mn.High else Mn.Lowest)
            .border(if (focused || selected) 1.5.dp else 1.dp, if (focused || selected) Mn.Gold else Mn.OutlineVar, shape)
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (selected) { NoirGlyph(NoirIcon.Check, color = Mn.Gold, size = 10.dp); Spacer(Modifier.width(8.dp)) }
        Column(Modifier.weight(1f)) {
            MnText(label, color = if (selected) Mn.Text else Mn.Variant, size = 10.sp, weight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
            if (detail.isNotBlank()) MnText(detail, color = if (selected) Mn.Gold else Mn.Outline, size = 8.sp)
        }
        if (selected) MnText("ACTIVO", color = Mn.Gold, size = 7.sp, weight = FontWeight.Bold, spacing = 1.sp)
        else Box(Modifier.size(12.dp).clip(RoundedCornerShape(6.dp)).border(1.dp, Mn.Outline, RoundedCornerShape(6.dp)))
    }
}

@Composable
private fun ErrorOverlay(
    detail: TitleDetail?,
    title: String,
    error: PlaybackError,
    retryFocus: FocusRequester,
    onRetry: () -> Unit,
    onLogin: () -> Unit,
    onBack: () -> Unit,
) {
    Box(Modifier.fillMaxSize().background(Mn.Lowest.copy(alpha = 0.94f))) {
        Column(
            Modifier.align(Alignment.Center).width(520.dp).clip(RoundedCornerShape(6.dp)).background(Mn.Low)
                .border(1.dp, Mn.OutlineVar, RoundedCornerShape(6.dp)).padding(28.dp),
        ) {
            MnText("NO SE PUEDE REPRODUCIR", color = Mn.Error, size = 8.sp, weight = FontWeight.Bold, spacing = 2.sp)
            Spacer(Modifier.height(8.dp))
            MnText(title.ifBlank { detail?.name ?: "Video" }, color = Mn.Text, size = 18.sp, family = Mn.Serif, lines = 2)
            Spacer(Modifier.height(10.dp))
            MnText(error.message, color = Mn.Variant, size = 10.5.sp)
            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                NoirButton("Reintentar", onRetry, icon = NoirIcon.Restart, primary = true, focusRequester = retryFocus)
                if (error.needsLogin) NoirButton("Iniciar sesión", onLogin)
                NoirButton("Volver", onBack, icon = NoirIcon.ArrowLeft)
            }
        }
    }
}
