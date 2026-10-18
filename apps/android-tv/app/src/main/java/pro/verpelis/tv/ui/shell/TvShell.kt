@file:OptIn(androidx.compose.ui.ExperimentalComposeUiApi::class)

package pro.verpelis.tv.ui.shell

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.focusRestorer
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.net.ConnectionCheck
import pro.verpelis.tv.data.tv.LocalTvRepository
import pro.verpelis.tv.data.tv.MeCache
import pro.verpelis.tv.data.tv.MeDto
import pro.verpelis.tv.ui.login.LocalMnFocusSound
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import java.util.Calendar

/** Secciones del menú lateral (diseño Stitch 10-Foot: P/NOIR + iconos). */
enum class NavSection(val label: String) {
    SEARCH("Buscar"),
    HOME("Inicio"),
    MOVIES("Películas"),
    SERIES("Series"),
    ANIME("Anime"),
    LIVE("TV en vivo"),
    MY_LIST("Mi lista"),
    PROFILE("Perfil"),
    SETTINGS("Ajustes"),
}

val RailWidth: Dp = 56.dp
private val RailExpanded: Dp = 196.dp

/**
 * Pantalla con menú lateral. El contenido empieza a [RailWidth]; al enfocar el menú se
 * despliega por encima (sin mover el contenido ni animar), y al volver con ▶ el foco
 * regresa al último elemento enfocado del contenido.
 */
@Composable
fun TvShell(
    section: NavSection,
    sections: List<NavSection>,
    onNavigate: (NavSection) -> Unit,
    content: @Composable () -> Unit,
) {
    val sounds = LocalUiSounds.current
    val repo = LocalTvRepository.current
    val session = LocalSessionStore.current
    var me by remember { mutableStateOf(MeCache.me) }
    LaunchedEffect(session.hasSession()) { if (session.hasSession()) me = MeCache.get(repo) }
    val requesters = remember(sections) { sections.associateWith { FocusRequester() } }
    var railFocused by remember { mutableStateOf(false) }
    // En Inicio, ATRÁS primero lleva al menú (como en Netflix); otra vez ATRÁS sale.
    BackHandler(enabled = section == NavSection.HOME && !railFocused) {
        runCatching { requesters[section]?.requestFocus() }
    }

    CompositionLocalProvider(LocalMnFocusSound provides { sounds.playFocus() }) {
        Box(Modifier.fillMaxSize().background(Mn.Bg)) {
            Box(Modifier.fillMaxSize().padding(start = RailWidth).focusRestorer()) { content() }
            TvNavRail(section, sections, me, requesters, { railFocused = it }, onNavigate)
        }
    }
}

@Composable
private fun TvNavRail(
    current: NavSection,
    sections: List<NavSection>,
    me: MeDto?,
    requesters: Map<NavSection, FocusRequester>,
    onFocus: (Boolean) -> Unit,
    onNavigate: (NavSection) -> Unit,
) {
    val sounds = LocalUiSounds.current
    val focusManager = LocalFocusManager.current
    var expanded by remember { mutableStateOf(false) }
    val main = sections.filter { it != NavSection.PROFILE && it != NavSection.SETTINGS }
    val bottom = sections.filter { it == NavSection.PROFILE || it == NavSection.SETTINGS }

    Column(
        Modifier
            .width(if (expanded) RailExpanded else RailWidth)
            .fillMaxHeight()
            .background(
                if (expanded) Brush.horizontalGradient(listOf(Mn.Lowest, Mn.Lowest.copy(alpha = 0.97f), Mn.Lowest.copy(alpha = 0.9f)))
                else Brush.horizontalGradient(listOf(Mn.Lowest, Mn.Lowest)),
            )
            .onFocusChanged { expanded = it.hasFocus; onFocus(it.hasFocus) }
            .focusProperties {
                // Al entrar con ◀ se enfoca la sección actual, no la más cercana.
                enter = { requesters[current] ?: FocusRequester.Default }
            }
            .focusGroup()
            .padding(vertical = 18.dp),
    ) {
        Column(Modifier.width(RailWidth), horizontalAlignment = Alignment.CenterHorizontally) {
            pro.verpelis.tv.ui.components.PelisMark(32.dp)
        }
        Spacer(Modifier.weight(1f))
        main.forEach { s ->
            RailItem(s, s == current, expanded, requesters.getValue(s), me) {
                sounds.playClick()
                if (s == current) focusManager.moveFocus(FocusDirection.Right) else onNavigate(s)
            }
        }
        Spacer(Modifier.weight(1f))
        bottom.forEach { s ->
            RailItem(s, s == current, expanded, requesters.getValue(s), me) {
                sounds.playClick()
                if (s == current) focusManager.moveFocus(FocusDirection.Right) else onNavigate(s)
            }
        }
    }
}

