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

    private val cookieJar = object : CookieJar {
        private val memory = LinkedHashMap<String, List<Cookie>>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            memory[url.host] = cookies
            val session = pickSessionCookie(cookies)
            if (session != null) {
                sessionStore.persistClaim(session.name, session.value)
            }
        }

        override fun loadForRequest(url: HttpUrl): List<Cookie> {
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
        val builder = chain.request().newBuilder()
            .header("User-Agent", USER_AGENT)
            .header("Accept", "application/json")
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

        fun friendlyNetworkError(ex: Throwable): String {
            val root = generateSequence(ex) { it.cause }.last()
            return when (root) {
                is UnknownHostException -> "Sin DNS/red hacia el servidor"
                is SocketTimeoutException -> "Tiempo de espera agotado"
                is android.os.NetworkOnMainThreadException ->
                    "Error interno de red (hilo principal)"
                is IOException -> root.message?.takeIf { it.isNotBlank() }
                    ?: "Error de conexión. Reintenta."
                else -> root.message?.takeIf { it.isNotBlank() }
                    ?: "Error de conexión. Reintenta."
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
