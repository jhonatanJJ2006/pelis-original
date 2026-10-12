package pro.verpelis.tv.ui.screens

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Text
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir
import pro.verpelis.tv.ui.theme.MaisonType

@Composable
fun PlayerScreen(
    channelId: String,
    channelName: String,
    onBack: () -> Unit,
    onNeedLogin: () -> Unit,
) {
    val session = LocalSessionStore.current
    val api = LocalApiClient.current
    val uiSounds = LocalUiSounds.current
    val context = LocalContext.current

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
        onDispose { player.release() }
    }

    Box(Modifier.fillMaxSize().background(MaisonNoir.Background)) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    useController = true
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    this.player = player
                }
            },
            update = { it.player = player },
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(24.dp),
        ) {
            TvFocusButton("Salir", {
                uiSounds.playClick()
                onBack()
            })
        }
        Text(
            text = channelName,
            style = MaisonType.Title,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 28.dp),
        )
    }
}
