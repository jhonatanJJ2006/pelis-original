package pro.verpelis.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.ui.theme.MaisonNoir
import pro.verpelis.tv.ui.theme.MaisonType

enum class UpdateMode {
    /** Actualización normal: descargar, verificar e instalar encima. */
    Update,

    /** La firma instalada no es la de release: hay que desinstalar una vez. */
    Reinstall,
}

@Composable
fun UpdateModal(
    versionName: String?,
    status: String?,
    busy: Boolean,
    progress: Int?,
    mode: UpdateMode,
    onUpdate: () -> Unit,
    onUninstall: () -> Unit,
    onLater: () -> Unit,
) {
    val uiSounds = LocalUiSounds.current
    val primaryFocus = remember { FocusRequester() }
    val laterFocus = remember { FocusRequester() }

    LaunchedEffect(mode) { runCatching { primaryFocus.requestFocus() } }

    val version = versionName?.takeIf { it.isNotBlank() }?.let { " $it" }.orEmpty()
    Box(
        modifier = Modifier.fillMaxSize().background(MaisonNoir.Background.copy(alpha = 0.82f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .widthIn(min = 460.dp, max = 640.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(MaisonNoir.Surface)
                .border(1.dp, MaisonNoir.Border, RoundedCornerShape(14.dp))
                .padding(32.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Actualización", style = MaisonType.Eyebrow)
            when (mode) {
                UpdateMode.Update -> {
                    Text("Nueva versión de Pelis TV$version", style = MaisonType.Title.copy(fontSize = 22.sp, color = MaisonNoir.Chalk))
                    Text(
                        "Se descarga, se verifica y se abre el instalador de Android. Tienes que confirmar; no se instala sola.",
                        color = MaisonNoir.Silver,
                    )
                }
                UpdateMode.Reinstall -> {
                    Text("Desinstala esta versión una vez e instala la nueva", style = MaisonType.Title.copy(fontSize = 22.sp, color = MaisonNoir.Chalk))
                    Text(
                        "Esta copia de Pelis TV está firmada con una clave antigua y Android no deja actualizarla " +
                            "encima (por eso aparecía «App no instalada»). Desinstálala con el botón de abajo y " +
                            "luego instala Pelis TV$version desde verpelis.pro/descargas. Solo hace falta una vez; " +
                            "después vuelves a entrar con el QR o tu email.",
                        color = MaisonNoir.Silver,
                    )
                }
            }
            if (busy && progress != null) {
                Box(Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)).background(MaisonNoir.Elevated)) {
                    Box(
                        Modifier
                            .fillMaxWidth(progress.coerceIn(0, 100) / 100f)
                            .height(4.dp)
                            .background(MaisonNoir.Gold),
                    )
                }
            }
            if (!status.isNullOrBlank()) {
                Text(status, color = MaisonNoir.Chalk)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(top = 6.dp)) {
                val primaryLabel = when {
                    mode == UpdateMode.Reinstall -> "Desinstalar"
                    busy -> if (progress != null) "Descargando… $progress%" else "Descargando…"
                    else -> "Actualizar"
                }
                TvFocusButton(
                    label = primaryLabel,
                    onClick = {
                        if (busy) return@TvFocusButton
                        uiSounds.playClick()
                        if (mode == UpdateMode.Reinstall) onUninstall() else onUpdate()
                    },
                    modifier = Modifier
                        .focusRequester(primaryFocus)
                        .focusProperties {
                            up = primaryFocus
                            down = primaryFocus
                            left = primaryFocus
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
                            up = laterFocus
                            down = laterFocus
                            left = primaryFocus
                            right = laterFocus
                        },
                    focusedContainer = MaisonNoir.Chalk,
                    focusedContent = MaisonNoir.Background,
                    container = MaisonNoir.Elevated,
                )
            }
        }
    }
}
