package pro.verpelis.tv.ui.login

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
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pro.verpelis.tv.R
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar

/*
 * Login TV estilo Netflix (Google Stitch "PELIS Rediseño", pantalla
 * 0e67b58f9e0f425fb7d8371c664dd76e). Fondo = un JPEG de 960x540 (~40 KB) con pósters
 * reales del catálogo ya oscurecidos; sin animaciones, apto para equipos con poca RAM.
 */

@Composable
fun NetflixLoginFrame(
    hints: List<TvHint>,
    trailing: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(Modifier.fillMaxSize().background(Mn.Bg)) {
        Image(
            painter = painterResource(R.drawable.tv_login_backdrop),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    0f to Mn.Bg.copy(alpha = 0.55f),
                    0.45f to Mn.Bg.copy(alpha = 0.72f),
                    1f to Mn.Lowest.copy(alpha = 0.95f),
                ),
            ),
        )
        Column(
            Modifier.fillMaxSize().padding(horizontal = 40.dp, vertical = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            pro.verpelis.tv.ui.components.PelisLogo(26.sp, 6.sp)
            MnText("Android TV", color = Mn.Outline, size = 7.5.sp, spacing = 2.sp)
            Spacer(Modifier.weight(0.7f))
            content()
            Spacer(Modifier.weight(1f))
            TvHintBar(hints, trailing = trailing)
        }
    }
}

/** Halo dorado + escala leve con el foco (sin animación). */
private fun Modifier.nxFocus(focused: Boolean, radius: Float): Modifier = drawBehind {
    if (focused) {
        val g = 6.dp.toPx()
        drawRoundRect(
            Mn.Gold.copy(alpha = 0.18f), Offset(-g, -g), Size(size.width + 2 * g, size.height + 2 * g),
            CornerRadius(radius + g),
        )
    }
}

@Composable
fun PhoneLoginCard(
    qr: ImageBitmap?,
    loading: Boolean,
    code: String?,
    host: String,
    status: String?,
    expiresAtMillis: Long?,
    focusRequester: FocusRequester,
    onRegenerate: () -> Unit,
) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(6.dp)
    Box {
        Column(
            Modifier
                .width(470.dp)
                .focusRequester(focusRequester)
                .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
                .nxFocus(focused, 6f)
                .clip(shape)
                .background(Mn.Low.copy(alpha = 0.94f))
                .border(if (focused) 3.dp else 2.dp, if (focused) Mn.GoldLight else Mn.Gold, shape)
                .clickable(remember { MutableInteractionSource() }, null, onClick = onRegenerate)
                .padding(horizontal = 20.dp, vertical = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                MnGlyph(MnIcon.Phone, size = 15.dp)
                Spacer(Modifier.width(8.dp))
                MnText("Usa tu celular", color = Mn.Text, size = 15.sp, family = Mn.Serif)
            }
            Spacer(Modifier.height(12.dp))
            Row {
                Box(
                    Modifier.size(150.dp).clip(RoundedCornerShape(4.dp)).background(Color.White),
                    contentAlignment = Alignment.Center,
                ) {
                    if (qr != null) {
                        Image(qr, "Código QR para vincular la TV", Modifier.fillMaxSize().padding(8.dp), contentScale = ContentScale.Fit, filterQuality = FilterQuality.None)
                    } else {
                        MnText(if (loading) "Generando…" else "Sin código", color = Color(0xFF555555), size = 10.sp)
                    }
                }
                Spacer(Modifier.width(18.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Step(1) { MnText("Escanea el código con la cámara de tu celular", color = Mn.Text, size = 10.sp) }
                    Step(2) {
                        Column {
                            Row {
                                MnText("O entra a ", color = Mn.Text, size = 10.sp)
                                MnText("$host/link-tv", color = Mn.Gold, size = 10.sp, weight = FontWeight.SemiBold)
                            }
                            MnText("y escribe este código:", color = Mn.Text, size = 10.sp)
                        }
                    }
                    Box(
                        Modifier.padding(start = 26.dp).clip(RoundedCornerShape(4.dp)).background(Mn.Lowest)
                            .border(1.dp, Mn.OutlineVar, RoundedCornerShape(4.dp)).padding(horizontal = 14.dp, vertical = 6.dp),
                    ) {
                        MnText(code ?: "······", color = Mn.Gold, size = 22.sp, family = Mn.Mono, weight = FontWeight.Bold, spacing = 4.sp, lines = 1)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(Mn.Highest))
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (status != null) {
                    MnStatusLine(status, isError = true)
                } else {
                    MnGlyph(MnIcon.Refresh, color = Mn.Gold, size = 10.dp)
                    Spacer(Modifier.width(6.dp))
                    MnText("El código se actualiza automáticamente", color = Mn.Variant, size = 8.5.sp)
                }
                Spacer(Modifier.weight(1f))
                if (focused) {
                    MnText("OK: generar otro código", color = Mn.Gold, size = 8.sp, weight = FontWeight.SemiBold)
                } else if (expiresAtMillis != null) {
                    MnExpiry(expiresAtMillis)
                }
            }
        }
        Row(
            Modifier.align(Alignment.TopEnd).offset(x = (-14).dp, y = (-7).dp)
                .clip(RoundedCornerShape(2.dp)).background(Mn.Gold).padding(horizontal = 7.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(4.dp).clip(CircleShape).background(Mn.OnGold))
            Spacer(Modifier.width(4.dp))
            MnText("Recomendado", color = Mn.OnGold, size = 7.sp, weight = FontWeight.Bold, spacing = 1.sp)
        }
    }
}

@Composable
private fun Step(n: Int, content: @Composable () -> Unit) {
    Row {
        Box(
            Modifier.size(17.dp).clip(CircleShape).background(Mn.High).border(1.dp, Mn.OutlineVar, CircleShape),
            contentAlignment = Alignment.Center,
        ) { MnText("$n", color = Mn.Gold, size = 8.sp, weight = FontWeight.Bold) }
        Spacer(Modifier.width(9.dp))
        Box(Modifier.padding(top = 1.dp)) { content() }
    }
}

/** Botón grande con borde ("Usar correo y contraseña"); dorado al tener el foco. */
@Composable
fun ChoiceButton(label: String, icon: MnIcon, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val sound = LocalMnFocusSound.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    Row(
        modifier
            .fillMaxWidth()
            .height(46.dp)
            .onFocusChanged { if (it.isFocused && !focused) sound(); focused = it.isFocused }
            .nxFocus(focused, 4f)
            .clip(shape)
            .background(if (focused) Mn.Gold else Mn.Lowest.copy(alpha = 0.85f))
            .border(if (focused) 2.dp else 1.dp, if (focused) Mn.GoldLight else Mn.Variant.copy(alpha = 0.7f), shape)
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MnGlyph(icon, color = if (focused) Mn.OnGold else Mn.Text, size = 12.dp)
        Spacer(Modifier.width(10.dp))
        MnText(label, color = if (focused) Mn.OnGold else Mn.Text, size = 11.sp, weight = FontWeight.SemiBold)
    }
}

/** Panel centrado para los formularios (correo, registro, verificación). */
@Composable
fun FormPanel(
    eyebrow: String,
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        Modifier.width(420.dp).clip(RoundedCornerShape(6.dp)).background(Mn.Low.copy(alpha = 0.95f))
            .border(1.dp, Mn.OutlineVar, RoundedCornerShape(6.dp)).padding(horizontal = 22.dp, vertical = 18.dp),
    ) {
        MnEyebrow(MnIcon.Remote, eyebrow)
        MnTitle(title, subtitle)
        Spacer(Modifier.height(14.dp))
        content()
    }
}
