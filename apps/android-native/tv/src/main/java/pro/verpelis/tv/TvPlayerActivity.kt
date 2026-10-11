package pro.verpelis.tv

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import pro.verpelis.core.data.PelisApi
import pro.verpelis.core.player.PelisPlayer
import pro.verpelis.core.ui.NoirTheme
import pro.verpelis.core.ui.PlaybackIntent

/** Reproductor TV: los controles de PlayerView responden al D-pad (centro, izquierda/derecha para buscar). */
class TvPlayerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val req = PlaybackIntent.read(intent)
        setContent { NoirTheme { PelisPlayer(req, PelisApi.get(this), fullscreen = true, tv = true) } }
    }
}
