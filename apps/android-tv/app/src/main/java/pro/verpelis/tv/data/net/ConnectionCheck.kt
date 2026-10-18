package pro.verpelis.tv.data.net

import android.content.Context
import android.net.ConnectivityManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/** Resultado de "Ver estado de conexión": comprobación real, sin datos inventados. */
sealed interface ConnectionStatus {
    /** La TV no tiene red (Wi-Fi o cable desconectado). */
    data object NoNetwork : ConnectionStatus
    /** Hay red, pero el servidor no respondió. */
    data class ServerUnreachable(val host: String) : ConnectionStatus
    /** El servidor respondió (cualquier código HTTP) en [millis] ms. */
    data class Ok(val host: String, val millis: Long) : ConnectionStatus
}

object ConnectionCheck {
    /** `false` solo si Android confirma que no hay red; `null` si no se puede saber. */
    @Suppress("DEPRECATION")
    fun hasNetwork(context: Context): Boolean? = runCatching {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return null
        cm.activeNetworkInfo?.isConnected == true
    }.getOrNull()

    fun hostOf(baseUrl: String): String =
        baseUrl.removePrefix("https://").removePrefix("http://").trimEnd('/').substringBefore('/')

    suspend fun run(context: Context, baseUrl: String): ConnectionStatus {
        val host = hostOf(baseUrl)
        if (hasNetwork(context) == false) return ConnectionStatus.NoNetwork
        return withContext(Dispatchers.IO) {
            val started = System.nanoTime()
            runCatching {
                // Mismo cliente HTTP (y mismo proxy del sistema) que usa la app.
                val client = OkHttpClient.Builder()
                    .connectTimeout(6, TimeUnit.SECONDS)
                    .readTimeout(6, TimeUnit.SECONDS)
                    .build()
                val request = Request.Builder().url(baseUrl.trimEnd('/') + "/api/app/availability").get().build()
                client.newCall(request).execute().use { it.code }
            }.fold(
                onSuccess = { ConnectionStatus.Ok(host, (System.nanoTime() - started) / 1_000_000) },
                onFailure = { ConnectionStatus.ServerUnreachable(host) },
            )
        }
    }

    /** Texto en español claro para cada resultado. */
    fun describe(status: ConnectionStatus): String = when (status) {
        ConnectionStatus.NoNetwork -> "Tu TV no está conectada a internet. Revisa el Wi-Fi o el cable de red."
        is ConnectionStatus.ServerUnreachable -> "Tu TV tiene red, pero ${status.host} no respondió. Espera un momento y vuelve a intentarlo."
        is ConnectionStatus.Ok -> "${status.host} respondió en ${status.millis} ms. Pulsa Reintentar."
    }
}
