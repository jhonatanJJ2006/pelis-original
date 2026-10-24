package pro.verpelis.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
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
import pro.verpelis.tv.PelisTvApp
import pro.verpelis.tv.data.TvImages
import pro.verpelis.tv.data.remainingLabel
import pro.verpelis.tv.data.tv.ContinueItem
import pro.verpelis.tv.ui.theme.MaisonNoir

private val CardShape = RoundedCornerShape(6.dp)

/** Tarjeta apaisada de «Seguir viendo»: foto, lo que queda y la barra de avance. */
@Composable
fun ContinueCard(
    item: ContinueItem,
    onClick: () -> Unit,
    onFocused: () -> Unit,
    modifier: Modifier = Modifier,
    focusRequester: FocusRequester? = null,
) {
    val uiSounds = LocalUiSounds.current
    val context = LocalContext.current
    var focused by remember { mutableStateOf(false) }
    val lowRam = (context.applicationContext as? PelisTvApp)?.lowRam == true
    val request = remember(item.backdropImage, item.image, lowRam) {
        val raw = item.backdropImage?.takeIf { it.isNotBlank() } ?: item.image
        ImageRequest.Builder(context)
            .data(TvImages.sized(BuildConfig.API_BASE_URL, raw, 640))
            .size(420, 236)
            .allowRgb565(lowRam)
            .crossfade(false)
            .build()
    }
    val remain = remainingLabel(item.durationSec, item.progressSec)

    Column(modifier.width(216.dp)) {
        Surface(
            onClick = {
                uiSounds.playClick()
                onClick()
            },
            modifier = Modifier
                .width(210.dp)
                .height(118.dp)
                .let { if (focusRequester != null) it.focusRequester(focusRequester) else it }
                .onFocusChanged { state ->
                    if (state.isFocused && !focused) {
                        uiSounds.playFocus()
                        onFocused()
                    }
                    focused = state.isFocused
                },
            shape = ClickableSurfaceDefaults.shape(CardShape),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.06f),
            border = ClickableSurfaceDefaults.border(
                border = Border(androidx.compose.foundation.BorderStroke(1.dp, MaisonNoir.Border.copy(alpha = 0.6f)), shape = CardShape),
                focusedBorder = Border(androidx.compose.foundation.BorderStroke(3.dp, MaisonNoir.Gold), shape = CardShape),
            ),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = MaisonNoir.Elevated,
                focusedContainerColor = MaisonNoir.Elevated,
            ),
        ) {
            Box(Modifier.fillMaxSize().background(MaisonNoir.Surface)) {
                AsyncImage(
                    model = request,
                    contentDescription = item.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                if (remain != null) {
                    Text(
                        remain,
                        color = MaisonNoir.Chalk,
                        fontSize = 10.sp,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .background(MaisonNoir.Background.copy(alpha = 0.72f), RoundedCornerShape(3.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    )
                }
                if (focused) {
                    Text(
                        "OK",
                        color = MaisonNoir.Background,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(6.dp)
                            .background(MaisonNoir.Gold, RoundedCornerShape(3.dp))
                            .padding(horizontal = 5.dp, vertical = 2.dp),
                    )
                }
                Box(
                    Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(MaisonNoir.Background.copy(alpha = 0.8f)),
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth(item.fraction.coerceIn(0.03f, 1f))
                            .height(4.dp)
                            .background(MaisonNoir.Gold),
                    )
                }
            }
        }
        Text(
            item.name,
            color = if (focused) MaisonNoir.Gold else MaisonNoir.Chalk,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp, start = 2.dp, end = 2.dp),
        )
    }
}
