package pro.verpelis.tv.data

import android.content.Context
import java.util.UUID

class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    var sessionCookie: String?
        get() = prefs.getString(KEY_COOKIE, null)?.takeIf { it.isNotBlank() }
        set(value) {
            prefs.edit().putString(KEY_COOKIE, value).apply()
        }

    var sessionToken: String?
        get() = prefs.getString(KEY_TOKEN, null)?.takeIf { it.isNotBlank() }
        set(value) {
            prefs.edit().putString(KEY_TOKEN, value).apply()
        }

    var deviceId: String
        get() {
            val existing = prefs.getString(KEY_DEVICE, null)?.takeIf { it.isNotBlank() }
            if (existing != null) return existing
            val created = UUID.randomUUID().toString().replace("-", "")
            prefs.edit().putString(KEY_DEVICE, created).apply()
            return created
        }
        set(value) {
            prefs.edit().putString(KEY_DEVICE, value).apply()
        }

    /**
     * Solo cuenta una cookie firmada ("token.firma"): Better Auth rechaza el token
     * sin firmar, así que una sesión guardada así (versiones ≤ 1.6.0) obliga a entrar de nuevo.
     */
    fun hasSession(): Boolean = SessionCookies.isUsable(sessionCookie)

    /** Cookie tal como la emitió el servidor en Set-Cookie (valor firmado). */
    fun persistCookie(name: String, value: String) {
        if (name.isNotBlank() && value.isNotBlank()) sessionCookie = "$name=$value"
    }

    /**
     * Guarda la sesión tras el login. [cookieValue] es el valor firmado (claim del QR);
     * si no viene, se conserva la cookie firmada que el CookieJar ya capturó para este
     * mismo token y solo como último recurso se usa el token sin firmar.
     */
    fun persistClaim(cookieName: String?, token: String?, cookieValue: String? = null) {
        if (token.isNullOrBlank() && cookieValue.isNullOrBlank()) return
        if (!token.isNullOrBlank()) sessionToken = token
        val name = cookieName?.takeIf { it.isNotBlank() } ?: DEFAULT_COOKIE_NAME
        val current = sessionCookie?.substringAfter("=", "")
        sessionCookie = when {
            !cookieValue.isNullOrBlank() -> "$name=$cookieValue"
            token != null && SessionCookies.isSignedFor(current, token) -> sessionCookie
            else -> "$name=$token"
        }
    }

    fun clear() {
        prefs.edit()
            .remove(KEY_COOKIE)
            .remove(KEY_TOKEN)
            .apply()
    }

    companion object {
        private const val PREFS = "pelis_tv_session"
        private const val KEY_COOKIE = "session_cookie"
        private const val KEY_TOKEN = "session_token"
        private const val KEY_DEVICE = "device_id"

        /** Prod Better Auth (HTTPS). */
        const val DEFAULT_COOKIE_NAME = "__Secure-better-auth.session_token"
        const val FALLBACK_COOKIE_NAME = "better-auth.session_token"
    }
}

/** Reglas puras de la cookie de sesión de Better Auth (valor "token.firma", URL-encoded). */
object SessionCookies {
    fun isSigned(value: String?): Boolean {
        if (value.isNullOrBlank()) return false
        val dot = value.indexOf('.').takeIf { it > 0 } ?: value.indexOf("%2E", ignoreCase = true).takeIf { it > 0 } ?: return false
        return dot < value.length - 1
    }

    fun isSignedFor(value: String?, token: String): Boolean =
        value != null && token.isNotBlank() &&
            (value.startsWith("$token.") || value.startsWith("$token%2E", ignoreCase = true))

    fun isUsable(cookie: String?): Boolean {
        val value = cookie?.substringAfter("=", "") ?: return false
        return isSigned(value)
    }
}
