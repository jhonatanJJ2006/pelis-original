package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalSoundPreferences
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.net.ConnectionCheck
import pro.verpelis.tv.data.tv.MeCache
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.library.SectionLabel
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.shell.TvHeader

/** Ajustes reales de este televisor: sonidos, conexión, cuenta y versión. */
@Composable
fun SettingsScreen(onBack: () -> Unit, onNeedLogin: () -> Unit = {}) {
    val prefs = LocalSoundPreferences.current
    val session = LocalSessionStore.current
    val uiSounds = LocalUiSounds.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var soundsOn by remember { mutableStateOf(prefs.soundsEnabled) }
    var signedIn by remember { mutableStateOf(session.hasSession()) }
    var confirmOut by remember { mutableStateOf(false) }
    var checking by remember { mutableStateOf(false) }
    var check by remember { mutableStateOf<String?>(null) }
    val first = remember { FocusRequester() }
    LaunchedEffect(Unit) { runCatching { first.requestFocus() } }
    val me = MeCache.me

    Column(Modifier.fillMaxSize().padding(start = 32.dp, end = 32.dp, top = 18.dp, bottom = 14.dp)) {
        TvHeader(title = "Ajustes", eyebrow = "ESTE TELEVISOR")
        Spacer(Modifier.height(14.dp))
        Row(Modifier.weight(1f).padding(start = 6.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Panel("Sonidos", "Clic y cambio de foco al moverte con el control.") {
                    NoirButton(if (soundsOn) "Sonidos: activados" else "Sonidos: desactivados", {
                        uiSounds.playClick()
                        val next = !soundsOn
                        soundsOn = next
                        scope.launch { prefs.setEnabled(next) }
                    }, selected = soundsOn, focusRequester = first)
                }
                Panel("Conexión", "Comprueba la red del televisor y el servidor de Pelis.") {
                    NoirButton(if (checking) "Revisando…" else "Revisar conexión", {
                        uiSounds.playClick()
                        if (checking) return@NoirButton
                        checking = true
                        check = null
                        scope.launch {
                            check = ConnectionCheck.describe(ConnectionCheck.run(context, BuildConfig.API_BASE_URL))
                            checking = false
                        }
                    })
                    check?.let { Spacer(Modifier.height(8.dp)); MnText(it, color = Mn.Text, size = 10.sp, lines = 3) }
                }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Panel("Cuenta", if (signedIn) "Sesión iniciada en este televisor." else "No has iniciado sesión.") {
                    if (signedIn) {
                        if (me != null) {
                            MnText(me.displayName, color = Mn.Text, size = 12.sp, lines = 1)
                            me.email?.let { MnText(it, color = Mn.Variant, size = 9.sp, lines = 1) }
                            Spacer(Modifier.height(8.dp))
                        }
                        NoirButton(if (confirmOut) "Pulsa otra vez para salir" else "Cerrar sesión", {
                            uiSounds.playClick()
                            if (!confirmOut) { confirmOut = true; return@NoirButton }
                            session.clear()
                            MeCache.clear()
                            signedIn = false
                            confirmOut = false
                        }, selected = confirmOut, onFocus = { if (!it) confirmOut = false })
                    } else {
                        NoirButton("Iniciar sesión", { uiSounds.playClick(); onNeedLogin() }, primary = true)
                    }
                }
                Panel("Acerca de", "Pelis TV ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})") {
                    MnText("Servidor: " + BuildConfig.API_BASE_URL.removePrefix("https://"), color = Mn.Variant, size = 9.sp, lines = 1)
                    MnText("Nuevas versiones: verpelis.pro/descargas", color = Mn.Variant, size = 9.sp, lines = 1)
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        TvHintBar(listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú"), TvHints.Back))
    }
}

@Composable
private fun Panel(title: String, subtitle: String, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(8.dp)
    Column(Modifier.fillMaxWidth().clip(shape).background(Mn.Low).border(1.dp, Mn.OutlineVar, shape).padding(16.dp)) {
        SectionLabel(title)
        Spacer(Modifier.height(4.dp))
        MnText(subtitle, color = Mn.Variant, size = 10.sp, lines = 2)
        Spacer(Modifier.height(10.dp))
        content()
    }
}
