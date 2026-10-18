package pro.verpelis.tv.data.api

import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path

interface PelisApi {
    @POST("api/function/{name}")
    suspend fun invokeTvList(
        @Path(value = "name", encoded = true) name: String = "tv.list",
        @Body args: TvListArgs = TvListArgs(),
    ): TvListResponse

    @POST("api/function/{name}")
    suspend fun invokeGetCategories(
        @Path(value = "name", encoded = true) name: String = "tv.getCategories",
        @Body args: CategoriesArgs = CategoriesArgs(),
    ): List<String>

    @POST("api/function/{name}")
    suspend fun invokeGetById(
        @Path(value = "name", encoded = true) name: String = "tv.getById",
        @Body args: IdArgs,
    ): TvChannel?

    @POST("api/function/{name}")
    suspend fun invokeCatalog(
        @Path(value = "name", encoded = true) name: String,
        @Body args: CatalogListArgs,
    ): List<CatalogItem>

    /** movies.search ({q, limit}) y anime.search ({query, limit}). */
    @POST("api/function/{name}")
    suspend fun invokeCatalogSearch(
        @Path(value = "name", encoded = true) name: String,
        @Body args: Map<String, @JvmSuppressWildcards Any>,
    ): List<CatalogItem>
}
