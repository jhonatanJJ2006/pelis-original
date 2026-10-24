package pro.verpelis.tv.data.api

import com.squareup.moshi.Json

data class TvChannel(
    @Json(name = "_id") val id: String = "",
    val name: String = "",
    val logo: String = "",
    val category: String = "General",
    val country: String? = null,
    val language: String? = null,
    val isActive: Boolean = true,
    val isPopular: Boolean? = null,
    val sortOrder: Int? = null,
    val streamStatus: String? = null,
    val streamUrl: String? = null,
    val source: String? = null,
)

data class TvListArgs(
    val category: String? = null,
    val country: String? = null,
    val language: String? = null,
    val search: String? = null,
    val popularOnly: Boolean? = null,
    val streamStatus: String? = null,
    val limit: Int? = null,
    val offset: Int? = null,
)

data class TvListResponse(
    val items: List<TvChannel> = emptyList(),
    val total: Int = 0,
    val offset: Int = 0,
    val limit: Int = 0,
    val hasMore: Boolean = false,
)

data class CategoriesArgs(
    val includeInactive: Boolean? = null,
)

data class IdArgs(
    val id: String,
)

data class CatalogListArgs(
    val mediaType: String? = null,
    val limit: Int? = null,
    val search: String? = null,
)

data class CatalogItem(
    @Json(name = "_id") val id: String = "",
    val name: String? = null,
    val title: String? = null,
    val image: String? = null,
    val backdropImage: String? = null,
    val synopsis: String? = null,
    val genre: Any? = null,
    val classification: String? = null,
    val mediaType: String? = null,
    val releaseYear: String? = null,
) {
    val displayName: String get() = name?.takeIf { it.isNotBlank() } ?: title.orEmpty()
}

/** Defaults prevent Moshi crash on partial/HTML/error JSON → «Error de conexión». */
data class PairingCreateResponse(
    val code: String = "",
    val displayCode: String? = null,
    val deviceId: String = "",
    val expiresAt: String? = null,
    val verifyUrl: String = "",
    val status: String? = null,
    val error: String? = null,
    val message: String? = null,
)

data class PairingStatusResponse(
    val status: String? = null,
    val expiresAt: String? = null,
    val error: String? = null,
    val message: String? = null,
)

data class PairingClaimResponse(
    val ok: Boolean? = null,
    val status: String? = null,
    val token: String? = null,
    val cookieName: String? = null,
    /** Valor firmado de la cookie (lo que Better Auth acepta). */
    val cookieValue: String? = null,
    val error: String? = null,
    val message: String? = null,
)

data class TvApkAvailability(
    val tvApkAvailable: Boolean = false,
    val tvApkVersionCode: Int? = null,
    val tvApkVersionName: String? = null,
    val apkDownloadUrl: String? = null,
    /** Para verificar la descarga antes de abrir el instalador (servidor ≥ 2026-10-18). */
    val tvApkSizeBytes: Long? = null,
    val tvApkSha256: String? = null,
)

data class AuthEmailResponse(
    val user: AuthUser? = null,
    val token: String? = null,
    val redirect: Boolean? = null,
    val code: String? = null,
    val message: String? = null,
    val error: String? = null,
)

data class AuthUser(
    val id: String? = null,
    val email: String? = null,
    val name: String? = null,
)

data class AuthResult(
    val ok: Boolean,
    val token: String? = null,
    val cookieName: String? = null,
    val needsEmailVerification: Boolean = false,
    val error: String? = null,
)

data class OtpSendResponse(
    val success: Boolean? = null,
    val message: String? = null,
    val error: String? = null,
)

data class OtpVerifyResponse(
    val status: Boolean? = null,
    val token: String? = null,
    val user: AuthUser? = null,
    val message: String? = null,
    val error: String? = null,
)

data class OtpResult(
    val ok: Boolean,
    val error: String? = null,
    val cooldownSeconds: Int? = null,
)

/** Sesión del teclado del celular (búsqueda de la TV). */
data class TvKeyboardSession(
    val code: String = "",
    val displayCode: String? = null,
    val url: String = "",
    val expiresAt: String? = null,
)

/** Respuesta de la consulta cada segundo. Sin cambios solo trae `v`. */
data class TvKeyboardPoll(
    val v: Int = -1,
    val text: String? = null,
    val done: Boolean = false,
    val expired: Boolean = false,
)
