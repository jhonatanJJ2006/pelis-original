package pro.verpelis.tv.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun CategoryRow(
    title: String,
    channels: List<TvChannel>,
    onPlayChannel: (TvChannel) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (channels.isEmpty()) return
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
    ) {
        Text(
            text = title,
            color = MaisonNoir.Gold,
            modifier = Modifier.padding(horizontal = 48.dp, vertical = 8.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(channels, key = { it.id }) { channel ->
                ChannelCard(channel = channel, onClick = { onPlayChannel(channel) })
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
) {
    if (items.isEmpty()) return
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
    ) {
        Text(
            text = title,
            color = MaisonNoir.Gold,
            modifier = Modifier.padding(horizontal = 48.dp, vertical = 8.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(items, key = { it.id }) { item ->
                PosterCard(item = item, onClick = { onOpen(item) })
            }
        }
    }
}
