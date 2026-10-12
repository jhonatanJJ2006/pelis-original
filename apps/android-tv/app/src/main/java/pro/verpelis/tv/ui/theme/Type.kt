package pro.verpelis.tv.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Tipografía Maison Noir para TV: titulares serif (equivalente a Bodoni Moda sin
 * empaquetar fuentes) y cuerpo sans-serif. Tamaños pensados para 10-foot UI.
 */
object MaisonType {
    val Eyebrow = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        letterSpacing = 2.sp,
        color = MaisonNoir.Gold,
    )
    val Display = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Normal,
        fontSize = 40.sp,
        color = MaisonNoir.Chalk,
    )
    val DisplayItalic = Display.copy(fontStyle = FontStyle.Italic, color = MaisonNoir.Gold)
    val Title = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 24.sp,
        color = MaisonNoir.Chalk,
    )
    val Body = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 16.sp,
        color = MaisonNoir.Silver,
    )
    val Meta = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 13.sp,
        color = MaisonNoir.Ash,
    )
}
