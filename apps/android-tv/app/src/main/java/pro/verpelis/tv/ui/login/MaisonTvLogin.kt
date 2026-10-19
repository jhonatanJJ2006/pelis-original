package pro.verpelis.tv.ui.login

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.util.Calendar
import java.util.TimeZone

/*
 * Pantalla de inicio de sesión TV "Maison Noir" (Google Stitch, proyecto PELIS Rediseño,
 * pantalla fe4203145f55480985b6537208384423 "PELIS - Iniciar sesión (Android TV 10-Foot)").
 * Panel izquierdo: vincular con el teléfono (QR + código + pasos). Panel derecho: correo y
 * contraseña. Todo navegable con D-pad: foco con borde dorado, halo y escala; los campos de
 * texto solo abren el teclado al pulsar OK ("Presiona [OK] para escribir").
 *
 * Archivo idéntico en apps/android-tv y apps/android-native/tv (solo cambia el package).
 */

/** Paleta Maison Noir del diseño de Stitch. */
object Mn {
    val Bg = Color(0xFF131315)
    val Lowest = Color(0xFF0E0E10)
    val Low = Color(0xFF1C1B1D)
    val Container = Color(0xFF201F21)
    val High = Color(0xFF2A2A2C)
    val Highest = Color(0xFF353437)
    val Gold = Color(0xFFE5C276)
    val GoldLight = Color(0xFFFFDF9C)
    val GoldDeep = Color(0xFFC4A35A)
    val OnGold = Color(0xFF3F2E00)
    val Text = Color(0xFFE5E1E4)
    val Variant = Color(0xFFD0C5B4)
    val Outline = Color(0xFF999080)
    val OutlineVar = Color(0xFF4D4639)
    val Error = Color(0xFFFFB4AB)
    val Live = Color(0xFF4ADE80)
    val Serif = FontFamily.Serif
    val Sans = FontFamily.SansSerif
    val Mono = FontFamily.Monospace
}

/** Sonido de foco opcional (la app TV lo conecta a sus UiSounds). */
val LocalMnFocusSound = compositionLocalOf<() -> Unit> { {} }

@Composable
fun MnText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Mn.Text,
    size: TextUnit = 12.sp,
    family: FontFamily = Mn.Sans,
    weight: FontWeight = FontWeight.Normal,
    spacing: TextUnit = 0.sp,
    lines: Int = Int.MAX_VALUE,
    decoration: TextDecoration? = null,
) {
    BasicText(
        text = text,
        modifier = modifier,
        maxLines = lines,
        overflow = TextOverflow.Ellipsis,
        style = TextStyle(
            color = color, fontSize = size, fontFamily = family, fontWeight = weight,
            letterSpacing = spacing, lineHeight = size * 1.4f, textDecoration = decoration,
        ),
    )
}

enum class MnIcon { Clapper, Phone, Remote, Clock, Refresh, Mail, Lock, Globe, Keyboard, Scan }

