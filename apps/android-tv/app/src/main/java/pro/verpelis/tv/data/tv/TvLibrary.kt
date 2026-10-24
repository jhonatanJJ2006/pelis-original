package pro.verpelis.tv.data.tv

import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.playback.TitleKind

/** Catálogo con pantalla propia en el menú lateral. */
enum class CatalogKind(val title: String) { MOVIES("Películas"), SERIES("Series"), ANIME("Anime") }

/** Fila de history.listByUser (las fechas llegan como texto ISO). */
data class HistoryRowDto(
    val movieId: String = "",
    val progress: Double = 0.0,
    val duration: Double = 0.0,
    val lastWatched: String? = null,
    val movie: TitleDto? = null,
) {
    val fraction: Float get() = if (duration > 0) (progress / duration).toFloat().coerceIn(0f, 1f) else 0f
}

/** Plan (subscriptions.list); solo lectura en la TV: los pagos siguen en la web. */
data class PlanDto(
    @com.squareup.moshi.Json(name = "_id") val id: String = "",
    val name: String? = null,
    val price: Double? = null,
    val months: Double? = null,
    val maxDevices: Double? = null,
    val description: String? = null,
)

fun TitleDto.toCatalogItem(): CatalogItem =
    CatalogItem(
        id = id,
        name = name,
        title = title,
        image = image,
        backdropImage = backdropImage,
        synopsis = synopsis,
        genre = genre,
        classification = classification,
        mediaType = mediaType,
        releaseYear = yearText.ifBlank { releaseYear },
    )

const val CATALOG_PAGE = 48

/** Respuesta paginada del servidor ({ items, total, offset, limit, hasMore }). */
data class PageDto<T>(val items: List<T> = emptyList(), val total: Int = 0, val hasMore: Boolean = false)

internal suspend inline fun <reified T> TvRepository.fetchPage(name: String, body: String): PageDto<T> {
    val text = call(name, body)
    return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) {
        if (text.isBlank() || text == "null") return@withContext PageDto<T>()
        val type = com.squareup.moshi.Types.newParameterizedType(PageDto::class.java, T::class.java)
        moshi.adapter<PageDto<T>>(type).fromJson(text) ?: PageDto()
    }
}

/** Una página del catálogo, paginada en el servidor (movies.page / anime.listSeriesPage). */
suspend fun TvRepository.catalogPage(kind: CatalogKind, genre: String?, offset: Int, limit: Int = CATALOG_PAGE): PageDto<TitleDto> {
    val g = genre?.let { ""","genre":${quote(it)}""" }.orEmpty()
    return when (kind) {
        CatalogKind.MOVIES -> fetchPage("movies.page", """{"mediaType":"movie","limit":$limit,"offset":$offset$g}""")
        CatalogKind.SERIES -> fetchPage("movies.page", """{"mediaType":"series","limit":$limit,"offset":$offset$g}""")
        CatalogKind.ANIME -> fetchPage("anime.listSeriesPage", """{"limit":$limit,"offset":$offset$g}""")
    }
}

/** Búsqueda paginada; sin texto devuelve las películas populares. */
suspend fun TvRepository.searchPage(query: String, offset: Int, limit: Int = CATALOG_PAGE): PageDto<TitleDto> {
    val q = query.trim()
    return if (q.isEmpty()) {
        fetchPage("movies.page", """{"mediaType":"movie","sort":"popular","limit":$limit,"offset":$offset}""")
    } else {
        fetchPage("movies.page", """{"search":${quote(q)},"limit":$limit,"offset":$offset}""")
    }
}

suspend fun TvRepository.catalogGenres(kind: CatalogKind): List<String> = when (kind) {
    CatalogKind.MOVIES -> fetchList<String>("movies.getGenres", """{"mediaType":"movie"}""")
    CatalogKind.ANIME -> fetchList<String>("anime.getGenres")
    CatalogKind.SERIES -> SeriesCache.get(this).flatMap { it.genreList }.groupingBy { it }.eachCount()
        .entries.sortedByDescending { it.value }.map { it.key }
}.filter { it.isNotBlank() }

val TitleDto.genreList: List<String>
    get() = genreText.split(',').map { it.trim() }.filter { it.isNotEmpty() }

private object SeriesCache {
    private var items: List<TitleDto>? = null
    private var at = 0L
    suspend fun get(repo: TvRepository): List<TitleDto> {
        items?.let { if (System.currentTimeMillis() - at < 15 * 60_000) return it }
        val loaded = repo.fetchList<TitleDto>("movies.listSeries")
        items = loaded
        at = System.currentTimeMillis()
        return loaded
    }
}

// ---- Mi lista / Historial / Perfil ----
suspend fun TvRepository.favorites(): List<TitleDto> = fetchList("favorites.listByUser")
suspend fun TvRepository.favoritesPage(offset: Int, limit: Int = CATALOG_PAGE): PageDto<TitleDto> =
    fetchPage("favorites.listByUserPage", """{"limit":$limit,"offset":$offset}""")
suspend fun TvRepository.isFavorite(movieId: String): Boolean = call("favorites.check", """{"movieId":${quote(movieId)}}""").trim() == "true"
suspend fun TvRepository.addFavorite(movieId: String) { call("favorites.add", """{"movieId":${quote(movieId)}}""") }
suspend fun TvRepository.removeFavorite(movieId: String) { call("favorites.remove", """{"movieId":${quote(movieId)}}""") }

suspend fun TvRepository.history(): List<HistoryRowDto> = fetchList<HistoryRowDto>("history.listByUser").filter { it.movie != null }
suspend fun TvRepository.historyPage(offset: Int, limit: Int = CATALOG_PAGE): PageDto<HistoryRowDto> =
    fetchPage<HistoryRowDto>("history.listByUserPage", """{"limit":$limit,"offset":$offset}""").let { p -> p.copy(items = p.items.filter { it.movie != null }) }
suspend fun TvRepository.removeHistory(movieId: String) { call("history.remove", """{"movieId":${quote(movieId)}}""") }
suspend fun TvRepository.clearHistory() { call("history.clearAll") }

suspend fun TvRepository.plans(): List<PlanDto> = fetchList("subscriptions.list")

// ---- Ficha: más como esto y temporadas de anime ----
data class SeasonDto(
    @com.squareup.moshi.Json(name = "_id") val id: String = "",
    val title: String? = null,
    val seasonLabel: String? = null,
    val isExtra: Boolean? = null,
)

data class AnimeSeriesDto(val seasons: List<SeasonDto> = emptyList())

/** Títulos del mismo género (movies.getByGenre / anime.list), sin el actual. */
suspend fun TvRepository.similar(kind: TitleKind, genre: String, excludeId: String): List<TitleDto> {
    val g = genre.split(',').map { it.trim() }.firstOrNull { it.isNotEmpty() } ?: return emptyList()
    val items: List<TitleDto> = if (kind == TitleKind.ANIME) {
        fetchList("anime.list", """{"genre":${quote(g)},"limit":13}""")
    } else {
        fetchList("movies.getByGenre", """{"genre":${quote(g)},"limit":13}""")
    }
    return items.filter { it.id != excludeId }.take(12)
}

suspend fun TvRepository.animeSeasons(id: String): List<SeasonDto> {
    val text = call("anime.getSeries", """{"id":${quote(id)}}""")
    if (text.isBlank() || text == "null") return emptyList()
    return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) {
        moshi.adapter(AnimeSeriesDto::class.java).fromJson(text)?.seasons.orEmpty()
    }
}

object TvLibraryMappers {
    fun TitleDto.item(): CatalogItem = toCatalogItem()
}
