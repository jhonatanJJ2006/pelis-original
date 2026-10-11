package pro.verpelis.tv

import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import pro.verpelis.core.data.PelisApi
import pro.verpelis.core.player.GestureMath
import pro.verpelis.core.player.PelisPlayer
import pro.verpelis.core.ui.NoirTheme
import pro.verpelis.core.ui.PlaybackIntent

/**
 * Reproductor TV con D-pad:
 * - Izquierda/derecha con los controles ocultos: retrocede/avanza 10 s (y muestra la barra).
 * - Centro / Play-Pausa: pausa o reanuda. Avance/retroceso rápido del control: 30 s.
 * - Con los controles visibles, el D-pad navega los botones de PlayerView.
 */
@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class TvPlayerActivity : ComponentActivity() {
    private var player: ExoPlayer? = null
    private var view: PlayerView? = null
    private var live = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val req = PlaybackIntent.read(intent)
        live = req.live
        setContent {
            NoirTheme {
                PelisPlayer(req, PelisApi.get(this), fullscreen = true, tv = true, onReady = { p, v -> player = p; view = v })
            }
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val p = player; val v = view
        if (p != null && v != null && event.action == KeyEvent.ACTION_DOWN && !live) {
            val controlsHidden = !v.isControllerFullyVisible
            when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> if (controlsHidden) {
                    p.seekTo(GestureMath.seek(p.currentPosition, p.duration, event.keyCode == KeyEvent.KEYCODE_DPAD_RIGHT))
                    v.showController()
                    return true
                }
                KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, KeyEvent.KEYCODE_MEDIA_REWIND -> {
                    p.seekTo(GestureMath.seek(p.currentPosition, p.duration, event.keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD, 30_000))
                    v.showController()
                    return true
                }
                KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> if (controlsHidden) {
                    if (p.isPlaying) p.pause() else p.play()
                    v.showController()
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }
}
