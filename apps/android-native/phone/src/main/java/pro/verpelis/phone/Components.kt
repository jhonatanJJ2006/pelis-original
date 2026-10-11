package pro.verpelis.phone

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import pro.verpelis.core.data.Channel
import pro.verpelis.core.data.Title
import pro.verpelis.core.ui.Badge
import pro.verpelis.core.ui.Load
import pro.verpelis.core.ui.Noir
import pro.verpelis.core.ui.ProgressLine
import pro.verpelis.core.ui.SectionHeader

fun Title.meta(): String = listOf(year, genre.split(",").firstOrNull()?.trim().orEmpty(), classification).filter { it.isNotBlank() }.joinToString("  ·  ")

@Composable
fun PosterCard(t: Title, onClick: () -> Unit, modifier: Modifier = Modifier.width(118.dp), badge: String? = null) {
    Column(modifier.clickable(onClick = onClick)) {
        Box {
            AsyncImage(
                model = t.poster, contentDescription = t.name, contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f).clip(RoundedCornerShape(6.dp)).background(Noir.Raised)
                    .border(1.dp, Noir.Line, RoundedCornerShape(6.dp)),
            )
            if (badge != null) Box(Modifier.padding(6.dp)) { Badge(badge, gold = true) }
        }
        Spacer(Modifier.height(6.dp))
        Text(t.name, color = Noir.Text, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(t.genre.split(",").firstOrNull().orEmpty(), color = Noir.Muted, fontSize = 10.sp, maxLines = 1)
    }
}

@Composable
fun TitleRow(label: String, items: List<Title>, action: String? = null, badge: String? = null, onAction: (() -> Unit)? = null, onOpen: (Title) -> Unit) {
    if (items.isEmpty()) return
    Column(Modifier.padding(vertical = 12.dp)) {
        SectionHeader(label, action, badge, onAction, Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(items, key = { it.id }) { PosterCard(it, { onOpen(it) }) }
        }
    }
}

/** "Continuar viendo": tarjetas anchas con barra de progreso. */
@Composable
fun ContinueRow(items: List<Title>, onAll: () -> Unit, onOpen: (Title) -> Unit) {
    if (items.isEmpty()) return
    Column(Modifier.padding(vertical = 12.dp)) {
        SectionHeader("Continuar viendo", "Historial", onAction = onAll, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(items, key = { it.id }) { t ->
                Column(Modifier.width(220.dp).clickable { onOpen(t) }) {
                    Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(6.dp)).background(Noir.Raised)) {
                        AsyncImage(t.backdrop, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                        Box(Modifier.align(Alignment.Center).size(36.dp).background(Noir.Gold.copy(alpha = 0.9f), RoundedCornerShape(18.dp)), Alignment.Center) {
                            Icon(Icons.Filled.PlayArrow, null, tint = Noir.Ink)
                        }
                        ProgressLine(t.progress, Modifier.align(Alignment.BottomStart))
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(t.name, color = Noir.Text, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(t.meta(), color = Noir.Muted, fontSize = 10.sp, maxLines = 1)
                }
            }
        }
    }
}

/** "Tendencias en PELIS": números grandes estilo Top 10. */
@Composable
fun RankedRow(items: List<Title>, onOpen: (Title) -> Unit) {
    if (items.isEmpty()) return
    Column(Modifier.padding(vertical = 12.dp)) {
        SectionHeader("Tendencias en PELIS", badge = "Top 10", modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            itemsIndexed(items.take(10), key = { _, t -> t.id }) { i, t ->
                Row(Modifier.clickable { onOpen(t) }, verticalAlignment = Alignment.Bottom) {
                    Text("${i + 1}", fontFamily = Noir.Display, fontWeight = FontWeight.Bold, fontSize = 72.sp, color = Noir.Gold.copy(alpha = 0.35f),
                        modifier = Modifier.offset(x = 10.dp))
                    AsyncImage(t.poster, t.name, contentScale = ContentScale.Crop,
                        modifier = Modifier.width(96.dp).aspectRatio(2f / 3f).clip(RoundedCornerShape(6.dp)).background(Noir.Raised))
                }
            }
        }
    }
}

@Composable
fun ChannelCard(ch: Channel, onClick: () -> Unit, modifier: Modifier = Modifier.width(200.dp)) {
    Column(modifier.clip(RoundedCornerShape(6.dp)).background(Noir.Surface).border(1.dp, Noir.Line, RoundedCornerShape(6.dp)).clickable(onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Brush.verticalGradient(listOf(Noir.Raised, Noir.Ink)))) {
            AsyncImage(ch.logo, ch.name, contentScale = ContentScale.Fit, modifier = Modifier.align(Alignment.Center).fillMaxWidth(0.5f).aspectRatio(2f))
            Box(Modifier.padding(6.dp)) { Badge("En vivo", danger = true) }
        }
        Column(Modifier.padding(8.dp)) {
            Text(ch.name, color = Noir.Text, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(ch.category, color = Noir.Muted, fontSize = 10.sp, maxLines = 1)
        }
    }
}

@Composable
fun GoldButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, icon: ImageVector? = null) {
    Button(onClick, modifier.height(46.dp), enabled = enabled, shape = RoundedCornerShape(6.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Noir.Gold, contentColor = Noir.Ink, disabledContainerColor = Noir.Gold.copy(alpha = 0.4f))) {
        if (icon != null) { Icon(icon, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)) }
        Text(text, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun GhostButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, icon: ImageVector? = null, color: Color = Noir.Text) {
    OutlinedButton(onClick, modifier.height(46.dp), shape = RoundedCornerShape(6.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Noir.Line),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = Noir.Surface, contentColor = color)) {
        if (icon != null) { Icon(icon, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)) }
        Text(text, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun <T> LoadBox(state: Load<T>, content: @Composable (T) -> Unit) {
    when (state) {
        is Load.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Noir.Gold) }
        is Load.Err -> Box(Modifier.fillMaxSize().padding(24.dp), Alignment.Center) { Text(state.message, color = Noir.Muted) }
        is Load.Ok -> content(state.value)
    }
}