/** Iconos lineales sencillos dibujados en Canvas (la app TV no incluye material-icons). */
@Composable
fun MnGlyph(icon: MnIcon, modifier: Modifier = Modifier, color: Color = Mn.Gold, size: Dp = 12.dp) {
    Canvas(modifier.size(size)) {
        val w = this.size.width
        val s = Stroke(width = w * 0.09f)
        val r = CornerRadius(w * 0.12f)
        when (icon) {
            MnIcon.Clapper -> {
                drawRoundRect(color, Offset(w * 0.12f, w * 0.38f), Size(w * 0.76f, w * 0.5f), r, style = s)
                drawRoundRect(color, Offset(w * 0.12f, w * 0.16f), Size(w * 0.76f, w * 0.16f), r)
            }
            MnIcon.Phone -> {
                drawRoundRect(color, Offset(w * 0.28f, w * 0.08f), Size(w * 0.44f, w * 0.84f), r, style = s)
                drawCircle(color, w * 0.05f, Offset(w * 0.5f, w * 0.78f))
            }
            MnIcon.Remote -> {
                drawRoundRect(color, Offset(w * 0.32f, w * 0.06f), Size(w * 0.36f, w * 0.88f), r, style = s)
                drawCircle(color, w * 0.08f, Offset(w * 0.5f, w * 0.3f), style = s)
                drawCircle(color, w * 0.04f, Offset(w * 0.5f, w * 0.6f))
            }
            MnIcon.Clock -> {
                drawCircle(color, w * 0.4f, style = s)
                drawLine(color, Offset(w * 0.5f, w * 0.5f), Offset(w * 0.5f, w * 0.24f), s.width)
                drawLine(color, Offset(w * 0.5f, w * 0.5f), Offset(w * 0.68f, w * 0.6f), s.width)
            }
            MnIcon.Refresh -> {
                drawArc(color, 30f, 280f, false, Offset(w * 0.14f, w * 0.14f), Size(w * 0.72f, w * 0.72f), style = s)
                drawCircle(color, w * 0.08f, Offset(w * 0.82f, w * 0.34f))
            }
            MnIcon.Mail -> {
                drawRoundRect(color, Offset(w * 0.08f, w * 0.2f), Size(w * 0.84f, w * 0.6f), r, style = s)
                drawLine(color, Offset(w * 0.1f, w * 0.24f), Offset(w * 0.5f, w * 0.52f), s.width)
                drawLine(color, Offset(w * 0.9f, w * 0.24f), Offset(w * 0.5f, w * 0.52f), s.width)
            }
            MnIcon.Lock -> {
                drawRoundRect(color, Offset(w * 0.18f, w * 0.44f), Size(w * 0.64f, w * 0.46f), r, style = s)
                drawArc(color, 180f, 180f, false, Offset(w * 0.3f, w * 0.14f), Size(w * 0.4f, w * 0.5f), style = s)
            }
            MnIcon.Globe -> {
                drawCircle(color, w * 0.4f, style = s)
                drawLine(color, Offset(w * 0.1f, w * 0.5f), Offset(w * 0.9f, w * 0.5f), s.width)
                drawOval(color, Offset(w * 0.32f, w * 0.1f), Size(w * 0.36f, w * 0.8f), style = s)
            }
            MnIcon.Keyboard -> {
                drawRoundRect(color, Offset(w * 0.06f, w * 0.24f), Size(w * 0.88f, w * 0.52f), r, style = s)
                drawLine(color, Offset(w * 0.28f, w * 0.62f), Offset(w * 0.72f, w * 0.62f), s.width)
            }
            MnIcon.Scan -> {
                val l = w * 0.28f
                listOf(Offset(0.1f, 0.1f), Offset(0.9f, 0.1f), Offset(0.1f, 0.9f), Offset(0.9f, 0.9f)).forEach { (x, y) ->
                    val p = Offset(x * w, y * w)
                    drawLine(color, p, Offset(p.x + if (x < 0.5f) l else -l, p.y), s.width)
                    drawLine(color, p, Offset(p.x, p.y + if (y < 0.5f) l else -l), s.width)
                }
            }
        }
    }
}

/** Raíz de la pantalla: cabecera, dos paneles y barra de ayudas del control remoto. */
@Composable
fun MnTvLoginFrame(
    versionName: String,
    host: String,
    content: @Composable RowScope.() -> Unit,
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(Mn.Bg)
            .drawBehind {
                drawRect(Brush.radialGradient(listOf(Mn.Gold.copy(alpha = 0.06f), Color.Transparent), center = Offset(size.width * 0.15f, 0f), radius = size.width * 0.6f))
                drawRect(Brush.verticalGradient(listOf(Color.Transparent, Mn.Lowest.copy(alpha = 0.7f)), startY = size.height * 0.6f))
            }
            .padding(horizontal = 40.dp, vertical = 22.dp),
    ) {
        Column(Modifier.fillMaxSize()) {
            MnHeader(host)
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(18.dp), content = content)
            Spacer(Modifier.height(14.dp))
            MnHintBar(versionName)
        }
    }
}

