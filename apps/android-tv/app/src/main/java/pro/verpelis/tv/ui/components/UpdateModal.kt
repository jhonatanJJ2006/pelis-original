package pro.verpelis.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun UpdateModal(
    versionName: String?,
    status: String?,
    busy: Boolean,
    onUpdate: () -> Unit,
    onLater: () -> Unit,
) {
    val uiSounds = LocalUiSounds.current
    val updateFocus = remember { FocusRequester() }
    val laterFocus = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        runCatching { updateFocus.requestFocus() }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaisonNoir.Background.copy(alpha = 0.72f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .widthIn(min = 420.dp, max = 640.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(MaisonNoir.Surface)
                .padding(28.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Nueva versión de Pelis TV", color = MaisonNoir.Gold)
            Text(
                text = if (versionName.isNullOrBlank()) {
                    "Hay una versión más nueva de Pelis TV."
                } else {
                    "Hay una versión más nueva de Pelis TV ($versionName)."
                },
                color = MaisonNoir.Chalk,
            )
            Text(
                "Actualizar descarga el APK y abre el instalador de Android. Tienes que confirmar; no se instala sola.",
                color = MaisonNoir.Silver,
            )
            if (!status.isNullOrBlank()) {
                Text(status, color = MaisonNoir.Chalk)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                TvFocusButton(
                    label = if (busy) "Descargando…" else "Actualizar",
                    onClick = {
                        if (busy) return@TvFocusButton
                        uiSounds.playClick()
                        onUpdate()
                    },
                    modifier = Modifier
                        .focusRequester(updateFocus)
                        .focusProperties {
                            up = updateFocus
                            down = laterFocus
                            left = updateFocus
                            right = laterFocus
                        },
                )
                TvFocusButton(
                    label = "Más tarde",
                    onClick = {
                        uiSounds.playClick()
                        onLater()
                    },
                    modifier = Modifier
                        .focusRequester(laterFocus)
                        .focusProperties {
                            up = updateFocus
                            down = laterFocus
                            left = updateFocus
                            right = laterFocus
                        },
                    focusedContainer = MaisonNoir.Elevated,
                    focusedContent = MaisonNoir.Chalk,
                    container = MaisonNoir.Background,
                )
            }
        }
    }
}
