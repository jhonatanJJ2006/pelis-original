package pro.verpelis.phone

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import pro.verpelis.core.ui.NoirTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NoirTheme { PhoneApp(intent.getStringExtra("start") ?: "home") } }
    }
}
