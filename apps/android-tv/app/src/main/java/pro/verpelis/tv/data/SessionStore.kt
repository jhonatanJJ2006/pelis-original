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

    fun hasSession(): Boolean {
        return !sessionCookie.isNullOrBlank() || !sessionToken.isNullOrBlank()
    }

    fun persistClaim(cookieName: String?, token: String?) {
        if (!token.isNullOrBlank()) {
            sessionToken = token
            val name = cookieName?.takeIf { it.isNotBlank() } ?: DEFAULT_COOKIE_NAME
            sessionCookie = "$name=$token"
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
