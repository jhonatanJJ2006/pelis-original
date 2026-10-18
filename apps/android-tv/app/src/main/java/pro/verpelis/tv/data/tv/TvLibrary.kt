package pro.verpelis.tv.data.tv

import pro.verpelis.tv.data.api.CatalogItem

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
    CatalogItem(id = id, name = name, title = title, image = image, synopsis = synopsis, mediaType = mediaType, releaseYear = yearText)

const val CATALOG_PAGE = 48

/** Una página del catálogo. Series: el API las da todas (≈40), se filtran y cortan aquí. */
suspend fun TvRepository.catalogPage(kind: CatalogKind, genre: String?, offset: Int, limit: Int = CATALOG_PAGE): List<TitleDto> {
    val g = genre?.let { ""","genre":${quote(it)}""" }.orEmpty()
    return when (kind) {
        CatalogKind.MOVIES -> fetchList("movies.list", """{"mediaType":"movie","limit":$limit,"offset":$offset$g}""")
        CatalogKind.ANIME -> fetchList("anime.listSeries", """{"limit":$limit,"offset":$offset$g}""")
        CatalogKind.SERIES -> {
            val all = SeriesCache.get(this)
            val filtered = if (genre == null) all else all.filter { s -> s.genreList.any { it.equals(genre, ignoreCase = true) } }
            filtered.drop(offset).take(limit)
        }
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
suspend fun TvRepository.isFavorite(movieId: String): Boolean = call("favorites.check", """{"movieId":${quote(movieId)}}""").trim() == "true"
suspend fun TvRepository.addFavorite(movieId: String) { call("favorites.add", """{"movieId":${quote(movieId)}}""") }
suspend fun TvRepository.removeFavorite(movieId: String) { call("favorites.remove", """{"movieId":${quote(movieId)}}""") }

suspend fun TvRepository.history(): List<HistoryRowDto> = fetchList<HistoryRowDto>("history.listByUser").filter { it.movie != null }
suspend fun TvRepository.removeHistory(movieId: String) { call("history.remove", """{"movieId":${quote(movieId)}}""") }
suspend fun TvRepository.clearHistory() { call("history.clearAll") }

suspend fun TvRepository.plans(): List<PlanDto> = fetchList("subscriptions.list")
