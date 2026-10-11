package pro.verpelis.core.data

import android.content.Context
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import org.json.JSONArray
import org.json.JSONObject

/**
 * Persiste las cookies de better-auth (pelis.session_token, etc.) en SharedPreferences,
 * de modo que la app comparte el mismo mecanismo de sesión que la web.
 */
class SessionStore(context: Context) : CookieJar {
    private val prefs = context.getSharedPreferences("pelis_session", Context.MODE_PRIVATE)
    private val cookies = mutableMapOf<String, Cookie>()

    init {
        val raw = prefs.getString("cookies", null)
        if (raw != null) runCatching {
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val c = Cookie.Builder()
                    .name(o.getString("n")).value(o.getString("v"))
                    .domain(o.getString("d")).path(o.optString("p", "/"))
                    .expiresAt(o.getLong("e"))
                    .apply { if (o.optBoolean("s")) secure(); if (o.optBoolean("h")) httpOnly() }
                    .build()
                if (c.expiresAt > System.currentTimeMillis()) cookies[c.name] = c
            }
        }
    }

    val hasSession: Boolean
        get() = synchronized(this) { cookies.keys.any { it.contains("session_token") } }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        cookies.forEach { c ->
            if (c.expiresAt <= System.currentTimeMillis()) this.cookies.remove(c.name) else this.cookies[c.name] = c
        }
        persist()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> =
        cookies.values.filter { it.matches(url) && it.expiresAt > System.currentTimeMillis() }

    /** Guarda una cookie de sesión emitida explícitamente (flujo de emparejamiento TV). */
    @Synchronized
    fun putSessionCookie(host: String, name: String, value: String) {
        cookies[name] = Cookie.Builder().name(name).value(value).domain(host).path("/")
            .expiresAt(System.currentTimeMillis() + 30L * 24 * 3600 * 1000).secure().httpOnly().build()
        persist()
    }

    @Synchronized
    fun clear() {
        cookies.clear()
        persist()
    }

    private fun persist() {
        val arr = JSONArray()
        cookies.values.forEach { c ->
            arr.put(JSONObject().put("n", c.name).put("v", c.value).put("d", c.domain).put("p", c.path)
                .put("e", c.expiresAt).put("s", c.secure).put("h", c.httpOnly))
        }
        prefs.edit().putString("cookies", arr.toString()).apply()
    }
}
