package pro.verpelis.tv.ui.components

import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.imageLoader
import coil.request.ErrorResult
import coil.request.ImageRequest
import coil.request.SuccessResult
import kotlinx.coroutines.suspendCancellableCoroutine
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.PelisTvApp
import pro.verpelis.tv.data.HERO_BACKDROP_DEBOUNCE_MS
import pro.verpelis.tv.data.HeroImageGate
import pro.verpelis.tv.data.TvImages
import kotlin.coroutines.resume

/**
 * Un solo fondo a la vez, al tamaño de la pantalla (Full HD como tope, RGB_565
 * si el equipo va justo de RAM). Al mover el foco se cancela la descarga en curso
 * y se espera un instante antes de pedir la siguiente, para no encadenar bitmaps.
 * La copia es nuestra: Coil puede reciclar la suya al cancelar.
 */
@Composable
fun HeroBackdrop(raw: String?, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lowRam = (context.applicationContext as? PelisTvApp)?.lowRam == true
    val loader = context.imageLoader
    val gate = remember { HeroImageGate() }
    var frame by remember { mutableStateOf<Bitmap?>(null) }
    var warmed by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        onDispose {
            frame?.takeIf { !it.isRecycled }?.recycle()
            frame = null
        }
    }

    LaunchedEffect(raw, lowRam) {
        val token = gate.begin()
        if (raw.isNullOrBlank()) {
            val previous = frame
            frame = null
            if (previous != null) {
                kotlinx.coroutines.delay(48)
                if (frame !== previous && !previous.isRecycled) previous.recycle()
            }
            return@LaunchedEffect
        }
        if (warmed) kotlinx.coroutines.delay(HERO_BACKDROP_DEBOUNCE_MS) else warmed = true
        if (!gate.isCurrent(token)) return@LaunchedEffect
        val request = TvImages.backdropRequest(context, BuildConfig.API_BASE_URL, raw, lowRam)
            ?: return@LaunchedEffect
        val result = loader.loadCancellable(request)
        if (!gate.isCurrent(token) || result == null) return@LaunchedEffect
        val source = (result.drawable as? BitmapDrawable)?.bitmap ?: return@LaunchedEffect
        val config = source.config ?: Bitmap.Config.ARGB_8888
        val copy = runCatching { source.copy(config, false) }.getOrNull() ?: return@LaunchedEffect
        if (!gate.isCurrent(token)) {
            copy.recycle()
            return@LaunchedEffect
        }
        val previous = frame
        frame = copy
        if (previous != null && previous !== copy) {
            kotlinx.coroutines.delay(48)
            if (frame !== previous && !previous.isRecycled) previous.recycle()
        }
    }

    val shown = frame
    if (shown != null && !shown.isRecycled) {
        Image(
            bitmap = shown.asImageBitmap(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier,
        )
    }
}

/**
 * `execute` de Coil se cancela con la corrutina, pero `dispose()` es la forma
 * explícita de cortar la red cuando el mando ya se fue a otro título.
 */
private suspend fun coil.ImageLoader.loadCancellable(request: ImageRequest): SuccessResult? =
    suspendCancellableCoroutine { cont ->
        val disposable = enqueue(
            request.newBuilder()
                .allowHardware(false)
                .crossfade(false)
                .listener(
                    onSuccess = { _, result -> if (cont.isActive) cont.resume(result) },
                    onError = { _: ImageRequest, _: ErrorResult -> if (cont.isActive) cont.resume(null) },
                )
                .build(),
        )
        cont.invokeOnCancellation { disposable.dispose() }
    }
