package pro.verpelis.core.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext

sealed interface Load<out T> {
    data object Loading : Load<Nothing>
    data class Ok<T>(val value: T) : Load<T>
    /** [offline]: falló sin red. [retry]: vuelve a cargar. */
    data class Err(val message: String, val offline: Boolean = false, val retry: (() -> Unit)? = null) : Load<Nothing>
}

/**
 * Carga datos suspendidos y expone el estado (cargando / ok / error en español).
 * Si falla sin conexión, reintenta solo al volver la red.
 */
@Composable
fun <T> rememberLoad(vararg keys: Any?, block: suspend () -> T): Load<T> {
    val context = LocalContext.current
    val online by rememberOnline()
    var attempt by remember(*keys) { mutableIntStateOf(0) }
    var state by remember(*keys) { mutableStateOf<Load<T>>(Load.Loading) }
    LaunchedEffect(*keys, attempt) {
        state = Load.Loading
        state = try { Load.Ok(block()) } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
            val off = !isOnline(context)
            Load.Err(if (off) "Sin conexión" else (e.message ?: "Error de conexión"), off) { attempt++ }
        }
    }
    LaunchedEffect(online) { if (online && (state as? Load.Err)?.offline == true) attempt++ }
    return state
}
