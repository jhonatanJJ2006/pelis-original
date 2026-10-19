package pro.verpelis.tv.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.data.SessionStore
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

class PelisApiClient(private val sessionStore: SessionStore) {
    val baseUrl: String = BuildConfig.API_BASE_URL

    /** Solo nuestro dominio recibe la sesión: los CDN de anime e imágenes no. */
    private val apiHost: String? = runCatching { baseUrl.toHttpUrl().host }.getOrNull()

    private fun isApiHost(url: HttpUrl): Boolean = apiHost != null && url.host.equals(apiHost, ignoreCase = true)

    private val cookieJar = object : CookieJar {
        private val memory = LinkedHashMap<String, List<Cookie>>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            memory[url.host] = cookies
            val session = pickSessionCookie(cookies)
            if (session != null) {
                sessionStore.persistCookie(session.name, session.value)
            }
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
            if (!isApiHost(url)) return memory[url.host].orEmpty()
            val stored = sessionStore.sessionCookie
            if (stored != null) {
                val parts = stored.split("=", limit = 2)
                if (parts.size == 2) {
                    return listOf(
                        Cookie.Builder()
                            .name(parts[0])
                            .value(parts[1])
                            .domain(url.host)
                            .path("/")
                            .secure()
                            .build(),
                    )
                }
            }
            return memory[url.host].orEmpty()
        }
    }

    private val authInterceptor = Interceptor { chain ->
        if (!isApiHost(chain.request().url)) {
            return@Interceptor chain.proceed(chain.request().newBuilder().header("User-Agent", USER_AGENT).build())
        }
        val builder = chain.request().newBuilder()
            .header("User-Agent", USER_AGENT)
            .header("Accept", "application/json")
            // Better Auth exige Origin cuando la petición lleva cookie (CSRF): sin él,
            // volver a iniciar sesión con una cookie guardada fallaba con "Missing or null Origin".
            .header("Origin", baseUrl.trimEnd('/'))
        sessionStore.sessionToken?.let { builder.header("Authorization", "Bearer $it") }
        chain.proceed(builder.build())
    }

    val okHttp: OkHttpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .addInterceptor(authInterceptor)
        .addInterceptor(
            HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC },
        )
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    /**
     * Imágenes (Coil): sin sesión ni log por petición; comparte el pool de conexiones
     * con el API para no abrir sockets nuevos al bajar posters.
     */
    val imageHttp: OkHttpClient = okHttp.newBuilder().apply {
        interceptors().clear()
        cookieJar(CookieJar.NO_COOKIES)
        addInterceptor(Interceptor { chain ->
            chain.proceed(
                chain.request().newBuilder()
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "image/webp,image/*;q=0.8")
                    .build(),
            )
        })
    }.build()

    /** No logging interceptor: the QR payload is the pairing URL and must not land in logcat. */
    private val quietHttp: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    val api: PelisApi = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttp)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()
        .create(PelisApi::class.java)

    fun mediaUrlFor(channelId: String): String = "${baseUrl}api/tv/stream/$channelId"

    fun apkDownloadUrl(): String = "${baseUrl}downloads/pelis-tv.apk"

    suspend fun createPairing(deviceId: String): PairingCreateResponse {
        val escaped = escapeJson(deviceId)
        val json = """{"deviceId":"$escaped"}"""
        return postJson("api/tv-auth/pairing", json, PairingCreateResponse::class.java)
    }

    /**
     * PNG of the pairing QR. Used only when on-device encoding fails.
     * Does not log the payload (it contains the pairing code).
     */
    suspend fun fetchQrPng(payload: String): ByteArray? = withContext(Dispatchers.IO) {
        if (payload.isBlank() || payload.length > 512) return@withContext null
        val url = baseUrl.toHttpUrl()
            .newBuilder()
            .addPathSegments("api/tv-auth/qr")
            .addQueryParameter("format", "png")
            .addQueryParameter("data", payload)
            .build()
        val request = Request.Builder()
            .url(url)
            .header("Accept", "image/png")
            .get()
            .build()
        try {
            quietHttp.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val bytes = response.body?.bytes() ?: return@withContext null
                if (bytes.size < 32 || bytes[0] != 0x89.toByte() || bytes[1] != 0x50.toByte()) {
                    return@withContext null
                }
                bytes
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun pairingStatus(code: String, deviceId: String): PairingStatusResponse {
        val url = baseUrl.toHttpUrl()
            .newBuilder()
            .addPathSegments("api/tv-auth/pairing")
            .addQueryParameter("code", code)
            .addQueryParameter("deviceId", deviceId)
            .build()
        val request = Request.Builder().url(url).get().build()
        return execute(request, PairingStatusResponse::class.java)
    }

    suspend fun claimPairing(code: String, deviceId: String): PairingClaimResponse {
        val json = """{"code":"${escapeJson(code)}","deviceId":"${escapeJson(deviceId)}"}"""
        return postJson("api/tv-auth/claim", json, PairingClaimResponse::class.java)
    }

    /** Abre una sesión de teclado del celular. `null` si no se pudo (sin red, límite). */
    suspend fun createTvKeyboard(): TvKeyboardSession? = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(baseUrl + "api/tv-keyboard")
            .post("{}".toRequestBody(JSON)).header("User-Agent", USER_AGENT).build()
        try {
            quietHttp.newCall(request).execute().use { r ->
                if (!r.isSuccessful) return@withContext null
                moshi.adapter(TvKeyboardSession::class.java).fromJson(r.body?.string().orEmpty())
                    ?.takeIf { it.code.isNotBlank() && it.url.isNotBlank() }
            }
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Texto que llegó del celular. `expired = true` si el código venció (404);
     * `null` si falló la red. Sin registro en logcat: corre cada segundo.
     */
    suspend fun pollTvKeyboard(code: String, version: Int): TvKeyboardPoll? = withContext(Dispatchers.IO) {
        val url = baseUrl.toHttpUrl().newBuilder().addPathSegments("api/tv-keyboard")
            .addQueryParameter("code", code).addQueryParameter("v", version.toString()).build()
        val request = Request.Builder().url(url).get().header("User-Agent", USER_AGENT).build()
        try {
            quietHttp.newCall(request).execute().use { r ->
                when {
                    r.code == 404 -> TvKeyboardPoll(expired = true)
                    !r.isSuccessful -> null
                    else -> moshi.adapter(TvKeyboardPoll::class.java).fromJson(r.body?.string().orEmpty())
                }
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun apkAvailability(): TvApkAvailability {
        val request = Request.Builder().url("${baseUrl}api/app/availability").get().build()
        return execute(request, TvApkAvailability::class.java)
    }

    suspend fun signInEmail(email: String, password: String): AuthResult {
        val json = """{"email":"${escapeJson(email)}","password":"${escapeJson(password)}"}"""
        return authEmail("api/auth/sign-in/email", json, forSignUp = false)
    }

    suspend fun signUpEmail(email: String, password: String, name: String): AuthResult {
        val json =
            """{"email":"${escapeJson(email)}","password":"${escapeJson(password)}","name":"${escapeJson(name)}"}"""
        return authEmail("api/auth/sign-up/email", json, forSignUp = true)
    }

    suspend fun sendVerificationOtp(email: String): OtpResult = withContext(Dispatchers.IO) {
        try {
            val json = """{"email":"${escapeJson(email)}","type":"email-verification"}"""
            val request = Request.Builder()
                .url(baseUrl + "api/auth/email-otp/send-verification-otp")
                .post(json.toRequestBody(JSON))
                .header("Content-Type", "application/json")
                .build()
            okHttp.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                val parsed = runCatching {
                    moshi.adapter(OtpSendResponse::class.java).fromJson(body)
                }.getOrNull()
                if (response.isSuccessful && parsed?.success == true) {
                    return@withContext OtpResult(ok = true)
                }
                val message = parsed?.message ?: parsed?.error
                    ?: "No se pudo enviar el código (${response.code})"
                val cooldown = if (response.code == 429) {
                    Regex("""(\d+)\s*segundos""").find(message)?.groupValues?.getOrNull(1)?.toIntOrNull()
                        ?: 30
                } else null
                OtpResult(ok = false, error = message, cooldownSeconds = cooldown)
            }
        } catch (ex: Exception) {
            OtpResult(ok = false, error = friendlyNetworkError(ex))
        }
    }

    suspend fun verifyEmailOtp(email: String, otp: String): OtpResult = withContext(Dispatchers.IO) {
        try {
            val json = """{"email":"${escapeJson(email)}","otp":"${escapeJson(otp)}"}"""
            val request = Request.Builder()
                .url(baseUrl + "api/auth/email-otp/verify-email")
                .post(json.toRequestBody(JSON))
                .header("Content-Type", "application/json")
                .build()
            okHttp.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                val parsed = runCatching {
                    moshi.adapter(OtpVerifyResponse::class.java).fromJson(body)
                }.getOrNull()
                if (response.isSuccessful && parsed?.status == true) {
                    // Verify does NOT emit a session token — caller must sign-in again.
                    return@withContext OtpResult(ok = true)
                }
                val message = parsed?.message ?: parsed?.error
                    ?: "Código inválido o expirado (${response.code})"
                OtpResult(ok = false, error = message)
            }
        } catch (ex: Exception) {
            OtpResult(ok = false, error = friendlyNetworkError(ex))
        }
    }

    private suspend fun authEmail(path: String, json: String, forSignUp: Boolean): AuthResult =
        withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url(baseUrl + path)
                    .post(json.toRequestBody(JSON))
                    .header("Content-Type", "application/json")
                    .build()
                okHttp.newCall(request).execute().use { response ->
                    val body = response.body?.string().orEmpty()
                    val parsed = runCatching {
                        moshi.adapter(AuthEmailResponse::class.java).fromJson(body)
                    }.getOrNull()

                    // CookieJar may have already persisted Set-Cookie (__Secure-...).
                    val tokenFromBody = parsed?.token?.takeIf { it.isNotBlank() }
                    val tokenFromStore = sessionStore.sessionToken
                    val token = tokenFromBody ?: tokenFromStore
                    val cookieName = sessionStore.sessionCookie
                        ?.substringBefore("=")
                        ?.takeIf { it.isNotBlank() }
                        ?: SessionStore.DEFAULT_COOKIE_NAME

                    if (response.isSuccessful) {
                        if (!token.isNullOrBlank()) {
                            if (tokenFromBody != null) {
                                sessionStore.persistClaim(cookieName, tokenFromBody)
                            }
                            return@withContext AuthResult(
                                ok = true,
                                token = token,
                                cookieName = cookieName,
                            )
                        }
                        // Sign-up OK but session may be invalid until email verified.
                        if (forSignUp) {
                            return@withContext AuthResult(
                                ok = true,
                                needsEmailVerification = true,
                            )
                        }
                    }

                    val rawMessage = parsed?.message ?: parsed?.error ?: parsed?.code.orEmpty()
                    val needsVerify = rawMessage.contains("verify", ignoreCase = true) ||
                        rawMessage.contains("email", ignoreCase = true) &&
                        rawMessage.contains("verif", ignoreCase = true)

                    val message = when {
                        rawMessage.isNotBlank() -> rawMessage
                        response.code == 401 -> "Correo o contraseña incorrectos"
                        response.code == 400 -> "Revisa correo y contraseña"
                        else -> "No se pudo iniciar sesión (${response.code})"
                    }
                    AuthResult(
                        ok = false,
                        needsEmailVerification = needsVerify,
                        error = message,
                    )
                }
            } catch (ex: Exception) {
                AuthResult(ok = false, error = friendlyNetworkError(ex))
            }
        }

    private suspend fun <T> postJson(path: String, json: String, clazz: Class<T>): T {
        val request = Request.Builder()
            .url(baseUrl + path)
            .post(json.toRequestBody(JSON))
            .header("Content-Type", "application/json")
            .build()
        return execute(request, clazz)
    }

    private suspend fun <T> execute(request: Request, clazz: Class<T>): T = withContext(Dispatchers.IO) {
        try {
            okHttp.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val snippet = body.trim().take(160).ifBlank { "sin cuerpo" }
                    throw IOException(
                        friendlyHttpError(response.code, "HTTP ${response.code}: $snippet"),
                    )
                }
                if (body.isBlank()) {
                    error(friendlyHttpError(response.code, "Respuesta vacía"))
                }
                val parsed = try {
                    moshi.adapter(clazz).fromJson(body)
                } catch (ex: Exception) {
                    throw IOException(
                        friendlyHttpError(response.code, "Respuesta inválida: ${ex.message}"),
                        ex,
                    )
                } ?: error(friendlyHttpError(response.code, "Respuesta vacía"))
                parsed
            }
        } catch (ex: Exception) {
            throw IOException(friendlyNetworkError(ex), ex)
        }
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()
        private const val USER_AGENT = "PelisTV/1.2.0 (Android TV; pro.verpelis.tv)"

        private fun escapeJson(value: String): String =
            value.replace("\\", "\\\\").replace("\"", "\\\"")

        private fun pickSessionCookie(cookies: List<Cookie>): Cookie? {
            val secure = cookies.firstOrNull {
                it.name == SessionStore.DEFAULT_COOKIE_NAME
            }
            if (secure != null) return secure
            val plain = cookies.firstOrNull {
                it.name == SessionStore.FALLBACK_COOKIE_NAME
            }
            if (plain != null) return plain
            return cookies.firstOrNull { it.name.contains("session", ignoreCase = true) }
        }

        /** Error de red en español claro (nunca el mensaje técnico del sistema). */
        fun friendlyNetworkError(ex: Throwable): String {
            val chain = generateSequence(ex) { it.cause }.toList()
            fun has(test: (Throwable) -> Boolean) = chain.any(test)
            return when {
                has { it is UnknownHostException } -> "No hay conexión con el servidor. Revisa el internet de tu TV."
                has { it is SocketTimeoutException } -> "El servidor tardó demasiado en responder."
                has { it is android.os.NetworkOnMainThreadException } -> "Error interno de la app. Reintenta."
                has { it is java.net.ConnectException || it is java.net.NoRouteToHostException } ->
                    "No se pudo conectar con el servidor."
                has { it is javax.net.ssl.SSLException } -> "No se pudo abrir una conexión segura con el servidor."
                else -> "Error de conexión. Reintenta."
            }
        }

        private fun friendlyHttpError(code: Int, fallback: String): String {
            return when (code) {
                404 -> "API no encontrada ($code). Revisa la URL base."
                500, 502, 503 -> "Servidor no disponible ($code)"
                else -> "$fallback ($code)"
            }
        }
    }
}
