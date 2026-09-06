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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import coil.request.ImageRequest
import androidx.compose.ui.platform.LocalContext
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun ChannelCard(
    channel: TvChannel,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val uiSounds = LocalUiSounds.current
    var focused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (focused) 1.08f else 1f, label = "card-scale")
    val context = LocalContext.current
    val shape = RoundedCornerShape(10.dp)

    Surface(
        onClick = {
            uiSounds.playClick()
            onClick()
        },
        modifier = modifier
            .width(168.dp)
            .onFocusChanged { state ->
                val next = state.isFocused
                if (next && !focused) uiSounds.playFocus()
                focused = next
            }
            .scale(scale),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = MaisonNoir.Elevated,
            focusedContainerColor = MaisonNoir.Elevated,
        ),
        shape = ClickableSurfaceDefaults.shape(shape),
    ) {
        Column(Modifier.padding(8.dp)) {
            Box(
                modifier = Modifier
                    .size(width = 152.dp, height = 86.dp)
                    .clip(shape)
                    .border(
                        width = if (focused) 2.dp else 1.dp,
                        color = if (focused) MaisonNoir.Gold else MaisonNoir.Border,
                        shape = shape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (channel.logo.isNotBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(context)
                            .data(channel.logo)
                            .size(304, 172)
                            .crossfade(true)
                            .build(),
                        contentDescription = channel.name,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize().padding(8.dp),
                    )
                } else {
                    Text(channel.name.take(2).uppercase(), color = MaisonNoir.Gold)
                }
            }
            Text(
                text = channel.name,
                color = MaisonNoir.Chalk,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}