@Composable
private fun MnHeader(host: String) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(15_000); now = System.currentTimeMillis() } }
    val cal = Calendar.getInstance().apply { timeInMillis = now }
    val clock = "%02d:%02d".format(cal.get(Calendar.HOUR_OF_DAY), cal.get(Calendar.MINUTE))
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(30.dp).clip(RoundedCornerShape(4.dp)).background(Mn.High).border(1.dp, Mn.OutlineVar, RoundedCornerShape(4.dp)),
            contentAlignment = Alignment.Center,
        ) { MnGlyph(MnIcon.Clapper, size = 16.dp) }
        Spacer(Modifier.width(12.dp))
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                pro.verpelis.tv.ui.components.PelisLogo(22.sp, 2.sp)
            }
            MnText("Android TV", color = Mn.Outline, size = 7.5.sp, spacing = 1.2.sp)
        }
        Spacer(Modifier.weight(1f))
        Row(
            Modifier.clip(RoundedCornerShape(6.dp)).background(Mn.Lowest).border(1.dp, Mn.Highest, RoundedCornerShape(6.dp)).padding(horizontal = 12.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(5.dp).clip(CircleShape).background(Mn.Live))
            Spacer(Modifier.width(6.dp))
            MnText(host, color = Mn.Variant, size = 8.sp, spacing = 1.sp, weight = FontWeight.Medium)
            Box(Modifier.padding(horizontal = 10.dp).width(1.dp).height(12.dp).background(Mn.Highest))
            MnGlyph(MnIcon.Clock, color = Mn.Variant, size = 11.dp)
            Spacer(Modifier.width(6.dp))
            MnText(clock, color = Mn.Text, size = 11.sp, family = Mn.Mono, weight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun MnHintBar(versionName: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        MnHint("◀ ▶", "Cambiar panel")
        MnHint("OK", "Seleccionar", gold = true)
        MnHint("Atrás", "Salir")
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.clip(RoundedCornerShape(2.dp)).background(Mn.High).border(1.dp, Mn.OutlineVar, RoundedCornerShape(2.dp)).padding(horizontal = 5.dp, vertical = 2.dp)) {
                MnGlyph(MnIcon.Keyboard, color = Mn.Outline, size = 10.dp)
            }
            Spacer(Modifier.width(7.dp))
            MnText("Teclado en pantalla", color = Mn.Outline, size = 8.sp, spacing = 1.sp)
        }
        Spacer(Modifier.weight(1f))
        Box(Modifier.size(4.dp).clip(CircleShape).background(Mn.GoldDeep))
        MnText("v$versionName", color = Mn.Gold, size = 9.sp, family = Mn.Mono, weight = FontWeight.SemiBold)
    }
}

@Composable
private fun MnHint(key: String, label: String, gold: Boolean = false) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.clip(RoundedCornerShape(2.dp)).background(if (gold) Mn.Gold else Mn.High)
                .border(1.dp, if (gold) Mn.Gold else Mn.OutlineVar, RoundedCornerShape(2.dp)).padding(horizontal = 6.dp, vertical = 2.dp),
        ) { MnText(key, color = if (gold) Mn.OnGold else Mn.Variant, size = 8.sp, weight = FontWeight.Bold, spacing = 0.5.sp) }
        Spacer(Modifier.width(7.dp))
        MnText(label, color = if (gold) Mn.Text else Mn.Outline, size = 8.sp, spacing = 1.sp, weight = FontWeight.Medium)
    }
}

/**
 * Panel con línea dorada superior cuando contiene el foco. [left]/[right] fijan a dónde va el
 * D-pad al salir del panel (◀ ▶ CAMBIAR PANEL), en vez de la búsqueda geométrica por defecto.
 */
