package pro.verpelis.phone

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import kotlinx.coroutines.flow.MutableStateFlow
import pro.verpelis.core.ui.NoirTheme

/** Deep link pro.verpelis.app://auth/callback recibido del navegador (login con Google). */
object AuthCallback {
    val uri = MutableStateFlow<Uri?>(null)
}

class HomeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) handleAuthIntent(intent)
        setContent { NoirTheme { PhoneApp(intent.getStringExtra("start") ?: "home") } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleAuthIntent(intent)
    }

    private fun handleAuthIntent(intent: Intent?) {
        val data = intent?.data ?: return
        if (intent.action == Intent.ACTION_VIEW && data.scheme == "pro.verpelis.app") {
            AuthCallback.uri.value = data
            // No dejar el código en el intent (recreaciones / recientes).
            intent.data = null
        }
    }
}
