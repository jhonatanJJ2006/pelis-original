package pro.verpelis.tv.ui.splash

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.util.Log
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import pro.verpelis.tv.R

private const val TAG = "PelisSplash"

/**
 * Intro de arranque en frío: logo de Pelis con fade + escala + destello dorado y sonido propio
 * (res/raw/pelis_intro.ogg, sintetizado con branding/gen-intro-sound.py). Se dibuja encima del
 * NavHost, así el inicio carga en paralelo. [onFinished] se llama al terminar o al saltarla.
 */
@Composable
fun SplashOverlay(playSound: Boolean, onFinished: () -> Unit) {
    val context = LocalContext.current
    val finish by rememberUpdatedState(onFinished)
    val alpha = remember { Animatable(0f) }
    val scale = remember { Animatable(0.86f) }
    val shine = remember { Animatable(-0.4f) }
    val overlay = remember { Animatable(1f) }
    val glow = remember { Animatable(0f) }

    DisposableEffect(playSound) {
        val player = if (playSound) startIntroSound(context) else null
        onDispose {
            player?.let {
                runCatching { it.stop() }
                it.release()
                Log.i(TAG, "intro sound released")
            }
        }
    }

    LaunchedEffect(Unit) {
        coroutineScope {
            val a = async { alpha.animateTo(1f, tween(700, easing = LinearEasing)) }
            val s = async { scale.animateTo(1f, tween(1500, easing = FastOutSlowInEasing)) }
            val g = async { glow.animateTo(1f, tween(1100, delayMillis = 300)) }
            a.await(); s.await(); g.await()
        }
        shine.animateTo(1.4f, tween(750, easing = FastOutSlowInEasing))
        delay(250)
        overlay.animateTo(0f, tween(400))
        finish()
    }

    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer { this.alpha = overlay.value }
            .background(Color(0xFF07070A)),
        contentAlignment = Alignment.Center,
    ) {
        // halo cálido detrás del logo
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer { this.alpha = glow.value * 0.55f }
                .background(
                    Brush.radialGradient(
                        listOf(Color(0x55C4A35A), Color(0x00000000)),
                        radius = 900f,
                    ),
                ),
        )
        Image(
            painter = painterResource(R.drawable.pelis_splash_logo),
            contentDescription = "Pelis",
            modifier = Modifier
                .fillMaxWidth(0.42f)
                .graphicsLayer {
                    this.alpha = alpha.value
                    scaleX = scale.value
                    scaleY = scale.value
                    compositingStrategy = CompositingStrategy.Offscreen
                }
                .drawWithContent {
                    drawContent()
                    val x = size.width * shine.value
                    val band = size.width * 0.18f
                    drawRect(
                        brush = Brush.linearGradient(
                            colors = listOf(Color.Transparent, Color(0xB3FFF4D6), Color.Transparent),
                            start = Offset(x - band, 0f),
                            end = Offset(x + band, size.height),
                        ),
                        blendMode = BlendMode.SrcAtop,
                    )
                },
        )
    }
}

/** MediaPlayer con atributos de medios: respeta el volumen del sistema. Se libera solo al acabar. */
private fun startIntroSound(context: Context): MediaPlayer? = try {
    MediaPlayer().apply {
        setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        context.resources.openRawResourceFd(R.raw.pelis_intro).use { afd ->
            setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
        }
        setOnPreparedListener {
            it.start()
            Log.i(TAG, "intro sound started")
        }
        setOnCompletionListener { Log.i(TAG, "intro sound completed") }
        setOnErrorListener { _, what, extra ->
            Log.w(TAG, "intro sound error $what/$extra"); true
        }
        prepareAsync()
    }
} catch (e: Exception) {
    Log.w(TAG, "intro sound unavailable", e)
    null
}
