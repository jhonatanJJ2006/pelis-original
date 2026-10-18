package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import pro.verpelis.tv.ui.components.TvPivotScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.api.CatalogListArgs
import pro.verpelis.tv.data.api.PelisApi
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.data.api.TvListArgs
import pro.verpelis.tv.ui.components.CatalogRow
import pro.verpelis.tv.ui.components.CategoryRow
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir
import pro.verpelis.tv.ui.theme.MaisonType

private data class PreferredRow(val label: String, val categoryKey: String?, val search: String?)

private data class HomeCatalog(
    val movies: List<CatalogItem> = emptyList(),
    val series: List<CatalogItem> = emptyList(),
    val anime: List<CatalogItem> = emptyList(),
) {
    val isEmpty: Boolean get() = movies.isEmpty() && series.isEmpty() && anime.isEmpty()
}

@Composable
fun HomeScreen(
    onOpenSearch: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenLogin: () -> Unit,
    onPlayChannel: (String, String) -> Unit,
    onOpenTitle: (TitleKind, String) -> Unit,
) {
    val apiClient = LocalApiClient.current
    val uiSounds = LocalUiSounds.current

    // Se conserva al volver de una ficha: la portada no se recarga (caduca a los 15 min).
    remember { HomeCache.expireIfStale() }
    var rows by rememberSaveableRows()
    var catalog by remember { mutableStateOf(HomeCache.catalog) }
    var catalogLoading by remember { mutableStateOf(HomeCache.catalog == null) }
    var rowsLoading by remember { mutableStateOf(HomeCache.rows == null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableStateOf(0) }
    val firstPoster = remember { FocusRequester() }
    var focusedOnce by remember { mutableStateOf(false) }

    // Catálogo primero (3 llamadas en paralelo) y se pinta en cuanto llega; las
    // filas de canales (hasta ~13 llamadas) se cargan después sin bloquear la portada.
    LaunchedEffect(attempt) {
        error = null
        if (catalog == null) {
            catalogLoading = true
            val loaded = runCatching { loadCatalogRows(apiClient.api) }.getOrNull()
            if (loaded != null && !loaded.isEmpty) {
                HomeCache.catalog = loaded
                catalog = loaded
            }
            catalogLoading = false
        }
        if (rows == null) {
            rowsLoading = true
            try {
                val loaded = loadHomeRows(apiClient.api)
                HomeCache.rows = loaded
                rows = loaded
            } catch (ex: Exception) {
                if (catalog == null) error = ex.message ?: "No se pudo cargar el catálogo"
            } finally {
                rowsLoading = false
            }
        }
    }
    LaunchedEffect(catalog) {
        if (catalog != null && !focusedOnce) {
            withFrameNanos { }
            if (runCatching { firstPoster.requestFocus() }.isSuccess) focusedOnce = true
        }
    }

    val openMovie = remember(onOpenTitle) { { item: CatalogItem -> onOpenTitle(TitleKind.MOVIE, item.id) } }
    val openSeries = remember(onOpenTitle) { { item: CatalogItem -> onOpenTitle(TitleKind.SERIES, item.id) } }
    val openAnime = remember(onOpenTitle) { { item: CatalogItem -> onOpenTitle(TitleKind.ANIME, item.id) } }

    Box(Modifier.fillMaxSize().background(MaisonNoir.Background)) {
        Column(Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 48.dp, end = 48.dp, top = 22.dp, bottom = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("PELIS", style = MaisonType.Title.copy(color = MaisonNoir.Gold))
                    Text("MAISON NOIR · EN VIVO Y CATÁLOGO", style = MaisonType.Eyebrow)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TvFocusButton("Buscar", { uiSounds.playClick(); onOpenSearch() })
                    TvFocusButton("Ajustes", { uiSounds.playClick(); onOpenSettings() })
                    TvFocusButton("Cuenta", { uiSounds.playClick(); onOpenLogin() })
                }
            }

            val c = catalog
            val r = rows
            when {
                c == null && catalogLoading -> HomeSkeleton()
                c == null && r.isNullOrEmpty() && error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(error ?: "", color = MaisonNoir.Danger)
                        TvFocusButton("Reintentar", { uiSounds.playClick(); attempt++ }, modifier = Modifier.padding(top = 16.dp))
                    }
                }
                else -> TvPivotScroll(0.18f) {
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(top = 4.dp, bottom = 48.dp),
                    ) {
                        if (c != null && c.movies.isNotEmpty()) {
                            item(key = "catalog-movies", contentType = "catalog") {
                                CatalogRow("Películas", c.movies, openMovie, firstItemFocus = firstPoster)
                            }
                        }
                        if (c != null && c.series.isNotEmpty()) {
                            item(key = "catalog-series", contentType = "catalog") {
                                CatalogRow(
                                    "Series",
                                    c.series,
                                    openSeries,
                                    firstItemFocus = if (c.movies.isEmpty()) firstPoster else null,
                                )
                            }
                        }
                        if (c != null && c.anime.isNotEmpty()) {
                            item(key = "catalog-anime", contentType = "catalog") {
                                CatalogRow("Anime", c.anime, openAnime)
                            }
                        }
                        items(r.orEmpty(), key = { it.first }, contentType = { "channels" }) { (title, channels) ->
                            CategoryRow(
                                title = title,
                                channels = channels,
                                onPlayChannel = { onPlayChannel(it.id, it.name) },
                            )
                        }
                        if (rowsLoading) {
                            item(key = "rows-loading", contentType = "loading") {
                                Text(
                                    "Cargando canales en vivo…",
                                    style = MaisonType.Eyebrow.copy(color = MaisonNoir.Silver),
                                    modifier = Modifier.padding(horizontal = 48.dp, vertical = 18.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Filas en memoria del proceso: volver a la portada es instantáneo. */
private object HomeCache {
    private const val TTL_MS = 15 * 60 * 1000L
    private var at = 0L
    var catalog: HomeCatalog? = null
        set(value) { field = value; at = System.currentTimeMillis() }
    var rows: List<Pair<String, List<TvChannel>>>? = null

    fun expireIfStale() {
        if (catalog != null && System.currentTimeMillis() - at > TTL_MS) {
            catalog = null
            rows = null
        }
    }
}

@Composable
private fun rememberSaveableRows() = remember { mutableStateOf(HomeCache.rows) }

/** Esqueleto ligero (cajas planas, sin animación) mientras llega el catálogo. */
@Composable
private fun HomeSkeleton() {
    Column(Modifier.fillMaxSize().padding(top = 14.dp)) {
        repeat(2) {
            Box(
                Modifier
                    .padding(start = 48.dp, bottom = 14.dp)
                    .size(width = 140.dp, height = 16.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(MaisonNoir.Surface),
            )
            Row(Modifier.padding(start = 48.dp, bottom = 26.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                repeat(7) {
                    Box(
                        Modifier
                            .size(width = 120.dp, height = 180.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaisonNoir.Surface),
                    )
                }
            }
        }
    }
}

private data class HomeLoadLimits(
    val rowSize: Int = 24,
    val extraCategories: Int = 8,
)

private suspend fun loadCatalogRows(api: PelisApi): HomeCatalog = coroutineScope {
    val movies = async {
        runCatching { api.invokeCatalog("movies.list", CatalogListArgs(mediaType = "movie", limit = 18)) }
            .getOrDefault(emptyList())
    }
    val series = async {
        runCatching { api.invokeCatalog("movies.listSeries", CatalogListArgs(limit = 18)) }
            .getOrDefault(emptyList())
    }
    val anime = async {
        runCatching { api.invokeCatalog("anime.list", CatalogListArgs(limit = 18)) }
            .getOrDefault(emptyList())
    }
    HomeCatalog(movies.await(), series.await(), anime.await())
}

private suspend fun loadHomeRows(api: PelisApi): List<Pair<String, List<TvChannel>>> = coroutineScope {
    val limits = HomeLoadLimits()
    val popular = async {
        api.invokeTvList(args = TvListArgs(popularOnly = true, limit = limits.rowSize)).items
    }
    val categories = async { api.invokeGetCategories() }
    val items = popular.await()
    val cats = categories.await()
    val result = mutableListOf<Pair<String, List<TvChannel>>>()
    if (items.isNotEmpty()) result += "Populares" to items

    val used = linkedSetOf<String>()
    val preferred = listOf(
        // Keys must match canonical Spanish labels from tv.getCategories (accents included).
        PreferredRow("Fútbol", "Fútbol", "Fútbol"),
        PreferredRow("Infantil", "Infantil", null),
        PreferredRow("Fórmula 1", "Fórmula 1", "Fórmula"),
        PreferredRow("Lucha libre", "Lucha libre", "Lucha"),
    )
    preferred.map { pref ->
        async {
            val matched = pref.categoryKey?.let { key -> matchCategory(cats, key) }
            val list = when {
                matched != null -> {
                    used += matched
                    api.invokeTvList(args = TvListArgs(category = matched, limit = limits.rowSize)).items
                }
                pref.search != null ->
                    api.invokeTvList(args = TvListArgs(search = pref.search, limit = limits.rowSize)).items
                else -> emptyList()
            }
            pref.label to list
        }
    }.awaitAll().forEach { (label, list) ->
        if (list.isNotEmpty()) result += label to list
    }

    val leftover = cats.filterNot { it in used }.take(limits.extraCategories)
    val gate = Semaphore(3)
    leftover.map { category ->
        async {
            gate.withPermit {
                val list = api.invokeTvList(args = TvListArgs(category = category, limit = limits.rowSize)).items
                category to list
            }
        }
    }.awaitAll()
        .filter { it.second.isNotEmpty() }
        .sortedBy { it.first.lowercase() }
        .forEach { result += it }

    result
}

private fun foldAscii(value: String): String =
    java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .lowercase()

private fun matchCategory(cats: List<String>, key: String): String? {
    val needle = foldAscii(key)
    return cats.firstOrNull { it.equals(key, ignoreCase = true) }
        ?: cats.firstOrNull { foldAscii(it) == needle }
        ?: cats.firstOrNull { foldAscii(it).contains(needle) }
}
