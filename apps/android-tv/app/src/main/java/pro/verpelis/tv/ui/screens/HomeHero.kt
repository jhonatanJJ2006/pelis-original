package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.HeroFocus
import pro.verpelis.tv.data.heroSynopsis
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.ui.components.HeroBackdrop
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.playback.NoirIcon
import pro.verpelis.tv.ui.shell.TvHeader

/**
 * Hero fijo del inicio. Cambia con el título enfocado en las filas.
 * El tráiler no se reproduce aquí: un WebView de YouTube no cabe en la RAM de un TV box.
 * En la web sí, con el vídeo de TMDB silenciado.
 */
@Composable
fun HomeHero(
    hero: HeroFocus,
    meta: String,
    favorite: Boolean?,
    trailerNote: Boolean,
    focus: FocusRequester,
    onPlay: () -> Unit,
    onTrailer: () -> Unit,
    onToggleList: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val uiSounds = LocalUiSounds.current
    Box(modifier.fillMaxWidth().height(300.dp)) {
        HeroBackdrop(hero.backdropImage, hero.poster, Modifier.fillMaxSize())
        Box(
            Modifier.fillMaxSize().background(
                Brush.horizontalGradient(
                    0f to Mn.Bg,
                    0.42f to Mn.Bg.copy(alpha = 0.82f),
                    1f to Mn.Bg.copy(alpha = 0.15f),
                ),
            ),
        )
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    0f to Mn.Bg.copy(alpha = 0.55f),
                    0.2f to Color.Transparent,
                    0.72f to Color.Transparent,
                    1f to Mn.Bg,
                ),
            ),
        )
        Column(Modifier.fillMaxSize().padding(start = 32.dp, end = 40.dp, top = 16.dp, bottom = 12.dp)) {
            TvHeader(null)
            Spacer(Modifier.weight(1f))
            Column(Modifier.fillMaxWidth(0.62f)) {
                if (hero.featured) {
                    Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .padding(end = 6.dp)
                                .width(6.dp)
                                .height(6.dp)
                                .background(Mn.Gold, androidx.compose.foundation.shape.CircleShape),
                        )
                        MnText("Estreno destacado", color = Mn.Gold, size = 11.sp, weight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(6.dp))
                }
                MnText(hero.name, color = Mn.Text, size = 28.sp, family = Mn.Serif, weight = FontWeight.SemiBold, lines = 2)
                if (meta.isNotBlank()) {
                    Spacer(Modifier.height(4.dp))
                    MnText(meta, color = Mn.Variant, size = 11.sp, lines = 1)
                }
                val synopsis = remember(hero.synopsis) { heroSynopsis(hero.synopsis) }
                if (synopsis.isNotEmpty()) {
                    Spacer(Modifier.height(6.dp))
                    MnText(synopsis, color = Mn.Text.copy(alpha = 0.86f), size = 12.sp, lines = 2)
                }
                if (trailerNote) {
                    Spacer(Modifier.height(4.dp))
                    MnText(
                        "En el televisor el tráiler no se reproduce.",
                        color = Mn.Variant,
                        size = 11.sp,
                        lines = 1,
                    )
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    NoirButton(
                        "Reproducir",
                        { uiSounds.playClick(); onPlay() },
                        icon = NoirIcon.Play,
                        primary = true,
                        focusRequester = focus,
                    )
                    NoirButton("Tráiler", { uiSounds.playClick(); onTrailer() })
                    if (hero.kind != TitleKind.ANIME) {
                        NoirButton(
                            "Mi lista",
                            { uiSounds.playClick(); onToggleList() },
                            selected = favorite == true,
                        )
                    }
                }
            }
        }
    }
}
