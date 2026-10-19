package pro.verpelis.core.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import pro.verpelis.core.BuildConfig
import java.util.UUID
import java.util.concurrent.TimeUnit

class ApiException(val status: Int, message: String) : Exception(message)

/**
 * Cliente de la API web existente de verpelis.pro.
 * Usa POST /api/function/<nombre> (el mismo registro que usan los hooks de la web)
 * y las rutas de better-auth y tv-auth. No requiere endpoints nuevos.
 */
class PelisApi private constructor(context: Context) {
    val base: String = BuildConfig.BASE_URL
    val session = SessionStore(context.applicationContext)
    private val prefs = context.getSharedPreferences("pelis_device", Context.MODE_PRIVATE)
    val deviceId: String = prefs.getString("id", null) ?: UUID.randomUUID().toString().also {
        prefs.edit().putString("id", it).apply()
    }

    val http: OkHttpClient = OkHttpClient.Builder()
        .cookieJar(session)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            chain.proceed(chain.request().newBuilder()
                .header("User-Agent", "PelisAndroid/1.0 (native)")
                .header("Origin", base)
                .build())
        }
        .build()

    private val json = "application/json".toMediaType()

    private suspend fun post(path: String, body: JSONObject): String = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(base + path).post(body.toString().toRequestBody(json)).build()
        http.newCall(req).execute().use { res ->
            val text = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                val msg = runCatching { JSONObject(text).let { it.optString("message").ifBlank { it.optString("error") } } }.getOrNull()
                throw ApiException(res.code, translate(msg?.ifBlank { null }, res.code))
            }
            text
        }
    }

    private suspend fun get(path: String): String = withContext(Dispatchers.IO) {
        http.newCall(Request.Builder().url(base + path).build()).execute().use { res ->
            val text = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(res.code, "Error ${res.code}")
            text
        }
    }

    private fun translate(msg: String?, code: Int): String = when {
        msg == null -> if (code == 401) "Inicia sesión para continuar" else "Error de conexión ($code)"
        msg.contains("Invalid email or password", true) -> "Correo o contraseña incorrectos"
        msg.contains("Email not verified", true) -> "Verifica tu correo antes de iniciar sesión"
        msg.contains("Unauthorized", true) || msg.contains("Unauthenticated", true) -> "Inicia sesión para continuar"
        else -> msg
    }

    suspend fun call(name: String, args: JSONObject = JSONObject()): Any? {
        val text = post("/api/function/$name", args)
        if (text.isBlank() || text == "null") return null
        if (text == "true" || text == "false") return text.toBoolean()
        return if (text.trimStart().startsWith("[")) JSONArray(text) else JSONObject(text)
    }

    private fun Any?.asArray(key: String = "items"): JSONArray =
        when (this) { is JSONArray -> this; is JSONObject -> optJSONArray(key) ?: JSONArray(); else -> JSONArray() }

    // Catálogo
    suspend fun featured() = call("movies.getFeatured").asArray().objects().map { Parse.movie(base, it) }
    suspend fun trending() = call("movies.getTrending").asArray().objects().map { Parse.movie(base, it) }
    suspend fun movies(genre: String? = null, limit: Int = 40, offset: Int = 0) =
        call("movies.list", JSONObject().put("limit", limit).put("offset", offset).apply { if (genre != null) put("genre", genre) })
            .asArray().objects().map { Parse.movie(base, it) }
    suspend fun series() = call("movies.listSeries").asArray().objects().map { Parse.movie(base, it).copy(kind = Kind.SERIES) }
    suspend fun byGenre(genre: String) = call("movies.getByGenre", JSONObject().put("genre", genre).put("limit", 20)).asArray().objects().map { Parse.movie(base, it) }
    suspend fun genres(): List<String> = call("movies.getGenres").asArray().let { a -> (0 until a.length()).map { a.optString(it) } }
    suspend fun search(q: String) = call("movies.search", JSONObject().put("q", q).put("limit", 40)).asArray().objects().map { Parse.movie(base, it) }
    // ---- Paginación en servidor ----
    private fun <T> page(raw: Any?, map: (JSONObject) -> T?): Page<T> {
        val o = raw as? JSONObject ?: return Page(emptyList(), 0, 0, 0, false)
        val items = o.optJSONArray("items")?.objects()?.mapNotNull(map).orEmpty()
        return Page(items, o.optInt("total", items.size), o.optInt("offset", 0), o.optInt("limit", items.size), o.optBoolean("hasMore", false))
    }

    /** Catálogo/búsqueda paginados (movies.page). Sin texto ni filtros + sort=popular = populares. */
    suspend fun moviesPage(offset: Int, limit: Int = PAGE_SIZE, mediaType: String? = "movie", genre: String? = null, search: String? = null, sort: String? = null): Page<Title> {
        val args = JSONObject().put("offset", offset).put("limit", limit)
        mediaType?.let { args.put("mediaType", it) }
        genre?.let { args.put("genre", it) }
        search?.takeIf { it.isNotBlank() }?.let { args.put("search", it) }
        sort?.let { args.put("sort", it) }
        return page(call("movies.page", args)) { o -> Parse.movie(base, o).let { if (mediaType == "series") it.copy(kind = Kind.SERIES) else it } }
    }
    suspend fun animePage(offset: Int, limit: Int = PAGE_SIZE, search: String? = null): Page<Title> {
        val args = JSONObject().put("offset", offset).put("limit", limit)
        search?.takeIf { it.isNotBlank() }?.let { args.put("search", it) }
        return page(call("anime.listSeriesPage", args)) { Parse.anime(base, it) }
    }
    suspend fun favoritesPage(offset: Int, limit: Int = PAGE_SIZE): Page<Title> =
        page(call("favorites.listByUserPage", JSONObject().put("offset", offset).put("limit", limit))) { Parse.movie(base, it) }
    suspend fun historyPage(offset: Int, limit: Int = PAGE_SIZE): Page<Title> =
        page(call("history.listByUserPage", JSONObject().put("offset", offset).put("limit", limit))) { h ->
            val m = h.optJSONObject("movie") ?: return@page null
            val dur = h.optDouble("duration", 0.0)
            Parse.movie(base, m).copy(progress = if (dur > 0) (h.optDouble("progress", 0.0) / dur).toFloat().coerceIn(0f, 1f) else 0f)
        }
    suspend fun channelsPage(offset: Int, limit: Int = PAGE_SIZE, category: String? = null): Page<Channel> {
        val args = JSONObject().put("offset", offset).put("limit", limit)
        category?.let { args.put("category", it) }
        return page(call("tv.list", args)) { Parse.channel(base, it) }
    }

    suspend fun channelCategories(): List<String> {
        val raw = call("tv.getCategories")
        val array = raw as? JSONArray ?: return emptyList()
        return (0 until array.length()).map { array.optString(it) }.filter { it.isNotBlank() }
    }

    suspend fun movie(id: String) = (call("movies.getById", JSONObject().put("id", id)) as? JSONObject)?.let { Parse.movie(base, it) }
    suspend fun animeList(limit: Int = 60) = call("anime.list", JSONObject().put("limit", limit)).asArray().objects().map { Parse.anime(base, it) }
    suspend fun anime(id: String) = (call("anime.getById", JSONObject().put("id", id)) as? JSONObject)?.let { Parse.anime(base, it) }
    suspend fun searchAnime(q: String) = call("anime.search", JSONObject().put("q", q)).asArray().objects().map { Parse.anime(base, it) }

    /** Devuelve la URL HLS (proxy /api/anime/stream) y subtítulos de un episodio. */
    suspend fun animeEpisode(animeId: String, episode: Int, dub: Boolean = false): Pair<String, List<Subtitle>>? {
        val o = call("anime.getEpisodeStream", JSONObject().put("animeId", animeId).put("episodeNumber", episode).put("dub", dub)) as? JSONObject ?: return null
        if (o.optString("kind") != "hls") return null
        val src = o.optJSONArray("sources")?.objects()?.firstOrNull() ?: return null
        val url = Parse.absolute(base, src.str("url")) ?: return null
        val subs = o.optJSONArray("subtitles")?.objects()?.mapNotNull { s ->
            Parse.absolute(base, s.str("url"))?.let { Subtitle(s.str("lang") ?: s.str("label") ?: "Subtítulos", s.str("lang") ?: "es", it) }
        } ?: emptyList()
        return url to subs
    }

    // TV en vivo
    suspend fun channels() = call("tv.list", JSONObject().put("limit", 500)).asArray().objects().map { Parse.channel(base, it) }
    fun channelStreamUrl(id: String) = "$base/api/tv/stream/$id"

    // Usuario
    suspend fun me(): Me? {
        val o = call("users.me") as? JSONObject ?: return null
        return Me(o.str("_id") ?: "", o.str("email") ?: "", o.str("name") ?: "", o.str("role") ?: "USER", o.str("planId"))
    }
    suspend fun favorites() = call("favorites.listByUser").asArray().objects().mapNotNull { (it.optJSONObject("movie") ?: it).let { m -> Parse.movie(base, m) } }
    suspend fun isFavorite(id: String) = call("favorites.check", JSONObject().put("movieId", id)) == true
    suspend fun setFavorite(id: String, on: Boolean) { call(if (on) "favorites.add" else "favorites.remove", JSONObject().put("movieId", id)) }
    suspend fun history() = call("history.listByUser").asArray().objects().mapNotNull { h ->
        val m = h.optJSONObject("movie") ?: return@mapNotNull null
        val dur = h.optDouble("duration", 0.0)
        Parse.movie(base, m).copy(progress = if (dur > 0) (h.optDouble("progress", 0.0) / dur).toFloat().coerceIn(0f, 1f) else 0f)
    }

    /**
     * URL reproducible, igual que la web y apps/android-tv: con token llama primero a
     * /api/stream/resolve (master.m3u8 multicalidad) y usa videoUrl solo si el resolver falla.
     */
    suspend fun playableUrl(t: Title): String? =
        StreamResolution.pick(base, t.videoUrl, t.token) { token -> resolveStream(token) }

    private suspend fun resolveStream(token: String): ResolveReply = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(base + "/api/stream/resolve?token=" + java.net.URLEncoder.encode(token, "UTF-8")).build()
        try {
            http.newCall(req).execute().use { res ->
                val text = res.body?.string().orEmpty()
                ResolveReply(res.code, runCatching { JSONObject(text).str("url") }.getOrNull())
            }
        } catch (e: java.io.IOException) {
            ResolveReply(0)
        }
    }
    suspend fun saveProgress(movieId: String, progressSec: Long, durationSec: Long) {
        runCatching { call("history.upsert", JSONObject().put("movieId", movieId).put("progress", progressSec).put("duration", durationSec)) }
    }
    suspend fun plans() = call("subscriptions.list").asArray().objects().map { Parse.plan(it) }
    suspend fun checkoutUrl(planId: String): String? = (call("stripe.createCheckoutSession", JSONObject().put("planId", planId)) as? JSONObject)?.str("url")

    // Autenticación (better-auth, mismas cookies que la web)
    suspend fun signInEmail(email: String, password: String) {
        post("/api/auth/sign-in/email", JSONObject().put("email", email.trim().lowercase()).put("password", password))
    }
    suspend fun signOut() {
        runCatching { post("/api/auth/sign-out", JSONObject()) }
        session.clear()
    }

    // Login con Google (celular): la web emite un código de un solo uso y la app lo canjea.
    val googleLogin = GoogleLoginFlow(context.applicationContext, base)
    suspend fun exchangeGoogleCode(cb: GoogleCallback) {
        val o = JSONObject(post("/api/app-auth/exchange", JSONObject().put("code", cb.code).put("state", cb.state).put("verifier", cb.verifier)))
        storeCookieFallback(o)
    }

    /** Login nativo (Credential Manager), paso 1: nonce de un solo uso + client id OAuth web. */
    suspend fun googleNonce(): GoogleNonce {
        val o = JSONObject(post("/api/app-auth/google/nonce", JSONObject()))
        return GoogleNonce(o.getString("nonce"), o.getString("clientId"))
    }
    /** Paso 2: el servidor verifica el ID token de Google y crea la sesión (igual que el canje del código). */
    suspend fun signInGoogleIdToken(idToken: String) {
        val o = JSONObject(post("/api/app-auth/google/id-token", JSONObject().put("idToken", idToken)))
        storeCookieFallback(o)
    }
    private fun storeCookieFallback(o: JSONObject) {
        // El servidor ya envía Set-Cookie (lo guarda el CookieJar). Respaldo: cookieValue firmado.
        val name = o.str("cookieName"); val value = o.str("cookieValue")
        if (!session.hasSession && name != null && value != null) {
            session.putSessionCookie(base.removePrefix("https://").removePrefix("http://"), name, java.net.URLEncoder.encode(value, "UTF-8"))
        }
    }

    // Emparejamiento (link-tv / TvPairing): usado por la TV
    suspend fun createPairing(): Pairing {
        val o = JSONObject(post("/api/tv-auth/pairing", JSONObject().put("deviceId", deviceId)))
        return Pairing(o.getString("code"), o.optString("displayCode"), o.optString("deviceId", deviceId), o.optString("verifyUrl"), o.optString("expiresAt"))
    }
    suspend fun pairingStatus(p: Pairing): String =
        JSONObject(get("/api/tv-auth/pairing?code=${p.code}&deviceId=${p.deviceId}")).optString("status")
    suspend fun claimPairing(p: Pairing) {
        val o = JSONObject(post("/api/tv-auth/claim", JSONObject().put("code", p.code).put("deviceId", p.deviceId)))
        storeCookieFallback(o)
    }
    fun qrUrl(data: String) = "$base/api/tv-auth/qr?format=png&data=" + java.net.URLEncoder.encode(data, "UTF-8")

    companion object {
        @Volatile private var instance: PelisApi? = null
        fun get(context: Context): PelisApi = instance ?: synchronized(this) {
            instance ?: PelisApi(context).also { instance = it }
        }
    }
}

const val PAGE_SIZE = 30
