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
    val synopsis: String? = null,
    val genre: Any? = null,
    val mediaType: String? = null,
    val releaseYear: String? = null,
) {
    val displayName: String get() = name?.takeIf { it.isNotBlank() } ?: title.orEmpty()
}

data class PairingCreateResponse(
    val code: String,
    val displayCode: String? = null,
    val deviceId: String,
    val expiresAt: String? = null,
    val verifyUrl: String,
    val status: String? = null,
    val error: String? = null,
)

data class PairingStatusResponse(
    val status: String? = null,
    val expiresAt: String? = null,
    val error: String? = null,
)

data class PairingClaimResponse(
    val ok: Boolean? = null,
    val status: String? = null,
    val token: String? = null,
    val cookieName: String? = null,
    val error: String? = null,
)

data class TvApkAvailability(
    val tvApkAvailable: Boolean = false,
    val tvApkVersionCode: Int? = null,
    val tvApkVersionName: String? = null,
    val apkDownloadUrl: String? = null,
)
