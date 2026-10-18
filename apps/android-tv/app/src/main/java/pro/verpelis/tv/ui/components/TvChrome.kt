package pro.verpelis.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.net.ConnectionCheck
import pro.verpelis.tv.data.net.ConnectionStatus
import pro.verpelis.tv.ui.login.LocalMnFocusSound
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.playback.NoirIcon

/** Una tecla del control remoto y lo que hace en la pantalla actual. */
data class TvHint(val key: String, val label: String, val gold: Boolean = false)

object TvHints {
    val Select = TvHint("OK", "Seleccionar", gold = true)
    val Move = TvHint("◀ ▶ ▲ ▼", "Moverse")
    val Back = TvHint("ATRÁS", "Volver")
    val Exit = TvHint("ATRÁS", "Salir")
}

/** Barra inferior de ayudas del control remoto, compartida por todas las pantallas. */
@Composable
fun TvHintBar(
    hints: List<TvHint>,
    modifier: Modifier = Modifier,
    trailing: String? = "v${BuildConfig.VERSION_NAME}",
) {
    Row(
        modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        hints.forEach { h ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.clip(RoundedCornerShape(2.dp))
                        .background(if (h.gold) Mn.Gold else Mn.High)
                        .border(1.dp, if (h.gold) Mn.Gold else Mn.OutlineVar, RoundedCornerShape(2.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    MnText(h.key, color = if (h.gold) Mn.OnGold else Mn.Variant, size = 8.sp, weight = FontWeight.Bold, spacing = 0.5.sp)
                }
                Spacer(Modifier.width(7.dp))
                MnText(h.label, color = if (h.gold) Mn.Text else Mn.Outline, size = 8.5.sp, weight = FontWeight.Medium)
            }
        }
        Spacer(Modifier.weight(1f))
        if (trailing != null) MnText(trailing, color = Mn.Outline, size = 8.sp, spacing = 0.5.sp)
    }
}

/**
 * Estado de error de carga compartido (diseño Stitch "Error de Carga 10-Foot", con texto
 * claro y solo acciones reales): Reintentar + Ver estado de conexión (comprueba de verdad la
 * red y el servidor). Sin caché offline: la app no guarda contenido para verlo sin conexión.
 */
@Composable
fun TvLoadError(
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    title: String = "No pudimos cargar el contenido",
    message: String = "Revisa la conexión a internet de tu TV e inténtalo de nuevo.",
    detail: String? = null,
    eyebrow: String = "ERROR DE CARGA",
    showConnectionCheck: Boolean = true,
    retryFocus: FocusRequester = remember { FocusRequester() },
    extraActions: @Composable () -> Unit = {},
    hints: List<TvHint> = listOf(TvHints.Select, TvHints.Move, TvHints.Back),
) {
    val context = LocalContext.current
    val sounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()
    var offline by remember { mutableStateOf(ConnectionCheck.hasNetwork(context) == false) }
    var checking by remember { mutableStateOf(false) }
    var checkResult by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { runCatching { retryFocus.requestFocus() } }

    CompositionLocalProvider(LocalMnFocusSound provides { sounds.playFocus() }) {
        Column(modifier.fillMaxSize().background(Mn.Bg).padding(horizontal = 48.dp, vertical = 22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                pro.verpelis.tv.ui.components.PelisLogo(18.sp, 2.sp)
                Spacer(Modifier.weight(1f))
                if (offline) {
                    Row(
                        Modifier.clip(RoundedCornerShape(10.dp)).background(Mn.Lowest)
                            .border(1.dp, Mn.Error.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(5.dp).clip(CircleShape).background(Mn.Error))
                        Spacer(Modifier.width(6.dp))
                        MnText("Sin conexión", color = Mn.Error, size = 8.5.sp, weight = FontWeight.SemiBold)
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            Column(Modifier.widthIn(max = 560.dp)) {
                Row(
                    Modifier.clip(RoundedCornerShape(2.dp)).background(Mn.Error.copy(alpha = 0.12f))
                        .border(1.dp, Mn.Error.copy(alpha = 0.45f), RoundedCornerShape(2.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                ) { MnText(eyebrow, color = Mn.Error, size = 8.sp, weight = FontWeight.Bold, spacing = 1.5.sp) }
                Spacer(Modifier.height(12.dp))
                MnText(title, color = Mn.Text, size = 28.sp, family = Mn.Serif, lines = 2)
                Spacer(Modifier.height(8.dp))
                MnText(message, color = Mn.Variant, size = 11.sp, lines = 3)
                if (!detail.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    MnText("Detalle: $detail", color = Mn.Outline, size = 9.sp, lines = 2)
                }
                Spacer(Modifier.height(20.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    NoirButton("Reintentar", { sounds.playClick(); onRetry() }, icon = NoirIcon.Restart, primary = true, focusRequester = retryFocus)
                    if (showConnectionCheck) {
                        NoirButton(if (checking) "Revisando…" else "Ver estado de conexión", {
                            sounds.playClick()
                            if (checking) return@NoirButton
                            checking = true
                            checkResult = null
                            scope.launch {
                                val status = ConnectionCheck.run(context, BuildConfig.API_BASE_URL)
                                offline = status is ConnectionStatus.NoNetwork
                                checkResult = ConnectionCheck.describe(status)
                                checking = false
                            }
                        })
                    }
                    extraActions()
                }
                checkResult?.let {
                    Spacer(Modifier.height(12.dp))
                    MnText(it, color = Mn.Text, size = 10.sp, lines = 3)
                }
            }
            Spacer(Modifier.weight(1.3f))
            TvHintBar(hints)
        }
    }
}
