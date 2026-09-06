package pro.verpelis.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

@Composable
fun PelisTvTheme(content: @Composable () -> Unit) {
    val colors = darkColorScheme(
        primary = MaisonNoir.Gold,
        onPrimary = MaisonNoir.Background,
        secondary = MaisonNoir.Silver,
        background = MaisonNoir.Background,
        onBackground = MaisonNoir.Chalk,
        surface = MaisonNoir.Surface,
        onSurface = MaisonNoir.Chalk,
        border = MaisonNoir.Border,
    )
    MaterialTheme(colorScheme = colors, content = content)
}
