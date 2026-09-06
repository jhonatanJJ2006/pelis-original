package pro.verpelis.tv.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
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
import java.util.concurrent.TimeUnit

class PelisApiClient(private val sessionStore: SessionStore) {
    val baseUrl: String = BuildConfig.API_BASE_URL

    private val cookieJar = object : CookieJar {
        private val memory = LinkedHashMap<String, List<Cookie>>()

        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            memory[url.host] = cookies
            val session = cookies.firstOrNull { it.name.contains("session", ignoreCase = true) }
            if (session != null) {
                sessionStore.sessionCookie = "${session.name}=${session.value}"
                sessionStore.sessionToken = session.value
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
                            .build(),
                    )
                }
            }
            return memory[url.host].orEmpty()
        }
    }

    private val authInterceptor = Interceptor { chain ->
        val builder = chain.request().newBuilder()
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
        val json = """{"deviceId":"$deviceId"}"""
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
        val json = """{"code":"$code","deviceId":"$deviceId"}"""
        return postJson("api/tv-auth/claim", json, PairingClaimResponse::class.java)
    }

    suspend fun apkAvailability(): TvApkAvailability {
        val request = Request.Builder().url("${baseUrl}api/app/availability").get().build()
        return execute(request, TvApkAvailability::class.java)
    }

    private fun <T> postJson(path: String, json: String, clazz: Class<T>): T {
        val request = Request.Builder()
            .url(baseUrl + path)
            .post(json.toRequestBody(JSON))
            .build()
        return execute(request, clazz)
    }

    private fun <T> execute(request: Request, clazz: Class<T>): T {
        okHttp.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            val parsed = moshi.adapter(clazz).fromJson(body)
                ?: error("Respuesta vacía (${response.code})")
            return parsed
        }
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()
    }
}