@Composable
fun RowScope.MnPanel(
    weight: Float,
    left: FocusRequester? = null,
    right: FocusRequester? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    var active by remember { mutableStateOf(false) }
    Box(
        Modifier
            .weight(weight)
            .fillMaxHeight()
            .focusProperties {
                if (left != null) this.left = left
                if (right != null) this.right = right
            }
            .onFocusChanged { active = it.hasFocus }
            .clip(RoundedCornerShape(6.dp))
            .background(Mn.Low)
            .border(1.dp, if (active) Mn.OutlineVar else Mn.Highest.copy(alpha = 0.7f), RoundedCornerShape(6.dp)),
    ) {
        Column(Modifier.fillMaxSize().padding(horizontal = 22.dp, vertical = 18.dp), content = content)
        if (active) {
            Box(Modifier.fillMaxWidth().height(2.dp).background(Brush.horizontalGradient(listOf(Color.Transparent, Mn.Gold, Mn.Gold.copy(alpha = 0.4f)))))
        }
    }
}

@Composable
fun MnEyebrow(icon: MnIcon, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        MnGlyph(icon, size = 12.dp)
        Spacer(Modifier.width(8.dp))
        MnText(text, color = Mn.Gold, size = 8.5.sp, weight = FontWeight.SemiBold, spacing = 1.6.sp)
    }
}

@Composable
fun MnTitle(text: String, subtitle: String) {
    Spacer(Modifier.height(6.dp))
    MnText(text, size = 27.sp, family = Mn.Serif, color = Mn.Text, lines = 1)
    Spacer(Modifier.height(4.dp))
    MnText(subtitle, size = 10.sp, color = Mn.Variant, lines = 2)
}

/** Estado de foco + halo dorado común a botones y campos. */
private fun Modifier.mnFocusRing(focused: Boolean, shape: RoundedCornerShape, scale: Float = 1.03f): Modifier =
    this
        .graphicsLayer { val k = if (focused) scale else 1f; scaleX = k; scaleY = k }
        .drawBehind {
            if (focused) {
                val g = 6.dp.toPx()
                drawRoundRect(
                    Mn.Gold.copy(alpha = 0.18f), Offset(-g, -g), Size(size.width + 2 * g, size.height + 2 * g),
                    CornerRadius(shape.topStart.toPx(size, this) + g),
                )
            }
        }

@Composable
fun MnQrCard(qr: ImageBitmap?, loading: Boolean, modifier: Modifier = Modifier, image: (@Composable () -> Unit)? = null) {
    Column(
        modifier.clip(RoundedCornerShape(6.dp)).background(Mn.Lowest).border(1.dp, Mn.Highest, RoundedCornerShape(6.dp)).padding(9.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(4.dp)).background(Color.White), contentAlignment = Alignment.Center) {
            if (image != null) {
                image()
            } else if (qr != null) {
                Image(qr, "Código QR para vincular la TV", Modifier.fillMaxSize().padding(8.dp), contentScale = ContentScale.Fit, filterQuality = FilterQuality.None)
            } else {
                MnText(if (loading) "Generando…" else "Sin código", color = Color(0xFF555555), size = 10.sp)
            }
        }
        Spacer(Modifier.height(7.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            MnGlyph(MnIcon.Scan, color = Mn.Outline, size = 9.dp)
            Spacer(Modifier.width(5.dp))
            MnText("CÁMARA iOS / ANDROID", color = Mn.Outline, size = 7.sp, spacing = 1.sp)
        }
    }
}

@Composable
fun MnCodeCard(code: String?, badge: String, host: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        MnText("O ingresa este código en tu navegador:", color = Mn.Variant, size = 7.5.sp, spacing = 1.sp, weight = FontWeight.Medium)
        Spacer(Modifier.height(6.dp))
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp))
                .background(Brush.linearGradient(listOf(Mn.High, Mn.Container)))
                .border(1.dp, Mn.GoldDeep.copy(alpha = 0.55f), RoundedCornerShape(4.dp))
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MnText(code ?: "······", color = Mn.Gold, size = 32.sp, family = Mn.Mono, weight = FontWeight.Bold, spacing = 3.sp, lines = 1, modifier = Modifier.weight(1f))
                Box(Modifier.clip(RoundedCornerShape(2.dp)).background(Mn.GoldDeep.copy(alpha = 0.25f)).border(1.dp, Mn.GoldDeep.copy(alpha = 0.6f), RoundedCornerShape(2.dp)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                    MnText(badge, color = Mn.Gold, size = 8.sp, weight = FontWeight.Bold, spacing = 1.sp)
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                MnGlyph(MnIcon.Globe, color = Mn.Variant, size = 9.dp)
                Spacer(Modifier.width(6.dp))
                MnText("URL directa: ", color = Mn.Outline, size = 7.5.sp, family = Mn.Mono)
                MnText("$host/link-tv", color = Mn.Text, size = 8.sp, family = Mn.Mono)
            }
        }
    }
}

