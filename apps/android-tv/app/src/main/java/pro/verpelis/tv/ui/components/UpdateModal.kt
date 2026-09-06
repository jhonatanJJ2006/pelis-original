package pro.verpelis.tv.ui.components

import android.content.Intent
import android.net.Uri
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun UpdateModal(
    versionName: String?,
    downloadUrl: String,
    onAccept: () -> Unit,
    onLater: () -> Unit,
) {
    val context = LocalContext.current
    val uiSounds = LocalUiSounds.current
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaisonNoir.Background.copy(alpha = 0.72f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .widthIn(min = 420.dp, max = 560.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(MaisonNoir.Surface)
                .padding(28.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Nueva versión de Pelis TV", color = MaisonNoir.Gold)
            Text(
                text = if (versionName.isNullOrBlank()) {
                    "Hay una APK nueva lista para instalar."
                } else {
                    "Hay una APK nueva ($versionName) lista para instalar."
                },
                color = MaisonNoir.Chalk,
            )
            Text(
                "Aceptar abre la descarga. Más tarde silencia esta versión.",
                color = MaisonNoir.Silver,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                TvFocusButton(
                    label = "Aceptar",
                    onClick = {
                        uiSounds.playClick()
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)))
                        onAccept()
                    },
                )
                TvFocusButton(
                    label = "Más tarde",
                    onClick = {
                        uiSounds.playClick()
                        onLater()
                    },
                    focusedContainer = MaisonNoir.Elevated,
                    focusedContent = MaisonNoir.Chalk,
                    container = MaisonNoir.Background,
                )
            }
        }
    }
}
