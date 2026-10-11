package pro.verpelis.phone

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import pro.verpelis.core.data.PelisApi
import pro.verpelis.core.player.PelisPlayer
import pro.verpelis.core.ui.NoirTheme
import pro.verpelis.core.ui.PlaybackIntent

/** Reproductor del celular: siempre horizontal y a pantalla completa (modo inmersivo). */
class PlayerActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        val req = PlaybackIntent.read(intent)
        val api = PelisApi.get(this)
        setContent { NoirTheme { PelisPlayer(req, api, fullscreen = true, tv = false) } }
    }
}
