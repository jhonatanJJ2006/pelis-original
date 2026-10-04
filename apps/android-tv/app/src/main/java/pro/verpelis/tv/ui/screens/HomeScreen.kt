package pro.verpelis.tv.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.ui.platform.LocalContext
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
import pro.verpelis.tv.data.api.PelisApiClient
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.data.api.TvListArgs
import pro.verpelis.tv.ui.components.CatalogRow
import pro.verpelis.tv.ui.components.CategoryRow
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir

private data class PreferredRow(val label: String, val categoryKey: String?, val search: String?)

private data class HomeCatalog(
    val movies: List<CatalogItem> = emptyList(),
    val series: List<CatalogItem> = emptyList(),
    val anime: List<CatalogItem> = emptyList(),
)

@Composable
fun HomeScreen(
    onOpenSearch: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenLogin: () -> Unit,
    onPlayChannel: (String, String) -> Unit,
) {
    val apiClient = LocalApiClient.current
    val uiSounds = LocalUiSounds.current
    val context = LocalContext.current

    var rows by remember { mutableStateOf<List<Pair<String, List<TvChannel>>>>(emptyList()) }
    var catalog by remember { mutableStateOf(HomeCatalog()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        loading = true
        error = null
        try {
            rows = loadHomeRows(apiClient.api)
            catalog = loadCatalogRows(apiClient.api)
        } catch (ex: Exception) {
            error = ex.message ?: "No se pudo cargar el catálogo"
        } finally {
            loading = false
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 48.dp, vertical = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Pelis", color = MaisonNoir.Chalk)
                    Text("En vivo y catálogo", color = MaisonNoir.Silver)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TvFocusButton("Buscar", { uiSounds.playClick(); onOpenSearch() })
                    TvFocusButton("Ajustes", { uiSounds.playClick(); onOpenSettings() })
                    TvFocusButton("Cuenta", { uiSounds.playClick(); onOpenLogin() })
                }
            }

            when {
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Cargando…", color = MaisonNoir.Silver)
                }
                error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(error ?: "", color = MaisonNoir.Danger)
                }
                else -> LazyColumn(Modifier.fillMaxSize()) {
                    if (catalog.movies.isNotEmpty()) {
                        item(key = "catalog-movies") {
                            CatalogRow(
                                title = "Películas",
                                items = catalog.movies,
                                onOpen = { catalogItem ->
                                    openWebItem(context, apiClient, "movies", catalogItem.id)
                                },
                            )
                        }
                    }
                    if (catalog.series.isNotEmpty()) {
                        item(key = "catalog-series") {
                            CatalogRow(
                                title = "Series",
                                items = catalog.series,
                                onOpen = { catalogItem ->
                                    openWebItem(context, apiClient, "movies", catalogItem.id)
                                },
                            )
                        }
                    }
                    if (catalog.anime.isNotEmpty()) {
                        item(key = "catalog-anime") {
                            CatalogRow(
                                title = "Anime",
                                items = catalog.anime,
                                onOpen = { catalogItem ->
                                    openWebItem(context, apiClient, "anime", catalogItem.id)
                                },
                            )
                        }
                    }
                    items(rows, key = { it.first }) { (title, channels) ->
                        CategoryRow(
                            title = title,
                            channels = channels,
                            onPlayChannel = { onPlayChannel(it.id, it.name) },
                        )
                    }
                }
            }
        }
    }
}

private fun openWebItem(context: android.content.Context, client: PelisApiClient, kind: String, id: String) {
    val url = "${client.baseUrl}$kind/$id"
    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
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
