package pro.verpelis.core.player

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.media.AudioManager
import android.net.Uri
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectVerticalDragGestures
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.core.data.PelisApi
import pro.verpelis.core.data.Subtitle
import pro.verpelis.core.ui.Noir

data class PlaybackRequest(val url: String, val title: String, val movieId: String? = null, val subtitles: List<Subtitle> = emptyList(), val live: Boolean = false)

fun Context.findActivity(): Activity? {
    var c = this
    while (c is ContextWrapper) { if (c is Activity) return c; c = c.baseContext }
    return null
}

@OptIn(UnstableApi::class)
fun buildPlayer(context: Context, api: PelisApi, req: PlaybackRequest): ExoPlayer {
    val factory = OkHttpDataSource.Factory(api.http)
    val player = ExoPlayer.Builder(context).setMediaSourceFactory(DefaultMediaSourceFactory(factory)).build()
    val subs = req.subtitles.map {
        MediaItem.SubtitleConfiguration.Builder(Uri.parse(it.url))
            .setMimeType(if (it.url.contains(".srt")) MimeTypes.APPLICATION_SUBRIP else MimeTypes.TEXT_VTT)
            .setLanguage(it.lang).setLabel(it.label).build()
    }
    val item = MediaItem.Builder().setUri(req.url).setMediaMetadata(androidx.media3.common.MediaMetadata.Builder().setTitle(req.title).build())
        .apply { if (req.url.contains(".m3u8") || req.url.contains("/stream")) setMimeType(MimeTypes.APPLICATION_M3U8) }
        .setSubtitleConfigurations(subs).build()
    player.trackSelectionParameters = player.trackSelectionParameters.buildUpon().setPreferredTextLanguage("es").setPreferredAudioLanguage("es").build()
    player.setMediaItem(item)
    player.prepare()
    player.playWhenReady = true
    return player
}

/**
 * Reproductor compartido celular/TV.
 * - fullscreen: activa los gestos (izquierda brillo, derecha volumen) solo en pantalla completa.
 * - tv: sin gestos táctiles, controles con D-pad (PlayerView ya gestiona el foco).
 */
