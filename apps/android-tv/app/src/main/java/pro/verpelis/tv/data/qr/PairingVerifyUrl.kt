package pro.verpelis.tv.data.qr

import android.net.Uri
import java.util.Locale

/**
 * Builds the absolute URL encoded in the TV pairing QR.
 *
 * The API may echo a private Host (localhost / LAN) when Next runs behind the
 * Movies tunnel or when the APK talks to a LAN IP. Phones cannot open those
 * hosts, so we rewrite to the public API base (or verpelis.pro) when needed.
 */
object PairingVerifyUrl {
    private const val PUBLIC_FALLBACK = "https://verpelis.pro"
    private val PRIVATE_HOST = Regex(
        """^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\])$""",
        RegexOption.IGNORE_CASE,
    )

    fun isPrivateOrLocalHost(host: String?): Boolean {
        if (host.isNullOrBlank()) return true
        val normalized = host.trim().lowercase(Locale.US).removePrefix("[").removeSuffix("]")
        if (normalized.endsWith(".local")) return true
        return PRIVATE_HOST.matches(normalized)
    }

    fun resolve(verifyUrl: String?, code: String, apiBaseUrl: String): String {
        val trimmedCode = code.trim()
        val fromApi = verifyUrl?.trim().orEmpty()
        if (fromApi.isNotEmpty()) {
            val parsed = runCatching { Uri.parse(fromApi) }.getOrNull()
            val host = parsed?.host
            if (parsed != null && !isPrivateOrLocalHost(host)) {
                return fromApi
            }
        }

        val base = apiBaseUrl.trim().let { if (it.endsWith("/")) it.dropLast(1) else it }
        val baseUri = runCatching { Uri.parse(if (base.contains("://")) base else "https://$base") }.getOrNull()
        val publicBase =
            if (baseUri != null && !isPrivateOrLocalHost(baseUri.host)) {
                "${baseUri.scheme}://${baseUri.authority}"
            } else {
                PUBLIC_FALLBACK
            }

        val safeCode = Uri.encode(trimmedCode)
        return "$publicBase/link-tv?code=$safeCode"
    }
}