@Composable
fun MnSteps(host: String, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf(
            "Abre la cámara o el navegador de tu teléfono" to null,
            "Escanea el código o visita " to "$host/link-tv",
            "Confirma el código y tu sesión iniciará automáticamente" to null,
        ).forEachIndexed { i, (text, link) ->
            Row(verticalAlignment = Alignment.Top) {
                Box(Modifier.size(15.dp).clip(CircleShape).background(Mn.High).border(1.dp, Mn.OutlineVar, CircleShape), contentAlignment = Alignment.Center) {
                    MnText("${i + 1}", color = Mn.Gold, size = 7.5.sp, weight = FontWeight.Bold)
                }
                Spacer(Modifier.width(9.dp))
                Row(Modifier.padding(top = 1.dp)) {
                    MnText(text, color = Mn.Text, size = 9.5.sp)
                    if (link != null) MnText(link, color = Mn.Gold, size = 9.5.sp)
                }
            }
        }
    }
}

/** Botón secundario con borde ("GENERAR NUEVO CÓDIGO"). */
@Composable
fun MnOutlineButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: MnIcon? = null, focusRequester: FocusRequester? = null) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    Row(
        modifier
            .let { if (focusRequester != null) it.focusRequester(focusRequester) else it }
            .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
            .mnFocusRing(focused, shape, 1.05f)
            .clip(shape)
            .background(if (focused) Mn.Gold else Mn.Lowest)
            .border(if (focused) 2.dp else 1.dp, if (focused) Mn.GoldLight else Mn.OutlineVar, shape)
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) { MnGlyph(icon, color = if (focused) Mn.OnGold else Mn.Text, size = 11.dp); Spacer(Modifier.width(8.dp)) }
        MnText(label, color = if (focused) Mn.OnGold else Mn.Text, size = 8.5.sp, weight = FontWeight.SemiBold, spacing = 1.2.sp)
    }
}

/** Botón principal dorado con la tecla [OK]. */
@Composable
fun MnPrimaryButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    Row(
        modifier
            .fillMaxWidth()
            .height(40.dp)
            .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
            .mnFocusRing(focused, shape)
            .clip(shape)
            .background(if (!enabled) Mn.GoldDeep.copy(alpha = 0.6f) else if (focused) Mn.GoldLight else Mn.Gold)
            .border(if (focused) 2.dp else 0.dp, if (focused) Color.White.copy(alpha = 0.85f) else Color.Transparent, shape)
            .clickable(remember { MutableInteractionSource() }, null, enabled = enabled, onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MnText(label, color = Mn.OnGold, size = 9.5.sp, weight = FontWeight.Bold, spacing = 1.4.sp)
        Spacer(Modifier.width(10.dp))
        Box(Modifier.clip(RoundedCornerShape(2.dp)).background(Mn.OnGold.copy(alpha = 0.14f)).border(1.dp, Mn.OnGold.copy(alpha = 0.3f), RoundedCornerShape(2.dp)).padding(horizontal = 5.dp, vertical = 1.dp)) {
            MnText("OK", color = Mn.OnGold, size = 7.5.sp, family = Mn.Mono, weight = FontWeight.Bold)
        }
    }
}