@OptIn(UnstableApi::class)
@Composable
fun PelisPlayer(req: PlaybackRequest, api: PelisApi, fullscreen: Boolean, tv: Boolean, modifier: Modifier = Modifier, onReady: (ExoPlayer, PlayerView) -> Unit = { _, _ -> }, onBack: (() -> Unit)? = null) {
    val context = LocalContext.current
    val activity = remember { context.findActivity() }
    val player = remember(req.url) { buildPlayer(context, api, req) }
    var buffering by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var hud by remember { mutableStateOf<GestureMath.Zone?>(null) }
    var hudLevel by remember { mutableFloatStateOf(0f) }
    var hudTick by remember { mutableStateOf(0) }
    val audio = remember { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }
    val maxVol = remember { audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC) }
    var brightness by remember {
        mutableFloatStateOf(activity?.window?.attributes?.screenBrightness?.takeIf { it >= 0 } ?: 0.5f)
    }

    DisposableEffect(player) {
        val l = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) { buffering = state == Player.STATE_BUFFERING || state == Player.STATE_IDLE }
            override fun onPlayerError(e: androidx.media3.common.PlaybackException) { error = "No se pudo reproducir. Intenta de nuevo." }
        }
        player.addListener(l)
        onDispose {
            req.movieId?.let { id ->
                val pos = player.currentPosition / 1000; val dur = player.duration.coerceAtLeast(0) / 1000
                if (pos > 5) kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch { api.saveProgress(id, pos, dur) }
            }
            player.removeListener(l); player.release()
        }
    }
    // Al salir a Inicio se pausa (y se guarda el avance); al volver sigue donde iba.
    DisposableEffect(player, activity) {
        val owner = activity as? androidx.lifecycle.LifecycleOwner
        var wasPlaying = false
        val obs = androidx.lifecycle.LifecycleEventObserver { _, ev ->
            when (ev) {
                androidx.lifecycle.Lifecycle.Event.ON_STOP -> {
                    wasPlaying = player.playWhenReady; player.pause()
                    req.movieId?.let { id ->
                        val pos = player.currentPosition / 1000; val dur = player.duration.coerceAtLeast(0) / 1000
                        if (pos > 5) kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch { runCatching { api.saveProgress(id, pos, dur) } }
                    }
                }
                androidx.lifecycle.Lifecycle.Event.ON_START -> if (wasPlaying) player.play()
                else -> Unit
            }
        }
        owner?.lifecycle?.addObserver(obs)
        onDispose { owner?.lifecycle?.removeObserver(obs) }
    }
    LaunchedEffect(hudTick) { if (hud != null) { delay(1200); hud = null } }

    val gestureMod = if (!tv && GestureMath.gesturesEnabled(fullscreen)) Modifier.pointerInput(fullscreen) {
        var zone = GestureMath.Zone.VOLUME
        detectVerticalDragGestures(
            onDragStart = { o -> zone = GestureMath.zoneFor(o.x, size.width.toFloat()) },
            onVerticalDrag = { change, dy ->
                change.consume()
                val h = size.height.toFloat()
                if (zone == GestureMath.Zone.BRIGHTNESS) {
                    brightness = GestureMath.applyDrag(brightness, dy, h)
                    activity?.window?.let { w ->
                        val a = w.attributes; a.screenBrightness = GestureMath.toWindowBrightness(brightness); w.attributes = a
                    }
                    hudLevel = brightness
                } else {
                    val cur = GestureMath.fromVolumeIndex(audio.getStreamVolume(AudioManager.STREAM_MUSIC), maxVol)
                    val next = GestureMath.applyDrag(if (hud == GestureMath.Zone.VOLUME) hudLevel else cur, dy, h)
                    audio.setStreamVolume(AudioManager.STREAM_MUSIC, GestureMath.toVolumeIndex(next, maxVol), 0)
                    hudLevel = next
                }
                hud = zone; hudTick++
            },
        )
    } else Modifier

    Box(modifier.fillMaxSize().background(Brush.radialGradient(listOf(Noir.Raised, Noir.Surface, Noir.Ink)))) {
        AndroidView(
            factory = { ctx -> PlayerView(ctx).apply {
                this.player = player
                setShowSubtitleButton(true)
                setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
                setKeepContentOnPlayerReset(true)
                // Sin obturador negro: durante la carga se ve el fondo Maison Noir.
                setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                if (tv) { requestFocus() }
                onReady(player, this)
            } },
            modifier = Modifier.fillMaxSize(),
        )
        // Capa de gestos solo sobre la mitad central vertical para no tapar la barra de controles
        Box(Modifier.fillMaxSize().padding(top = 56.dp, bottom = 96.dp).then(gestureMod))

        if (buffering && error == null) {
            Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = Noir.Gold, strokeWidth = 3.dp, modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(12.dp))
                Text("Cargando " + req.title, color = Noir.Text, fontSize = 14.sp)
            }
        }
        error?.let {
            Text(it, color = Noir.Text, modifier = Modifier.align(Alignment.Center).background(Noir.Burgundy, RoundedCornerShape(8.dp)).padding(16.dp))
        }
        hud?.let { zone -> Hud(zone, hudLevel, Modifier.align(Alignment.TopCenter).padding(top = 64.dp)) }
        var settings by remember { mutableStateOf(false) }
        if (!tv) Row(Modifier.align(Alignment.TopStart).fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            if (onBack != null) TextButton(onClick = onBack) { Text("<", color = Noir.Text, fontSize = 20.sp) }
            Text("PELIS", color = Noir.Gold, fontFamily = Noir.Display, fontSize = 18.sp, letterSpacing = 1.5.sp)
            Box(Modifier.padding(horizontal = 10.dp).width(1.dp).height(14.dp).background(Noir.Line))
            Text(req.title, color = Noir.Text, fontFamily = Noir.Display, fontSize = 16.sp, maxLines = 1, modifier = Modifier.weight(1f))
            if (!req.live) TextButton(onClick = { settings = true }) { Text("Ajustes", color = Noir.Gold) }
        }
        if (tv && !req.live) TrackMenu(player, Modifier.align(Alignment.TopEnd).padding(8.dp))
        if (settings) SettingsPanel(player, req, Modifier.align(Alignment.CenterEnd)) { settings = false }
    }
}