@Composable
private fun RailItem(
    section: NavSection,
    selected: Boolean,
    expanded: Boolean,
    requester: FocusRequester,
    me: MeDto?,
    onClick: () -> Unit,
) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val tint = when {
        focused -> Mn.OnGold
        selected -> Mn.Gold
        else -> Mn.Variant
    }
    Row(
        Modifier
            .padding(horizontal = 6.dp, vertical = 2.dp)
            .fillMaxWidth()
            .height(34.dp)
            .focusRequester(requester)
            .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
            .clip(RoundedCornerShape(4.dp))
            .background(if (focused) Mn.Gold else if (selected) Mn.Gold.copy(alpha = 0.10f) else Color.Transparent)
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(3.dp).height(18.dp).background(if (selected && !focused) Mn.Gold else Color.Transparent))
        Box(Modifier.width(RailWidth - 15.dp), contentAlignment = Alignment.Center) {
            if (section == NavSection.PROFILE && me != null) {
                Box(
                    Modifier.size(22.dp).clip(CircleShape).background(if (focused) Mn.OnGold else Mn.High)
                        .border(1.dp, if (selected) Mn.Gold else Mn.OutlineVar, CircleShape),
                    contentAlignment = Alignment.Center,
                ) { MnText(me.initials, color = if (focused) Mn.Gold else Mn.Text, size = 8.sp, weight = FontWeight.Bold) }
            } else {
                RailGlyph(section, tint, 16.dp)
            }
        }
        if (expanded) {
            MnText(
                if (section == NavSection.PROFILE && me != null) me.displayName.ifBlank { section.label } else section.label,
                color = if (focused) Mn.OnGold else if (selected) Mn.Gold else Mn.Text,
                size = 11.sp,
                weight = if (selected || focused) FontWeight.SemiBold else FontWeight.Normal,
                lines = 1,
            )
        }
    }
}

/** Iconos lineales dibujados (la app no incluye material-icons). */
@Composable
fun RailGlyph(section: NavSection, color: Color, size: Dp) {
    Canvas(Modifier.size(size)) {
        val w = this.size.width
        val s = Stroke(width = w * 0.09f)
        when (section) {
            NavSection.SEARCH -> {
                drawCircle(color, w * 0.3f, Offset(w * 0.42f, w * 0.42f), style = s)
                drawLine(color, Offset(w * 0.64f, w * 0.64f), Offset(w * 0.9f, w * 0.9f), s.width)
            }
            NavSection.HOME -> {
                val p = Path().apply {
                    moveTo(w * 0.12f, w * 0.48f); lineTo(w * 0.5f, w * 0.14f); lineTo(w * 0.88f, w * 0.48f)
                    moveTo(w * 0.22f, w * 0.4f); lineTo(w * 0.22f, w * 0.88f); lineTo(w * 0.78f, w * 0.88f); lineTo(w * 0.78f, w * 0.4f)
                }
                drawPath(p, color, style = s)
            }
            NavSection.MOVIES -> {
                drawRoundRect(color, Offset(w * 0.1f, w * 0.38f), Size(w * 0.8f, w * 0.5f), style = s)
                val p = Path().apply { moveTo(w * 0.1f, w * 0.3f); lineTo(w * 0.85f, w * 0.12f) }
                drawPath(p, color, style = s)
                drawLine(color, Offset(w * 0.35f, w * 0.38f), Offset(w * 0.45f, w * 0.24f), s.width)
                drawLine(color, Offset(w * 0.6f, w * 0.38f), Offset(w * 0.68f, w * 0.18f), s.width)
            }
            NavSection.SERIES -> {
                drawRoundRect(color, Offset(w * 0.1f, w * 0.26f), Size(w * 0.8f, w * 0.54f), style = s)
                drawLine(color, Offset(w * 0.22f, w * 0.14f), Offset(w * 0.78f, w * 0.14f), s.width)
                drawLine(color, Offset(w * 0.34f, w * 0.92f), Offset(w * 0.66f, w * 0.92f), s.width)
            }
            NavSection.ANIME -> {
                val p = Path().apply {
                    moveTo(w * 0.5f, w * 0.08f); lineTo(w * 0.62f, w * 0.38f); lineTo(w * 0.92f, w * 0.5f)
                    lineTo(w * 0.62f, w * 0.62f); lineTo(w * 0.5f, w * 0.92f); lineTo(w * 0.38f, w * 0.62f)
                    lineTo(w * 0.08f, w * 0.5f); lineTo(w * 0.38f, w * 0.38f); close()
                }
                drawPath(p, color, style = s)
            }
            NavSection.LIVE -> {
                drawRoundRect(color, Offset(w * 0.08f, w * 0.28f), Size(w * 0.84f, w * 0.58f), style = s)
                drawLine(color, Offset(w * 0.32f, w * 0.08f), Offset(w * 0.5f, w * 0.28f), s.width)
                drawLine(color, Offset(w * 0.68f, w * 0.08f), Offset(w * 0.5f, w * 0.28f), s.width)
                drawCircle(Color(0xFFE5484D), w * 0.08f, Offset(w * 0.76f, w * 0.44f))
            }
            NavSection.MY_LIST -> {
                val p = Path().apply {
                    moveTo(w * 0.24f, w * 0.1f); lineTo(w * 0.76f, w * 0.1f); lineTo(w * 0.76f, w * 0.9f)
                    lineTo(w * 0.5f, w * 0.7f); lineTo(w * 0.24f, w * 0.9f); close()
                }
                drawPath(p, color, style = s)
            }
            NavSection.PROFILE -> {
                drawCircle(color, w * 0.18f, Offset(w * 0.5f, w * 0.34f), style = s)
                drawArc(color, 200f, 140f, false, Offset(w * 0.16f, w * 0.58f), Size(w * 0.68f, w * 0.6f), style = s)
            }
            NavSection.SETTINGS -> {
                drawCircle(color, w * 0.16f, style = s)
                drawCircle(color, w * 0.34f, style = s)
                for (i in 0 until 8) {
                    val a = Math.toRadians(i * 45.0)
                    val c = Offset(w / 2, w / 2)
                    drawLine(
                        color,
                        Offset(c.x + (w * 0.34f * Math.cos(a)).toFloat(), c.y + (w * 0.34f * Math.sin(a)).toFloat()),
                        Offset(c.x + (w * 0.46f * Math.cos(a)).toFloat(), c.y + (w * 0.46f * Math.sin(a)).toFloat()),
                        s.width * 1.3f,
                    )
                }
            }
        }
    }
}

