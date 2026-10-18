package pro.verpelis.tv.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import coil.request.ImageRequest
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.playback.PlaybackUrls
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun PosterCard(
    item: CatalogItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val uiSounds = LocalUiSounds.current
    var focused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (focused) 1.06f else 1f, label = "poster-scale")
    val context = LocalContext.current
    val shape = RoundedCornerShape(8.dp)

    Surface(
        onClick = {
            uiSounds.playClick()
            onClick()
        },
        modifier = modifier
            .width(128.dp)
            .onFocusChanged { state ->
                val next = state.isFocused
                if (next && !focused) uiSounds.playFocus()
                focused = next
            }
            .scale(scale),
        colors = ClickableSurfaceDefaults.colors(containerColor = MaisonNoir.Elevated),
        shape = ClickableSurfaceDefaults.shape(shape),
    ) {
        Column(Modifier.padding(6.dp)) {
            Box(
                modifier = Modifier
                    .size(width = 116.dp, height = 168.dp)
                    .clip(shape)
                    .border(
                        width = if (focused) 2.dp else 1.dp,
                        color = if (focused) MaisonNoir.Gold else MaisonNoir.Border,
                        shape = shape,
                    ),
            ) {
                AsyncImage(
                    model = ImageRequest.Builder(context)
                        .data(PlaybackUrls.absolute(BuildConfig.API_BASE_URL, item.image))
                        .size(232, 336)
                        .crossfade(true)
                        .build(),
                    contentDescription = item.displayName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            Text(
                text = item.displayName,
                color = MaisonNoir.Chalk,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 6.dp),
            )
        }
    }
}
