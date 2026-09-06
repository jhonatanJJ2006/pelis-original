package pro.verpelis.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import androidx.navigation.compose.rememberNavController
import pro.verpelis.tv.ui.navigation.PelisTvNavHost
import pro.verpelis.tv.ui.theme.PelisTvTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as PelisTvApp
        setContent {
            PelisTvTheme {
                CompositionLocalProvider(
                    LocalSessionStore provides app.sessionStore,
                    LocalSoundPreferences provides app.soundPreferences,
                    LocalUiSounds provides app.uiSounds,
                    LocalApiClient provides app.apiClient,
                    LocalUpdateStore provides app.updateStore,
                ) {
                    val navController = rememberNavController()
                    val start = if (app.sessionStore.hasSession()) {
                        pro.verpelis.tv.ui.navigation.Routes.Home
                    } else {
                        pro.verpelis.tv.ui.navigation.Routes.Login
                    }
                    PelisTvNavHost(navController = navController, startDestination = start)
                }
            }
        }
    }
}
