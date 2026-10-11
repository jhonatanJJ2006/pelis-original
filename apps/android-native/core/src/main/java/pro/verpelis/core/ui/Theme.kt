package pro.verpelis.core.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.material3.Typography
import pro.verpelis.core.R
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Maison Noir tokens (ver DESIGN.md del rediseño). */
object Noir {
    val Ink = Color(0xFF0B0B0D)
    val Surface = Color(0xFF141417)
    val Raised = Color(0xFF1C1C21)
    val Gold = Color(0xFFC4A35A)
    val Burgundy = Color(0xFF7A1E2B)
    val Text = Color(0xFFF4F1EA)
    val Muted = Color(0xFF9C978C)
    val Line = Color(0xFF2A2A31)
    val Display = FontFamily(
        Font(R.font.fraunces_medium, FontWeight.Medium),
        Font(R.font.fraunces_semibold, FontWeight.SemiBold),
        Font(R.font.fraunces_bold, FontWeight.Bold),
    )
    val Ui = FontFamily(
        Font(R.font.inter_regular, FontWeight.Normal),
        Font(R.font.inter_medium, FontWeight.Medium),
        Font(R.font.inter_semibold, FontWeight.SemiBold),
    )
}

val NoirTitle = TextStyle(fontFamily = Noir.Display, fontWeight = FontWeight.SemiBold, fontSize = 28.sp, color = Noir.Text)
val NoirSection = TextStyle(fontFamily = Noir.Display, fontWeight = FontWeight.Medium, fontSize = 20.sp, color = Noir.Text)
val NoirBody = TextStyle(fontFamily = Noir.Ui, fontSize = 14.sp, color = Noir.Muted)
val NoirLabel = TextStyle(fontFamily = Noir.Ui, fontWeight = FontWeight.SemiBold, fontSize = 11.sp, letterSpacing = 1.2.sp, color = Noir.Muted)

private val base = Typography()
val NoirTypography = Typography(
    displayLarge = base.displayLarge.copy(fontFamily = Noir.Display),
    headlineLarge = base.headlineLarge.copy(fontFamily = Noir.Display),
    headlineMedium = base.headlineMedium.copy(fontFamily = Noir.Display),
    titleLarge = base.titleLarge.copy(fontFamily = Noir.Display),
    titleMedium = base.titleMedium.copy(fontFamily = Noir.Ui),
    bodyLarge = base.bodyLarge.copy(fontFamily = Noir.Ui),
    bodyMedium = base.bodyMedium.copy(fontFamily = Noir.Ui),
    bodySmall = base.bodySmall.copy(fontFamily = Noir.Ui),
    labelLarge = base.labelLarge.copy(fontFamily = Noir.Ui, fontWeight = FontWeight.SemiBold),
    labelMedium = base.labelMedium.copy(fontFamily = Noir.Ui),
    labelSmall = base.labelSmall.copy(fontFamily = Noir.Ui),
)

@Composable
fun NoirTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Noir.Gold,
            onPrimary = Noir.Ink,
            background = Noir.Ink,
            onBackground = Noir.Text,
            surface = Noir.Surface,
            onSurface = Noir.Text,
            surfaceVariant = Noir.Raised,
            error = Noir.Burgundy,
        ),
        typography = NoirTypography,
        content = content,
    )
}
