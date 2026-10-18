package pro.verpelis.core.data

import android.content.Context
import okio.ByteString.Companion.encodeUtf8
import okio.ByteString.Companion.toByteString
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * PKCE (RFC 7636, S256) para el login con Google en el navegador.
 * Sin dependencias de Android para poder probarlo en la JVM.
 */
object Pkce {
    private val random = SecureRandom()

    /** 32 bytes aleatorios en base64url sin relleno (43 caracteres). */
    fun randomToken(): String {
        val bytes = ByteArray(32).also { random.nextBytes(it) }
        return bytes.toByteString().base64Url().trimEnd('=')
    }

    fun challenge(verifier: String): String = verifier.encodeUtf8().sha256().base64Url().trimEnd('=')

    fun constantTimeEquals(a: String, b: String): Boolean =
        MessageDigest.isEqual(a.toByteArray(), b.toByteArray())
}

data class GoogleCallback(val code: String, val state: String, val verifier: String)

/** Nonce de un solo uso y client id OAuth web para el login nativo (Credential Manager). */
data class GoogleNonce(val nonce: String, val clientId: String)

/**
 * Login con Google sin cliente OAuth de Android:
 * 1. [start] genera state + verifier, los guarda y devuelve la URL web
 *    (`/app-auth/google?state=…&challenge=…`) que se abre en una Custom Tab.
 * 2. La web hace el flujo de Google y vuelve con
 *    `pro.verpelis.app://auth/callback?code=…&state=…`.
 * 3. [consume] valida el deep link contra lo guardado (un solo uso) y entrega
 *    code + verifier para canjearlos en `/api/app-auth/exchange`.
 */
class GoogleLoginFlow(context: Context, private val base: String) {
    private val prefs = context.applicationContext.getSharedPreferences("pelis_google_login", Context.MODE_PRIVATE)

    fun start(now: Long = System.currentTimeMillis()): String {
        val state = Pkce.randomToken()
        val verifier = Pkce.randomToken()
        prefs.edit().putString("state", state).putString("verifier", verifier).putLong("at", now).commit()
        return "$base/app-auth/google?state=$state&challenge=${Pkce.challenge(verifier)}"
    }

    val pending: Boolean get() = prefs.getString("state", null) != null

    /** Devuelve el callback válido o lanza IllegalStateException con un mensaje para el usuario. */
    fun consume(scheme: String?, host: String?, path: String?, code: String?, state: String?, now: Long = System.currentTimeMillis()): GoogleCallback {
        val savedState = prefs.getString("state", null)
        val verifier = prefs.getString("verifier", null)
        val at = prefs.getLong("at", 0L)
        prefs.edit().clear().commit()
        check(scheme == SCHEME && host == HOST && path == PATH) { "Enlace de inicio de sesión inválido" }
        check(savedState != null && verifier != null && now - at in 0..MAX_AGE_MS) { "El inicio de sesión expiró, intenta de nuevo" }
        check(!code.isNullOrBlank() && state != null && Pkce.constantTimeEquals(state, savedState)) { "No se pudo verificar el inicio de sesión, intenta de nuevo" }
        return GoogleCallback(code, state, verifier)
    }

    companion object {
        const val SCHEME = "pro.verpelis.app"
        const val HOST = "auth"
        const val PATH = "/callback"
        /** Tiempo máximo para completar Google en el navegador (el código del servidor vive 2 min). */
        const val MAX_AGE_MS = 10L * 60 * 1000
    }
}