/** HUD horizontal arriba al centro: etiqueta, barra dorada y porcentaje. */
@Composable
fun Hud(zone: GestureMath.Zone, level: Float, modifier: Modifier = Modifier) {
    Row(
        modifier.background(Noir.Ink.copy(alpha = 0.8f), RoundedCornerShape(20.dp)).padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(if (zone == GestureMath.Zone.BRIGHTNESS) "Brillo" else "Volumen", color = Noir.Text, fontSize = 13.sp)
        Spacer(Modifier.width(12.dp))
        Box(Modifier.width(160.dp).height(4.dp).clip(RoundedCornerShape(2.dp)).background(Noir.Raised)) {
            Box(Modifier.fillMaxHeight().width((160 * level.coerceIn(0f, 1f)).dp).background(Noir.Gold))
        }
        Spacer(Modifier.width(12.dp))
        Text("${GestureMath.hudPercent(level)}%", color = Noir.Gold, fontSize = 13.sp)
    }
}

/** Panel lateral "Ajustes de reproducción" (subtítulos y calidad) del diseño. */
@OptIn(UnstableApi::class)
@Composable
fun SettingsPanel(player: ExoPlayer, req: PlaybackRequest, modifier: Modifier = Modifier, onClose: () -> Unit) {
    var tick by remember { mutableStateOf(0) }
    DisposableEffect(player) {
        // Refresca "Automática (720p)" cuando el ABR cambia de nivel.
        val l = object : Player.Listener { override fun onTracksChanged(tracks: androidx.media3.common.Tracks) { tick++ } }
        player.addListener(l)
        onDispose { player.removeListener(l) }
    }
    Column(modifier.fillMaxHeight().width(320.dp).background(Noir.Surface).padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Ajustes de reproducción", color = Noir.Text, fontFamily = Noir.Display, fontSize = 18.sp, modifier = Modifier.weight(1f))
            TextButton(onClick = onClose) { Text("Cerrar", color = Noir.Muted) }
        }
        androidx.compose.foundation.lazy.LazyColumn {
            for (type in listOf(C.TRACK_TYPE_TEXT, C.TRACK_TYPE_VIDEO)) {
                item(key = "h$type") {
                    Text(if (type == C.TRACK_TYPE_TEXT) "Subtítulos" else "Calidad de video", color = Noir.Gold, fontSize = 12.sp,
                        letterSpacing = 1.sp, modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
                }
                val params = player.trackSelectionParameters
                val disabled = params.disabledTrackTypes.contains(type)
                val hasOverride = params.overrides.values.any { it.type == type }
                item(key = "o$type$tick") {
                    PanelOption(if (type == C.TRACK_TYPE_VIDEO) autoLabel(player) else "Desactivados",
                        if (type == C.TRACK_TYPE_VIDEO) !hasOverride else disabled) {
                        player.trackSelectionParameters = params.buildUpon().clearOverridesOfType(type)
                            .setTrackTypeDisabled(type, type == C.TRACK_TYPE_TEXT).build(); tick++
                    }
                }
                trackOptions(player, type).forEach { o ->
                    item(key = "t$type-${o.key}-$tick") {
                        PanelOption(o.label, !disabled && o.selected && (type == C.TRACK_TYPE_TEXT || hasOverride)) {
                            player.trackSelectionParameters = params.buildUpon().setTrackTypeDisabled(type, false)
                                .setOverrideForType(o.override).build(); tick++
                        }
                    }
                }
            }
            item {
                Text(req.title, color = Noir.Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 20.dp))
            }
        }
    }
}

