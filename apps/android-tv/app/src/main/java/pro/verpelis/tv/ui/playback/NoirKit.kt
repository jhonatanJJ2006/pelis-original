package pro.verpelis.tv.ui.playback

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pro.verpelis.tv.ui.login.LocalMnFocusSound
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText

/** Iconos del reproductor/ficha dibujados en Canvas (la app no trae material-icons). */
enum class NoirIcon { Play, Pause, Back10, Forward10, Subtitles, Quality, Check, Restart, ArrowLeft }

@Composable
fun NoirGlyph(icon: NoirIcon, modifier: Modifier = Modifier, color: Color = Mn.Text, size: Dp = 12.dp) {
    Canvas(modifier.size(size)) {
        val w = this.size.width
        val s = Stroke(width = w * 0.09f, cap = StrokeCap.Round)
        when (icon) {
            NoirIcon.Play -> drawPath(
                Path().apply { moveTo(w * 0.26f, w * 0.14f); lineTo(w * 0.86f, w * 0.5f); lineTo(w * 0.26f, w * 0.86f); close() },
                color,
            )
            NoirIcon.Pause -> {
                drawRoundRect(color, Offset(w * 0.22f, w * 0.14f), Size(w * 0.2f, w * 0.72f), CornerRadius(w * 0.04f))
                drawRoundRect(color, Offset(w * 0.58f, w * 0.14f), Size(w * 0.2f, w * 0.72f), CornerRadius(w * 0.04f))
            }
            NoirIcon.Back10, NoirIcon.Forward10, NoirIcon.Restart -> {
                val fwd = icon == NoirIcon.Forward10
                drawArc(color, if (fwd) 300f else -60f, if (fwd) -300f else 300f, false, Offset(w * 0.14f, w * 0.14f), Size(w * 0.72f, w * 0.72f), style = s)
                val tip = if (fwd) Offset(w * 0.68f, w * 0.12f) else Offset(w * 0.32f, w * 0.12f)
                val dir = if (fwd) -1f else 1f
                drawLine(color, tip, Offset(tip.x + dir * w * 0.16f, tip.y - w * 0.04f), s.width, StrokeCap.Round)
                drawLine(color, tip, Offset(tip.x + dir * w * 0.1f, tip.y + w * 0.14f), s.width, StrokeCap.Round)
                if (icon != NoirIcon.Restart) drawCircle(color, w * 0.06f, Offset(w * 0.5f, w * 0.5f))
            }
            NoirIcon.Subtitles -> {
                drawRoundRect(color, Offset(w * 0.08f, w * 0.2f), Size(w * 0.84f, w * 0.6f), CornerRadius(w * 0.1f), style = s)
                drawLine(color, Offset(w * 0.24f, w * 0.44f), Offset(w * 0.5f, w * 0.44f), s.width, StrokeCap.Round)
                drawLine(color, Offset(w * 0.58f, w * 0.44f), Offset(w * 0.76f, w * 0.44f), s.width, StrokeCap.Round)
                drawLine(color, Offset(w * 0.24f, w * 0.6f), Offset(w * 0.4f, w * 0.6f), s.width, StrokeCap.Round)
                drawLine(color, Offset(w * 0.48f, w * 0.6f), Offset(w * 0.76f, w * 0.6f), s.width, StrokeCap.Round)
            }
            NoirIcon.Quality -> {
                listOf(0.26f, 0.5f, 0.74f).forEachIndexed { i, y ->
                    drawLine(color, Offset(w * 0.1f, w * y), Offset(w * 0.9f, w * y), s.width, StrokeCap.Round)
                    val x = listOf(0.66f, 0.34f, 0.58f)[i]
                    drawCircle(Mn.Bg, w * 0.1f, Offset(w * x, w * y))
                    drawCircle(color, w * 0.1f, Offset(w * x, w * y), style = s)
                }
            }
            NoirIcon.Check -> {
                drawLine(color, Offset(w * 0.18f, w * 0.52f), Offset(w * 0.42f, w * 0.76f), s.width * 1.3f, StrokeCap.Round)
                drawLine(color, Offset(w * 0.42f, w * 0.76f), Offset(w * 0.84f, w * 0.26f), s.width * 1.3f, StrokeCap.Round)
            }
            NoirIcon.ArrowLeft -> {
                drawLine(color, Offset(w * 0.16f, w * 0.5f), Offset(w * 0.84f, w * 0.5f), s.width, StrokeCap.Round)
                drawLine(color, Offset(w * 0.16f, w * 0.5f), Offset(w * 0.42f, w * 0.24f), s.width, StrokeCap.Round)
                drawLine(color, Offset(w * 0.16f, w * 0.5f), Offset(w * 0.42f, w * 0.76f), s.width, StrokeCap.Round)
            }
        }
    }
}