/** Enlace dorado enfocable ("Regístrate en verpelis.pro →"). */
@Composable
fun MnLink(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(3.dp)
    Box(
        modifier
            .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
            .mnFocusRing(focused, shape, 1.05f)
            .clip(shape)
            .background(if (focused) Mn.Gold.copy(alpha = 0.14f) else Color.Transparent)
            .border(if (focused) 1.5.dp else 0.dp, if (focused) Mn.Gold else Color.Transparent, shape)
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick)
            .padding(horizontal = 6.dp, vertical = 3.dp),
    ) {
        MnText(label, color = Mn.Gold, size = 9.sp, weight = FontWeight.SemiBold, decoration = if (focused) TextDecoration.Underline else null)
    }
}

/**
 * Campo de texto para TV: el D-pad lo enfoca sin abrir el teclado; OK empieza a escribir.
 * Arriba/abajo salen del campo; Atrás o la acción del teclado vuelven al modo enfoque.
 */
@Composable
fun MnInputField(
    label: String,
    icon: MnIcon,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    isPassword: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {},
    focusRequester: FocusRequester = remember { FocusRequester() },
) {
    val sound = LocalMnFocusSound.current
    val focusManager = LocalFocusManager.current
    val keyboard = LocalSoftwareKeyboardController.current
    val textFocus = remember { FocusRequester() }
    var boxFocused by remember { mutableStateOf(false) }
    var textFocused by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    val active = boxFocused || textFocused
    val shape = RoundedCornerShape(4.dp)
    var field by remember { mutableStateOf(TextFieldValue(value, TextRange(value.length))) }
    if (field.text != value) field = TextFieldValue(value, TextRange(value.length))

    LaunchedEffect(editing) {
        if (editing) {
            runCatching { textFocus.requestFocus() }
            keyboard?.show()
        }
    }
    fun stopEditing(move: FocusDirection? = null) {
        editing = false
        keyboard?.hide()
        runCatching { focusRequester.requestFocus() }
        if (move != null) focusManager.moveFocus(move)
    }

    Column(modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            MnGlyph(icon, color = if (active) Mn.Gold else Mn.Variant, size = 10.dp)
            Spacer(Modifier.width(6.dp))
            MnText(label, color = if (active) Mn.Gold else Mn.Variant, size = 9.sp, weight = FontWeight.Medium)
            Spacer(Modifier.weight(1f))
            if (active) {
                Box(Modifier.clip(RoundedCornerShape(2.dp)).background(Mn.High).border(1.dp, Mn.OutlineVar, RoundedCornerShape(2.dp)).padding(horizontal = 5.dp, vertical = 1.dp)) {
                    MnText(if (editing) "Escribiendo" else "En foco", color = Mn.Gold, size = 7.sp, weight = FontWeight.Bold, spacing = 1.sp)
                }
            } else {
                MnText("Presiona [OK] para escribir", color = Mn.Outline, size = 7.5.sp)
            }
        }
        Spacer(Modifier.height(5.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(40.dp)
                .focusRequester(focusRequester)
                .onFocusChanged { if (it.isFocused && !boxFocused) sound(); boxFocused = it.isFocused }
                .mnFocusRing(active, shape, 1.02f)
                .clip(shape)
                .background(if (active) Mn.High else Mn.Container)
                .border(if (active) 2.dp else 1.dp, if (active) Mn.Gold else Mn.OutlineVar, shape)
                .clickable(remember { MutableInteractionSource() }, null) { editing = true }
                .padding(horizontal = 12.dp),
            contentAlignment = Alignment.CenterStart,
        ) {
            BasicTextField(
                value = field,
                onValueChange = {
                    field = it
                    if (it.text != value) onValueChange(it.text)
                },
                singleLine = true,
                textStyle = TextStyle(color = Mn.Text, fontSize = 13.sp, fontFamily = Mn.Sans),
                cursorBrush = SolidColor(Mn.Gold),
                visualTransformation = if (isPassword) PasswordVisualTransformation('•') else VisualTransformation.None,
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction, autoCorrectEnabled = false),
                keyboardActions = KeyboardActions(onAny = {
                    stopEditing(if (imeAction == ImeAction.Next) FocusDirection.Down else null)
                    onImeAction()
                }),
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(textFocus)
                    .focusProperties { canFocus = editing }
                    .onFocusChanged {
                        textFocused = it.isFocused
                        if (!it.isFocused && editing) editing = false
                    }
                    .onPreviewKeyEvent { ev ->
                        when (ev.key) {
                            Key.DirectionDown, Key.DirectionUp -> {
                                if (ev.type == KeyEventType.KeyDown) stopEditing(if (ev.key == Key.DirectionDown) FocusDirection.Down else FocusDirection.Up)
                                true
                            }
                            Key.Back -> {
                                if (ev.type == KeyEventType.KeyUp) stopEditing()
                                true
                            }
                            // Con el teclado oculto: ◀ al inicio del texto o ▶ al final salen del campo.
                            Key.DirectionLeft, Key.DirectionRight -> {
                                val sel = field.selection
                                val atEdge = sel.collapsed &&
                                    if (ev.key == Key.DirectionLeft) sel.start == 0 else sel.end == field.text.length
                                if (atEdge && ev.type == KeyEventType.KeyDown) {
                                    stopEditing(if (ev.key == Key.DirectionLeft) FocusDirection.Left else FocusDirection.Right)
                                }
                                atEdge
                            }
                            else -> false
                        }
                    },
                decorationBox = { inner ->
                    if (value.isEmpty()) MnText(placeholder, color = Mn.Outline, size = 13.sp)
                    inner()
                },
            )
        }
    }
}