@Composable
private fun PanelOption(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp).clip(RoundedCornerShape(6.dp))
        .background(if (selected) Noir.Gold.copy(alpha = 0.14f) else Noir.Raised)
        .androidxClickable(onClick).padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = if (selected) Noir.Gold else Noir.Text, fontSize = 14.sp, modifier = Modifier.weight(1f))
        Box(Modifier.size(12.dp).clip(RoundedCornerShape(6.dp)).background(if (selected) Noir.Gold else Noir.Line))
    }
}

private fun Modifier.androidxClickable(onClick: () -> Unit): Modifier = this.clickable(onClick = onClick)

/** Selector de calidad y subtítulos usando las pistas reales del stream HLS. */
@OptIn(UnstableApi::class)
@Composable
fun TrackMenu(player: ExoPlayer, modifier: Modifier = Modifier) {
    var open by remember { mutableStateOf<Int?>(null) }
    Row(modifier) {
        TextButton(onClick = { open = C.TRACK_TYPE_VIDEO }) { Text("Calidad", color = Noir.Text) }
        TextButton(onClick = { open = C.TRACK_TYPE_TEXT }) { Text("Subtítulos", color = Noir.Text) }
        DropdownMenu(expanded = open != null, onDismissRequest = { open = null }) {
            val type = open ?: return@DropdownMenu
            val params = player.trackSelectionParameters
            DropdownMenuItem(
                text = { Text(if (type == C.TRACK_TYPE_VIDEO) autoLabel(player) else "Desactivados") },
                onClick = {
                    player.trackSelectionParameters = params.buildUpon().clearOverridesOfType(type)
                        .setTrackTypeDisabled(type, type == C.TRACK_TYPE_TEXT).build()
                    open = null
                },
            )
            trackOptions(player, type).forEach { o ->
                DropdownMenuItem(text = { Text(o.label) }, onClick = {
                    player.trackSelectionParameters = params.buildUpon().setTrackTypeDisabled(type, false)
                        .setOverrideForType(o.override).build()
                    open = null
                })
            }
        }
    }
}

/** Opción de pista: en video, una por nivel (1080p, 720p, 480p, 360p) de mayor a menor. */
@OptIn(UnstableApi::class)
internal class TrackOption(val key: String, val label: String, val selected: Boolean, val override: TrackSelectionOverride)

@OptIn(UnstableApi::class)
internal fun trackOptions(player: ExoPlayer, type: Int): List<TrackOption> {
    val all = player.currentTracks.groups.filter { it.type == type }.flatMapIndexed { gi, g ->
        (0 until g.length).filter { g.isTrackSupported(it) || type != C.TRACK_TYPE_VIDEO }.map { i ->
            val f = g.getTrackFormat(i)
            val label = if (type == C.TRACK_TYPE_VIDEO) (QualityLabel.of(f.width, f.height) ?: "Pista ${i + 1}")
            else (f.label ?: f.language ?: "Pista ${i + 1}")
            Triple(maxOf(f.height, f.width * 9 / 16), TrackOption("$gi-$i", label, g.isTrackSelected(i), TrackSelectionOverride(g.mediaTrackGroup, i)), f.bitrate)
        }
    }
    if (type != C.TRACK_TYPE_VIDEO) return all.map { it.second }
    // Misma altura repetida (p. ej. dos bitrates): se queda la de mayor bitrate.
    return all.sortedWith(compareByDescending<Triple<Int, TrackOption, Int>> { it.first }.thenByDescending { it.third })
        .distinctBy { it.second.label }.map { it.second }
}

/** "Automática (720p)": muestra el nivel que eligió el ABR de HLS. */
internal fun autoLabel(player: ExoPlayer): String =
    player.videoFormat?.let { QualityLabel.of(it.width, it.height) }?.let { "Automática ($it)" } ?: "Automática"