/** Halo dorado + escala al recibir foco (lenguaje de los diseños Stitch TV). */
fun Modifier.noirFocus(focused: Boolean, shape: RoundedCornerShape, scale: Float = 1.04f): Modifier =
    this
        .graphicsLayer { val k = if (focused) scale else 1f; scaleX = k; scaleY = k }
        .drawBehind {
            if (focused) {
                val g = 5.dp.toPx()
                drawRoundRect(
                    Mn.Gold.copy(alpha = 0.2f), Offset(-g, -g), Size(size.width + 2 * g, size.height + 2 * g),
                    CornerRadius(shape.topStart.toPx(size, this) + g),
                )
            }
        }

/**
 * Botón de la ficha / reproductor. primary = dorado lleno (Reproducir);
 * el resto, contorno oscuro que se vuelve dorado con el foco.
 */
@Composable
fun NoirButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: NoirIcon? = null,
    primary: Boolean = false,
    selected: Boolean = false,
    enabled: Boolean = true,
    focusRequester: FocusRequester? = null,
    onFocus: (Boolean) -> Unit = {},
) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    val bg = when {
        primary && !enabled -> Mn.GoldDeep.copy(alpha = 0.45f)
        primary -> if (focused) Mn.GoldLight else Mn.Gold
        focused -> Mn.Gold
        selected -> Mn.Gold.copy(alpha = 0.14f)
        else -> Mn.Lowest.copy(alpha = 0.82f)
    }
    val fg = when {
        primary || focused -> Mn.OnGold
        selected -> Mn.Gold
        else -> Mn.Text
    }
    Row(
        modifier
            .let { if (focusRequester != null) it.focusRequester(focusRequester) else it }
            .onFocusChanged {
                if (it.isFocused && !focused) sound()
                focused = it.isFocused
                onFocus(it.isFocused)
            }
            .noirFocus(focused, shape)
            .clip(shape)
            .background(bg)
            .border(
                if (focused) 2.dp else 1.dp,
                when {
                    focused && primary -> Color.White.copy(alpha = 0.85f)
                    focused -> Mn.GoldLight
                    primary -> Mn.Gold
                    selected -> Mn.Gold.copy(alpha = 0.6f)
                    else -> Mn.OutlineVar
                },
                shape,
            )
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick)
            .padding(horizontal = if (primary) 18.dp else 12.dp, vertical = if (primary) 9.dp else 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            NoirGlyph(icon, color = fg, size = if (primary) 11.dp else 10.dp)
            Spacer(Modifier.width(8.dp))
        }
        // key(label): al cambiar el texto (Reproducir → Continuar) se vuelve a medir; si no, a veces se cortaba la última letra.
        androidx.compose.runtime.key(label) {
            MnText(label, color = fg, size = if (primary) 10.sp else 9.sp, weight = FontWeight.SemiBold, spacing = 0.6.sp, lines = 1)
        }
    }
}

@Composable
fun NoirBadge(text: String, gold: Boolean = false, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(2.dp)
    Box(
        modifier
            .clip(shape)
            .background(if (gold) Mn.Gold.copy(alpha = 0.1f) else Mn.Lowest.copy(alpha = 0.7f))
            .border(1.dp, if (gold) Mn.Gold.copy(alpha = 0.55f) else Mn.OutlineVar, shape)
            .padding(horizontal = 7.dp, vertical = 3.dp),
    ) {
        MnText(text.uppercase(), color = if (gold) Mn.Gold else Mn.Variant, size = 7.sp, weight = FontWeight.SemiBold, spacing = 1.2.sp, lines = 1)
    }
}

/** Tecla del control + acción ("OK Seleccionar"), arriba a la derecha como en Stitch. */
@Composable
fun NoirKeyHint(key: String, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.clip(RoundedCornerShape(2.dp)).background(Mn.High).border(1.dp, Mn.OutlineVar, RoundedCornerShape(2.dp))
                .padding(horizontal = 5.dp, vertical = 2.dp),
        ) { MnText(key, color = Mn.Text, size = 7.sp, family = Mn.Mono, weight = FontWeight.Bold) }
        Spacer(Modifier.width(6.dp))
        MnText(label, color = Mn.Outline, size = 7.5.sp)
    }
}

/** Indicador de carga dorado (sin material3 en la app TV). */
@Composable
fun NoirSpinner(modifier: Modifier = Modifier, size: Dp = 36.dp) {
    val t = rememberInfiniteTransition(label = "spin")
    val angle by t.animateFloat(0f, 360f, infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Restart), label = "angle")
    Canvas(modifier.size(size)) {
        val stroke = Stroke(width = this.size.width * 0.08f, cap = StrokeCap.Round)
        drawArc(Mn.Highest, 0f, 360f, false, style = stroke)
        drawArc(Mn.Gold, angle, 100f, false, style = stroke)
    }
}

@Composable
fun NoirDivider(modifier: Modifier = Modifier) {
    Box(modifier.padding(horizontal = 6.dp).size(width = 1.dp, height = 10.dp).background(Mn.OutlineVar))
}
