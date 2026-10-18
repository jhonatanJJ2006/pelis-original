package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
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
import pro.verpelis.tv.ui.theme.MaisonType

/** Ajustes Maison Noir: columna lateral de secciones + panel de detalle. */
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val sounds = LocalSoundPreferences.current
    val session = LocalSessionStore.current
    val uiSounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()
    var enabled by remember { mutableStateOf(sounds.soundsEnabled) }

    Row(modifier = Modifier.fillMaxSize().background(MaisonNoir.Background)) {
        Column(
            modifier = Modifier
                .width(320.dp)
                .fillMaxHeight()
                .background(MaisonNoir.Surface)
                .padding(horizontal = 32.dp, vertical = 40.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("PELIS", style = MaisonType.Title.copy(color = MaisonNoir.Gold))
            Text("AJUSTES", style = MaisonType.Eyebrow)
            Spacer(Modifier.height(24.dp))
            Text("Reproducción", style = MaisonType.Body.copy(color = MaisonNoir.Chalk))
            if (session.hasSession()) {
                Text("Cuenta", style = MaisonType.Body)
            }
            Text("Acerca de", style = MaisonType.Body)
            Spacer(Modifier.weight(1f))
            TvFocusButton("Volver", {
                uiSounds.playClick()
                onBack()
            })
        }

        Column(
            modifier = Modifier.weight(1f).fillMaxHeight().padding(56.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("CONFIGURACIÓN  /  ESTE TELEVISOR", style = MaisonType.Eyebrow.copy(color = MaisonNoir.Gold))
                Text("Ajustes", style = MaisonType.Display)
                Text(
                    "Reproducción, cuenta e información del equipo para tu sala.",
                    style = MaisonType.Body,
                )
            }

            SettingsPanel(title = "Reproducción", subtitle = "Sonidos de foco y clic") {
                TvFocusButton(
                    label = if (enabled) "Sonidos: sí" else "Sonidos: no",
                    onClick = {
                        uiSounds.playClick()
                        val next = !enabled
                        enabled = next
                        scope.launch { sounds.setEnabled(next) }
                    },
                )
            }

            if (session.hasSession()) {
                SettingsPanel(title = "Cuenta", subtitle = "Sesión iniciada en este televisor") {
                    TvFocusButton(
                        label = "Cerrar sesión",
                        onClick = {
                            uiSounds.playClick()
                            session.clear()
                            pro.verpelis.tv.data.tv.MeCache.clear()
                        },
                        focusedContainer = MaisonNoir.Danger,
                        focusedContent = MaisonNoir.Chalk,
                    )
                }
            }

            SettingsPanel(title = "Acerca de", subtitle = "Versión de la app") {
                Text(
                    "Pelis TV ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE}) · ${BuildConfig.API_BASE_URL}",
                    style = MaisonType.Meta,
                )
            }

            Spacer(Modifier.weight(1f))
            Row(horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                Text("▲▼  Navegar", style = MaisonType.Meta)
                Text("OK  Seleccionar", style = MaisonType.Meta)
                Text("BACK  Volver", style = MaisonType.Meta)
            }
        }
    }
}

@Composable
private fun SettingsPanel(
    title: String,
    subtitle: String,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = Modifier
            .border(1.dp, MaisonNoir.Border, RoundedCornerShape(4.dp))
            .background(MaisonNoir.Surface, RoundedCornerShape(4.dp))
            .padding(28.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(title, style = MaisonType.Title)
            Text(subtitle, style = MaisonType.Body)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { content() }
        }
    }
}
