package pro.verpelis.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Wordmark "PELIS | MAISON NOIR" del diseño. */
@Composable
fun Wordmark(size: TextUnit = 22.sp, subtitle: String? = "MAISON NOIR", modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Text("PELIS", fontFamily = Noir.Display, fontWeight = FontWeight.Bold, fontSize = size, color = Noir.Gold, letterSpacing = 1.5.sp)
        if (subtitle != null) {
            Box(Modifier.padding(horizontal = 8.dp).width(1.dp).height(12.dp).background(Noir.Line))
            Text(subtitle, style = NoirLabel.copy(color = Noir.Gold.copy(alpha = 0.8f), fontSize = 9.sp))
        }
    }
}

/** Etiqueta tipo "ESTRENO EXCLUSIVO" / "4K UHD". */
@Composable
fun Badge(text: String, gold: Boolean = false, danger: Boolean = false) {
    val bg = when { danger -> Noir.Burgundy; gold -> Noir.Gold.copy(alpha = 0.16f); else -> Noir.Raised }
    val fg = when { danger -> Noir.Text; gold -> Noir.Gold; else -> Noir.Text }
    Text(
        text.uppercase(), color = fg, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp,
        modifier = Modifier.background(bg, RoundedCornerShape(3.dp))
            .then(if (gold) Modifier.border(1.dp, Noir.Gold.copy(alpha = 0.6f), RoundedCornerShape(3.dp)) else Modifier)
            .padding(horizontal = 7.dp, vertical = 3.dp),
    )
}

@Composable
fun SectionHeader(title: String, action: String? = null, badge: String? = null, onAction: (() -> Unit)? = null, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = NoirSection)
        if (badge != null) { Spacer(Modifier.width(8.dp)); Badge(badge, gold = true) }
        Spacer(Modifier.weight(1f))
        if (action != null) Text("$action  >", color = Noir.Gold, fontSize = 12.sp, modifier = Modifier.clickable { onAction?.invoke() })
    }
}

/** Barra de progreso dorada para "Continuar viendo". */
@Composable
fun ProgressLine(progress: Float, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(3.dp).background(Noir.Line)) {
        Box(Modifier.fillMaxWidth(progress.coerceIn(0f, 1f)).height(3.dp).background(Noir.Gold))
    }
}

/** Selector de temporada y episodio (series y anime). */
@Composable
fun EpisodePicker(
    seasons: Int,
    season: Int,
    episodes: Int,
    selected: Int,
    onSeason: (Int) -> Unit,
    onEpisode: (Int) -> Unit,
    available: (Int) -> Boolean = { true },
    itemModifier: @Composable (Int) -> Modifier = { Modifier },
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("TEMPORADAS Y EPISODIOS", style = NoirLabel)
        if (seasons > 1) LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items((1..seasons).toList()) { s ->
                Text("Temporada $s", color = if (s == season) Noir.Ink else Noir.Text, fontSize = 13.sp,
                    modifier = Modifier.background(if (s == season) Noir.Gold else Noir.Raised, RoundedCornerShape(16.dp))
                        .clickable { onSeason(s) }.padding(horizontal = 14.dp, vertical = 7.dp))
            }
        } else Text("Temporada $season", color = Noir.Text, fontSize = 14.sp)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items((1..episodes.coerceAtLeast(1)).toList()) { e ->
                val on = e == selected
                val ok = available(e)
                Column(
                    itemModifier(e).width(84.dp).background(if (on) Noir.Gold.copy(alpha = 0.14f) else Noir.Surface, RoundedCornerShape(6.dp))
                        .border(1.dp, if (on) Noir.Gold else Noir.Line, RoundedCornerShape(6.dp))
                        .clickable { onEpisode(e) }.padding(10.dp),
                ) {
                    Text("EP. $e", color = if (on) Noir.Gold else Noir.Text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(if (ok) "Disponible" else "Próximamente", color = if (ok) Noir.Muted else Noir.Muted.copy(alpha = 0.6f), fontSize = 10.sp)
                }
            }
        }
    }
}

@Composable
fun Dot(color: Color = Noir.Gold) = Box(Modifier.size(6.dp).background(color, RoundedCornerShape(3.dp)))
