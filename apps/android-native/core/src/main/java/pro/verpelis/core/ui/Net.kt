package pro.verpelis.core.ui

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/** true si hay red con internet. Se actualiza al perder o recuperar la conexión. */
fun isOnline(context: Context): Boolean = runCatching {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    cm.getNetworkCapabilities(cm.activeNetwork)?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
}.getOrDefault(true)

@Composable
fun rememberOnline(): State<Boolean> {
    val context = LocalContext.current.applicationContext
    val state = remember { mutableStateOf(isOnline(context)) }
    DisposableEffect(context) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) { state.value = true }
            override fun onLost(network: Network) { state.value = isOnline(context) }
        }
        val ok = runCatching { cm.registerDefaultNetworkCallback(cb) }.isSuccess
        onDispose { if (ok) runCatching { cm.unregisterNetworkCallback(cb) } }
    }
    return state
}
