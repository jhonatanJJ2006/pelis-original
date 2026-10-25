package pro.verpelis.tv

import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.navigation.compose.rememberNavController
import pro.verpelis.tv.ui.components.ApkUpdateHost
import pro.verpelis.tv.ui.navigation.PelisTvNavHost
import pro.verpelis.tv.ui.splash.SplashOverlay
import pro.verpelis.tv.ui.theme.PelisTvTheme

class MainActivity : ComponentActivity() {
    /** Intro visible: solo en arranque en frío (una vez por proceso, nunca al volver de segundo plano). */
    private var showSplash by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as PelisTvApp
        if (savedInstanceState == null && !app.splashShown) {
            app.splashShown = true
            showSplash = true
        }
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
                    Box {
                        ApkUpdateHost {
                            PelisTvNavHost(
                                navController = navController,
                                startDestination = start,
                                debugPlayUrl = if (BuildConfig.DEBUG) intent?.getStringExtra("pelis.debugPlayUrl") else null,
                            )
                        }
                        if (showSplash) {
                            SplashOverlay(
                                playSound = app.soundPreferences.soundsEnabled,
                                onFinished = { showSplash = false },
                            )
                        }
                    }
                }
            }
        }
    }

    /** Cualquier tecla del control salta la intro (y no llega al inicio que está debajo). */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (showSplash) {
            if (event.action == KeyEvent.ACTION_UP) {
                android.util.Log.i("PelisSplash", "intro skipped by key ${event.keyCode}")
                showSplash = false
            }
            return true
        }
        return super.dispatchKeyEvent(event)
    }
}