/**
 * Cabecera de pantalla: título serif (opcional) a la izquierda; a la derecha la sesión
 * (nombre real de users.me) y la hora. "Sin conexión" solo si Android confirma que no hay red.
 */
@Composable
fun TvHeader(
    title: String?,
    modifier: Modifier = Modifier,
    eyebrow: String? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var offline by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        while (true) {
            offline = ConnectionCheck.hasNetwork(context) == false
            now = System.currentTimeMillis()
            delay(30_000)
        }
    }
    val cal = Calendar.getInstance().apply { timeInMillis = now }
    val clock = "%02d:%02d".format(cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE))
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column {
            if (eyebrow != null) MnText(eyebrow, color = Mn.Gold, size = 8.sp, weight = FontWeight.SemiBold, spacing = 1.6.sp)
            if (title != null) MnText(title, color = Mn.Text, size = 22.sp, family = Mn.Serif, lines = 1)
            else pro.verpelis.tv.ui.components.PelisLogo(16.sp, 3.sp)
        }
        Spacer(Modifier.weight(1f))
        trailing?.invoke()
        if (offline) {
            Row(
                Modifier.padding(start = 10.dp).clip(RoundedCornerShape(10.dp)).background(Mn.Lowest.copy(alpha = 0.8f))
                    .border(1.dp, Mn.Error.copy(alpha = 0.5f), RoundedCornerShape(10.dp)).padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(5.dp).clip(CircleShape).background(Mn.Error))
                Spacer(Modifier.width(6.dp))
                MnText("Sin conexión", color = Mn.Error, size = 8.5.sp, weight = FontWeight.SemiBold)
            }
        }
        Spacer(Modifier.width(14.dp))
        MnText(clock, color = Mn.Gold, size = 14.sp, family = Mn.Serif)
    }
}

/** Chip informativo de la cabecera ("575 canales"). Solo con datos reales. */
@Composable
fun TvHeaderChip(text: String) {
    Box(
        Modifier.padding(start = 10.dp).clip(RoundedCornerShape(10.dp)).background(Mn.Lowest.copy(alpha = 0.7f))
            .border(1.dp, Mn.Highest, RoundedCornerShape(10.dp)).padding(horizontal = 10.dp, vertical = 4.dp),
    ) { MnText(text, color = Mn.Variant, size = 8.5.sp) }
}
