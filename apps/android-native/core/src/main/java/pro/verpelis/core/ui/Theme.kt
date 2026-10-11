package pro.verpelis.core.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
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
    val Display = FontFamily.Serif // Fraunces pendiente de empaquetar
    val Ui = FontFamily.SansSerif // Inter pendiente de empaquetar
}

val NoirTitle = TextStyle(fontFamily = Noir.Display, fontWeight = FontWeight.SemiBold, fontSize = 28.sp, color = Noir.Text)
val NoirSection = TextStyle(fontFamily = Noir.Display, fontWeight = FontWeight.Medium, fontSize = 20.sp, color = Noir.Text)
val NoirBody = TextStyle(fontFamily = Noir.Ui, fontSize = 14.sp, color = Noir.Muted)

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
        content = content,
    )
}
