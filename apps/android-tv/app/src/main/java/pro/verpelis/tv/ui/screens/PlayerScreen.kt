package pro.verpelis.tv.ui.screens

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirBadge
import pro.verpelis.tv.ui.playback.NoirSpinner

/**
 * Canal en vivo a pantalla completa. Panel de información (solo datos reales: nombre y
 * categoría del canal; no hay guía de programación) al entrar y con cualquier tecla.
 */
@Composable
fun PlayerScreen(
    channelId: String,
    channelName: String,
    onBack: () -> Unit,
    onNeedLogin: () -> Unit,
    category: String = "",
) {
    val session = LocalSessionStore.current
    val api = LocalApiClient.current
    val context = LocalContext.current
    var overlayTick by remember { mutableIntStateOf(0) }
    var overlay by remember { mutableStateOf(true) }
    var buffering by remember { mutableStateOf(true) }
    var failed by remember { mutableStateOf(false) }
    val focus = remember { FocusRequester() }

    LaunchedEffect(channelId) {
        if (!session.hasSession()) onNeedLogin()
    }

    val player = remember(channelId) {
        ExoPlayer.Builder(context).build().apply {
            val factory = HlsMediaSource.Factory(OkHttpDataSource.Factory(api.okHttp))
            setMediaSource(factory.createMediaSource(MediaItem.fromUri(api.mediaUrlFor(channelId))))
            prepare()
            playWhenReady = true
        }
    }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                buffering = state == Player.STATE_BUFFERING || state == Player.STATE_IDLE
            }
            override fun onPlayerError(error: PlaybackException) {
                failed = true
                overlay = true
            }
        }
        player.addListener(listener)
        onDispose {
            player.removeListener(listener)
            player.release()
        }
    }
    LaunchedEffect(overlayTick) {
        overlay = true
        delay(5_000)
        if (!failed) overlay = false
    }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(focus)
            .onPreviewKeyEvent { ev ->
                if (ev.nativeKeyEvent.keyCode == android.view.KeyEvent.KEYCODE_BACK) return@onPreviewKeyEvent false
                if (ev.type == KeyEventType.KeyDown) overlayTick++
                true
            }
            .focusable(),
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = false
                    layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                    this.player = player
                }
            },
            update = { it.player = player },
            modifier = Modifier.fillMaxSize(),
        )
        if (buffering && !failed) NoirSpinner(Modifier.align(Alignment.Center))
        if (overlay) {
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color.Black.copy(alpha = 0.7f), 0.35f to Color.Transparent, 0.7f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.85f))))
            Column(Modifier.fillMaxSize().padding(horizontal = 48.dp, vertical = 26.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MnText("PELIS", color = Mn.Gold, size = 13.sp, family = Mn.Serif, spacing = 2.sp)
                    Spacer(Modifier.width(12.dp))
                    NoirBadge("En vivo", gold = true)
                }
                Spacer(Modifier.weight(1f))
                if (category.isNotBlank()) MnText(category.uppercase(), color = Mn.Gold, size = 8.sp, spacing = 1.6.sp)
                MnText(channelName.ifBlank { "Canal en vivo" }, color = Mn.Text, size = 28.sp, family = Mn.Serif, lines = 1)
                if (failed) {
                    Spacer(Modifier.height(6.dp))
                    MnText("No pudimos reproducir este canal ahora mismo. Prueba otro canal o vuelve más tarde.", color = Mn.Error, size = 10.sp, lines = 2)
                }
                Spacer(Modifier.height(14.dp))
                TvHintBar(listOf(TvHint("OK", "Información", gold = true), TvHint("ATRÁS", "Salir del canal")), Modifier.fillMaxWidth())
            }
        }
    }
}
