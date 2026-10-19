package pro.verpelis.tv.ui.library

import android.os.SystemClock
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Filtra al enfocar un chip (géneros, categorías) sin esperar OK.
 *
 * Solo cuenta el movimiento ◄/► entre chips: si el foco llega a un chip desde
 * la cuadrícula o el menú, no cambia el filtro (así ▲ desde los pósters no
 * elige un género por accidente). Espera [delayMs] para no cargar cada chip
 * que se cruza al mantener pulsada la flecha.
 */
class ChipFocusFilter(private val scope: CoroutineScope, private val delayMs: Long = 300) {
    private var job: Job? = null
    private var lostAt = 0L

    fun onFocus(focused: Boolean, apply: () -> Unit) {
        val now = SystemClock.uptimeMillis()
        if (!focused) {
            lostAt = now
            return
        }
        val lateral = now - lostAt < 150
        job?.cancel()
        if (!lateral) return
        job = scope.launch {
            delay(delayMs)
            apply()
        }
    }

    fun cancel() {
        job?.cancel()
    }
}

@Composable
fun rememberChipFocusFilter(): ChipFocusFilter {
    val scope = rememberCoroutineScope()
    return remember(scope) { ChipFocusFilter(scope) }
}
