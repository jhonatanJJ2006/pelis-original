package pro.verpelis.tv.ui.components

import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
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
import pro.verpelis.tv.data.isTooDark
import kotlin.coroutines.resume

/**
 * Un solo fondo a la vez, al tamaño de la pantalla (Full HD como tope, RGB_565
 * si el equipo va justo de RAM). Al mover el foco se cancela la descarga en curso
 * y se espera un instante antes de pedir la siguiente, para no encadenar bitmaps.
 * La copia es nuestra: Coil puede reciclar la suya al cancelar.
 */
@Composable
fun HeroBackdrop(raw: String?, poster: String? = null, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lowRam = (context.applicationContext as? PelisTvApp)?.lowRam == true
    val loader = context.imageLoader
    val gate = remember { HeroImageGate() }
    var frame by remember { mutableStateOf<Bitmap?>(null) }
    var warmed by remember { mutableStateOf(false) }
    // Sin fondo útil (no hay, falla o es casi negro): se pinta el póster. Nunca negro.
    var usePoster by remember { mutableStateOf(false) }

    DisposableEffect(Unit) {
        onDispose {
            frame?.takeIf { !it.isRecycled }?.recycle()
            frame = null
        }
    }

    LaunchedEffect(raw, lowRam) {
        val token = gate.begin()
        suspend fun dropFrame() {
            val previous = frame
            frame = null
            if (previous != null) {
                kotlinx.coroutines.delay(48)
                if (frame !== previous && !previous.isRecycled) previous.recycle()
            }
        }
        if (raw.isNullOrBlank()) {
            usePoster = true
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
        if (!gate.isCurrent(token)) return@LaunchedEffect
        val source = (result?.drawable as? BitmapDrawable)?.bitmap
        if (source == null || isTooDark(meanLuma(source))) {
            usePoster = true
            dropFrame()
            return@LaunchedEffect
        }
        val config = source.config ?: Bitmap.Config.ARGB_8888
        val copy = runCatching { source.copy(config, false) }.getOrNull() ?: return@LaunchedEffect
        if (!gate.isCurrent(token)) {
            copy.recycle()
            return@LaunchedEffect
        }
        val previous = frame
        frame = copy
        usePoster = false
        if (previous != null && previous !== copy) {
            kotlinx.coroutines.delay(48)
            if (frame !== previous && !previous.isRecycled) previous.recycle()
        }
    }

    val shown = frame
    val posterUrl = if (usePoster) TvImages.sized(BuildConfig.API_BASE_URL, poster, HERO_POSTER_WIDTH) else null
    if (shown != null && !shown.isRecycled) {
        Image(
            bitmap = shown.asImageBitmap(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier,
        )
    } else if (posterUrl != null) {
        HeroPosterFallback(posterUrl, lowRam, modifier)
    }
}

/** Póster pequeño (≈384 px): poca RAM, y la misma petición sirve para las dos capas. */
private const val HERO_POSTER_WIDTH = 384

/**
 * Hero de reserva: el póster recortado a todo el ancho y atenuado (sin blur: en los
 * TV box cuesta demasiado), y el póster nítido a la derecha. Los degradados del hero
 * van encima.
 */
@Composable
private fun HeroPosterFallback(url: String, lowRam: Boolean, modifier: Modifier) {
    val context = LocalContext.current
    val request = remember(url, lowRam) {
        ImageRequest.Builder(context)
            .data(url)
            .size(HERO_POSTER_WIDTH, HERO_POSTER_WIDTH * 3 / 2)
            .allowRgb565(lowRam)
            .crossfade(false)
            .build()
    }
    Box(modifier) {
        AsyncImage(
            request,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize().alpha(0.38f),
        )
        AsyncImage(
            request,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 56.dp, top = 28.dp, bottom = 28.dp)
                .fillMaxHeight()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(8.dp)),
        )
    }
}

/** Luminancia media (0–255) muestreando el bitmap a 32×18. Barato y sin tocar el original. */
internal fun meanLuma(source: Bitmap): Double? = runCatching {
    val small = Bitmap.createScaledBitmap(source, 32, 18, true)
    val pixels = IntArray(32 * 18)
    small.getPixels(pixels, 0, 32, 0, 0, 32, 18)
    if (small !== source) small.recycle()
    var sum = 0.0
    for (c in pixels) {
        sum += 0.299 * ((c shr 16) and 0xFF) + 0.587 * ((c shr 8) and 0xFF) + 0.114 * (c and 0xFF)
    }
    sum / pixels.size
}.getOrNull()

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