/** Divisor fino + fila inferior de un panel. */
@Composable
fun MnPanelFooter(content: @Composable RowScope.() -> Unit) {
    Box(Modifier.fillMaxWidth().height(1.dp).background(Mn.Highest))
    Spacer(Modifier.height(10.dp))
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, content = content)
}

@Composable
fun MnStatusLine(text: String, isError: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(5.dp).clip(CircleShape).background(if (isError) Mn.Error else Mn.Gold))
        Spacer(Modifier.width(7.dp))
        MnText(text, color = if (isError) Mn.Error else Mn.Variant, size = 9.sp, lines = 2)
    }
}

/** "El código caduca en 9:42 min" con cuenta atrás. */
@Composable
fun MnExpiry(expiresAtMillis: Long?) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(expiresAtMillis) { while (expiresAtMillis != null) { now = System.currentTimeMillis(); delay(1_000) } }
    Row(verticalAlignment = Alignment.CenterVertically) {
        MnGlyph(MnIcon.Clock, color = Mn.Gold, size = 11.dp)
        Spacer(Modifier.width(7.dp))
        if (expiresAtMillis == null) {
            MnText("Código de un solo uso", color = Mn.Variant, size = 9.sp)
        } else {
            val left = ((expiresAtMillis - now) / 1000).coerceAtLeast(0)
            MnText("El código caduca en ", color = Mn.Variant, size = 9.sp)
            MnText("%d:%02d min".format(left / 60, left % 60), color = Mn.Gold, size = 9.sp, family = Mn.Mono, weight = FontWeight.SemiBold)
        }
    }
}

/** ISO-8601 (`2026-10-18T03:00:00.000Z` o con offset) → epoch ms, sin java.time (minSdk 21). */
fun parseIsoMillis(value: String?): Long? {
    val m = Regex("""^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:?\d{2})?$""").find(value?.trim() ?: return null) ?: return null
    val g = m.groupValues
    val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
        clear()
        set(g[1].toInt(), g[2].toInt() - 1, g[3].toInt(), g[4].toInt(), g[5].toInt(), g[6].toInt())
    }
    val ms = g[7].takeIf { it.isNotEmpty() }?.padEnd(3, '0')?.take(3)?.toLong() ?: 0L
    val zone = g[8]
    val offsetMs = if (zone.isEmpty() || zone == "Z") 0L else {
        val digits = zone.substring(1).replace(":", "")
        val mins = digits.substring(0, 2).toLong() * 60 + digits.substring(2, 4).toLong()
        (if (zone[0] == '-') -1 else 1) * mins * 60_000
    }
    return cal.timeInMillis + ms - offsetMs
}
