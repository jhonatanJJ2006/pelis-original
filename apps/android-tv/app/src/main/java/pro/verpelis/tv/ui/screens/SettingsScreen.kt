package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import kotlinx.coroutines.launch
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalSoundPreferences
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val sounds = LocalSoundPreferences.current
    val session = LocalSessionStore.current
    val uiSounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()
    var enabled by remember { mutableStateOf(sounds.soundsEnabled) }

    Column(
        modifier = Modifier.fillMaxSize().padding(48.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        TvFocusButton("Volver", {
            uiSounds.playClick()
            onBack()
        })
        Text("Ajustes", color = MaisonNoir.Gold)
        Text("Sonidos de foco y clic", color = MaisonNoir.Silver)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TvFocusButton(
                label = if (enabled) "Sonidos: sí" else "Sonidos: no",
                onClick = {
                    uiSounds.playClick()
                    val next = !enabled
                    enabled = next
                    scope.launch { sounds.setEnabled(next) }
                },
            )
            if (session.hasSession()) {
                TvFocusButton(
                    label = "Cerrar sesión",
                    onClick = {
                        uiSounds.playClick()
                        session.clear()
                    },
                    focusedContainer = MaisonNoir.Danger,
                    focusedContent = MaisonNoir.Chalk,
                )
            }
        }
        Text(
            "Pelis TV ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE}) · ${BuildConfig.API_BASE_URL}",
            color = MaisonNoir.Ash,
        )
    }
}
