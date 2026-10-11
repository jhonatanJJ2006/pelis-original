package pro.verpelis.core.player

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.media.AudioManager
import android.net.Uri
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
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
fun PelisPlayer(req: PlaybackRequest, api: PelisApi, fullscreen: Boolean, tv: Boolean, modifier: Modifier = Modifier) {
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

    Box(modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Noir.Surface, Noir.Ink)))) {
        AndroidView(
            factory = { ctx -> PlayerView(ctx).apply {
                this.player = player
                setShowSubtitleButton(true)
                setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
                setKeepContentOnPlayerReset(true)
                if (tv) { requestFocus() }
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
        hud?.let { zone -> Hud(zone, hudLevel, Modifier.align(Alignment.TopCenter).padding(top = 24.dp)) }
        if (!req.live) TrackMenu(player, Modifier.align(Alignment.TopEnd).padding(8.dp))
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
                text = { Text(if (type == C.TRACK_TYPE_VIDEO) "Automática" else "Desactivados") },
                onClick = {
                    player.trackSelectionParameters = params.buildUpon().clearOverridesOfType(type)
                        .setTrackTypeDisabled(type, type == C.TRACK_TYPE_TEXT).build()
                    open = null
                },
            )
            player.currentTracks.groups.filter { it.type == type }.forEach { g ->
                for (i in 0 until g.length) {
                    val f = g.getTrackFormat(i)
                    val label = if (type == C.TRACK_TYPE_VIDEO) (if (f.height > 0) "${f.height}p" else "Pista ${i + 1}")
                    else (f.label ?: f.language ?: "Pista ${i + 1}")
                    DropdownMenuItem(text = { Text(label) }, onClick = {
                        player.trackSelectionParameters = params.buildUpon().setTrackTypeDisabled(type, false)
                            .setOverrideForType(TrackSelectionOverride(g.mediaTrackGroup, i)).build()
                        open = null
                    })
                }
            }
        }
    }
}
