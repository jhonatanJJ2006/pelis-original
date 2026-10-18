package pro.verpelis.tv.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.tv.LocalTvRepository
import pro.verpelis.tv.data.tv.MeCache
import pro.verpelis.tv.data.tv.MeDto
import pro.verpelis.tv.data.tv.plans
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.playback.NoirGlyph
import pro.verpelis.tv.ui.playback.NoirIcon

/** Confirmación tras vincular el televisor (QR o correo): cuenta real de users.me y su plan. */
@Composable
fun LinkedScreen(onContinue: () -> Unit) {
    val repo = LocalTvRepository.current
    val sounds = LocalUiSounds.current
    var me by remember { mutableStateOf<MeDto?>(null) }
    var planName by remember { mutableStateOf<String?>(null) }
    var seconds by remember { mutableIntStateOf(10) }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        runCatching { focus.requestFocus() }
        me = MeCache.get(repo, force = true)
        val id = me?.planId
        if (id != null) planName = runCatching { repo.plans().firstOrNull { it.id == id }?.name }.getOrNull()
    }
    LaunchedEffect(Unit) {
        while (seconds > 0) { delay(1_000); seconds-- }
        onContinue()
    }
    Column(Modifier.fillMaxSize().background(Mn.Bg).padding(horizontal = 48.dp, vertical = 22.dp)) {
        MnText("PELIS", color = Mn.Gold, size = 18.sp, family = Mn.Serif, spacing = 2.sp)
        Box(Modifier.weight(1f).fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(Modifier.widthIn(max = 520.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier.size(64.dp).clip(CircleShape).background(Mn.Gold.copy(alpha = 0.12f)).border(2.dp, Mn.Gold, CircleShape),
                    contentAlignment = Alignment.Center,
                ) { NoirGlyph(NoirIcon.Check, color = Mn.Gold, size = 26.dp) }
                Spacer(Modifier.height(16.dp))
                SectionLabel("Televisor vinculado")
                Spacer(Modifier.height(6.dp))
                val user = me
                MnText(if (user != null) "Hola, ${user.displayName}" else "Listo", color = Mn.Text, size = 28.sp, family = Mn.Serif, lines = 1)
                Spacer(Modifier.height(6.dp))
                MnText("Este televisor ya tiene tu sesión iniciada.", color = Mn.Variant, size = 11.sp)
                if (user?.email != null) MnText(user.email, color = Mn.Outline, size = 9.5.sp)
                if (planName != null) {
                    Spacer(Modifier.height(6.dp))
                    MnText("Tu plan: $planName", color = Mn.Gold, size = 10.sp)
                }
                Spacer(Modifier.height(20.dp))
                NoirButton("Empezar a ver", { sounds.playClick(); onContinue() }, icon = NoirIcon.Play, primary = true, focusRequester = focus)
                Spacer(Modifier.height(10.dp))
                MnText("Seguimos solos en $seconds s", color = Mn.Outline, size = 8.5.sp)
            }
        }
        TvHintBar(listOf(TvHint("OK", "Empezar", gold = true)))
    }
}
