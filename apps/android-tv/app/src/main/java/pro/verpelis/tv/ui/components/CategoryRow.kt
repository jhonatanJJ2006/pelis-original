package pro.verpelis.tv.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.gestures.BringIntoViewSpec
import androidx.compose.foundation.gestures.LocalBringIntoViewSpec
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.ui.theme.MaisonNoir
import pro.verpelis.tv.ui.theme.MaisonType

/**
 * Desplazamiento "pivote" de Android TV: el elemento enfocado se queda a una
 * distancia fija del borde en vez de que la fila salte justo al llegar al
 * extremo. Con el mando se ve más fluido y la fila no mueve todo el contenido
 * en cada pulsación.
 */
@OptIn(ExperimentalFoundationApi::class)
private class PivotBringIntoViewSpec(private val fraction: Float) : BringIntoViewSpec {
    override fun calculateScrollDistance(offset: Float, size: Float, containerSize: Float): Float {
        val target = containerSize * fraction
        val distance = offset - target
        // Si el elemento ya cabe entero sin moverse al principio de la fila, no desplazar.
        return if (offset >= 0 && offset + size <= containerSize && distance < 0) 0f else distance
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun TvPivotScroll(fraction: Float, content: @Composable () -> Unit) {
    val spec = remember(fraction) { PivotBringIntoViewSpec(fraction) }
    CompositionLocalProvider(LocalBringIntoViewSpec provides spec, content = content)
}

@Composable
private fun RowHeader(title: String, count: Int) {
    Row(
        modifier = Modifier.padding(start = 48.dp, end = 48.dp, bottom = 10.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        Text(title, style = MaisonType.Title.copy(fontSize = 18.sp, color = MaisonNoir.Chalk))
        Text(
            "  ·  $count",
            style = MaisonType.Eyebrow.copy(color = MaisonNoir.Silver),
            modifier = Modifier.padding(bottom = 2.dp),
        )
    }
}

@Composable
fun CategoryRow(
    title: String,
    channels: List<TvChannel>,
    onPlayChannel: (TvChannel) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (channels.isEmpty()) return
    Column(modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        RowHeader(title, channels.size)
        TvPivotScroll(0.06f) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 48.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                items(channels, key = { it.id }, contentType = { "channel" }) { channel ->
                    ChannelCard(channel = channel, onClick = { onPlayChannel(channel) })
                }
            }
        }
    }
}

@Composable
fun CatalogRow(
    title: String,
    items: List<CatalogItem>,
    onOpen: (CatalogItem) -> Unit,
    modifier: Modifier = Modifier,
    firstItemFocus: FocusRequester? = null,
) {
    if (items.isEmpty()) return
    Column(modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        RowHeader(title, items.size)
        TvPivotScroll(0.06f) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 48.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items(items.size, key = { items[it].id }, contentType = { "poster" }) { index ->
                    val item = items[index]
                    PosterCard(
                        item = item,
                        onClick = { onOpen(item) },
                        focusRequester = if (index == 0) firstItemFocus else null,
                    )
                }
            }
        }
    }
}
