package pro.verpelis.tv.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import coil.request.ImageRequest
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.images.TvImages
import pro.verpelis.tv.ui.theme.MaisonNoir

private val PosterShape = RoundedCornerShape(6.dp)
private const val POSTER_PX_W = 240
private const val POSTER_PX_H = 360

/**
 * Poster 2:3 al tamaño de la tarjeta (WebP ~256 px vía /_next/image). El foco
 * (escala + borde dorado) lo anima tv-material en la capa gráfica, sin
 * recomponer la imagen.
 */
@Composable
fun PosterCard(
    item: CatalogItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val uiSounds = LocalUiSounds.current
    var focused by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val request = remember(item.image) {
        ImageRequest.Builder(context)
            .data(TvImages.sized(BuildConfig.API_BASE_URL, item.image, TvImages.POSTER_WIDTH))
            .size(POSTER_PX_W, POSTER_PX_H)
            .build()
    }

    Column(modifier.width(124.dp)) {
        Surface(
            onClick = {
                uiSounds.playClick()
                onClick()
            },
            modifier = Modifier
                .size(width = 120.dp, height = 180.dp)
                .onFocusChanged { state ->
                    if (state.isFocused && !focused) uiSounds.playFocus()
                    focused = state.isFocused
                },
            shape = ClickableSurfaceDefaults.shape(PosterShape),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f),
            border = ClickableSurfaceDefaults.border(
                border = Border(BorderStroke(1.dp, MaisonNoir.Border.copy(alpha = 0.6f)), shape = PosterShape),
                focusedBorder = Border(BorderStroke(2.dp, MaisonNoir.Gold), shape = PosterShape),
            ),
            glow = ClickableSurfaceDefaults.glow(),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = MaisonNoir.Elevated,
                focusedContainerColor = MaisonNoir.Elevated,
            ),
        ) {
            Box(Modifier.fillMaxSize().background(MaisonNoir.Surface), contentAlignment = Alignment.Center) {
                Text(
                    item.displayName.take(1).uppercase(),
                    color = MaisonNoir.Ash,
                    fontSize = 28.sp,
                )
                AsyncImage(
                    model = request,
                    contentDescription = item.displayName,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        Text(
            text = item.displayName,
            color = if (focused) MaisonNoir.Gold else MaisonNoir.Chalk,
            fontSize = 12.sp,
            lineHeight = 15.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 8.dp, start = 2.dp, end = 2.dp),
        )
    }
}
