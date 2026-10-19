package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.data.TvImages
import pro.verpelis.tv.data.tv.ContinueItem
import pro.verpelis.tv.data.tv.LocalTvRepository
import pro.verpelis.tv.data.tv.TitleDto
import pro.verpelis.tv.ui.components.PosterCard
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.shell.TvHeader
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.onFocusChanged
import kotlinx.coroutines.launch
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
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.components.TvLoadError
import pro.verpelis.tv.data.api.PelisApiClient
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
    onOpenSettings: () -> Unit,
    onPlayChannel: (String, String) -> Unit,
    onOpenTitle: (TitleKind, String) -> Unit,
) {
    val apiClient = LocalApiClient.current
    val repo = LocalTvRepository.current
    val session = LocalSessionStore.current
    val uiSounds = LocalUiSounds.current

    // Se conserva al volver de una ficha: la portada no se recarga (caduca a los 15 min).
    remember { HomeCache.expireIfStale() }
    var rows by rememberSaveableRows()
    var catalog by remember { mutableStateOf(HomeCache.catalog) }
    var featured by remember { mutableStateOf(HomeCache.featured) }
    var continueItems by remember { mutableStateOf(HomeCache.continueItems) }
    var catalogLoading by remember { mutableStateOf(HomeCache.catalog == null) }
    var rowsLoading by remember { mutableStateOf(HomeCache.rows == null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableStateOf(0) }
    val heroFocus = remember { FocusRequester() }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    val firstPoster = remember { FocusRequester() }
    var focusedOnce by remember { mutableStateOf(false) }

    // Catálogo primero (3 llamadas en paralelo) y se pinta en cuanto llega; las
    // filas de canales (hasta ~13 llamadas) se cargan después sin bloquear la portada.
    LaunchedEffect(attempt) {
        error = null
        if (featured == null) {
            runCatching { repo.featured() }.getOrNull()?.let { list ->
                val pick = list.firstOrNull { !it.backdropImage.isNullOrBlank() } ?: list.firstOrNull()
                HomeCache.featured = pick
                featured = pick
            }
        }
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
                if (catalog == null) error = PelisApiClient.friendlyNetworkError(ex)
            } finally {
                rowsLoading = false
            }
        }
    }
    // "Continuar viendo" se relee cada vez que se vuelve a la portada (p. ej. tras ver algo).
    LaunchedEffect(Unit) {
        if (!session.hasSession()) {
            HomeCache.continueItems = emptyList()
            continueItems = emptyList()
            return@LaunchedEffect
        }
        runCatching { repo.continueWatching() }.getOrNull()?.let {
            HomeCache.continueItems = it
            continueItems = it
        }
    }
    LaunchedEffect(catalog, featured) {
        if ((catalog != null || featured != null) && !focusedOnce) {
            withFrameNanos { }
            val target = if (featured != null) heroFocus else firstPoster
            if (runCatching { target.requestFocus() }.isSuccess) focusedOnce = true
        }
    }

    val openMovie = remember(onOpenTitle) { { item: CatalogItem -> onOpenTitle(TitleKind.MOVIE, item.id) } }
    val openSeries = remember(onOpenTitle) { { item: CatalogItem -> onOpenTitle(TitleKind.SERIES, item.id) } }
    val openAnime = remember(onOpenTitle) { { item: CatalogItem -> onOpenTitle(TitleKind.ANIME, item.id) } }

    Box(Modifier.fillMaxSize().background(MaisonNoir.Background)) {
        val c = catalog
        val r = rows
        val f = featured
        if (c == null && f == null && r.isNullOrEmpty() && error != null) {
            // Error de carga compartido: Reintentar + estado de conexión real.
            TvLoadError(
                onRetry = { attempt++ },
                detail = error,
                extraActions = {
                    pro.verpelis.tv.ui.playback.NoirButton("Ajustes", { uiSounds.playClick(); onOpenSettings() })
                },
                hints = listOf(TvHints.Select, TvHints.Move, TvHints.Exit),
            )
            return@Box
        }
        Column(Modifier.fillMaxSize()) {
            when {
                c == null && f == null && catalogLoading -> {
                    TvHeader(null, Modifier.padding(start = 32.dp, end = 40.dp, top = 20.dp, bottom = 8.dp))
                    HomeSkeleton()
                }
                else -> TvPivotScroll(0.18f) {
                    LazyColumn(
                        Modifier.fillMaxWidth().weight(1f),
                        state = listState,
                        contentPadding = PaddingValues(bottom = 40.dp),
                    ) {
                        item(key = "hero", contentType = "hero") {
                            if (f != null) {
                                HomeHero(
                                    f,
                                    heroFocus,
                                    // El destacado se ve entero: con el foco en "Ver ahora" la lista vuelve arriba.
                                    Modifier.onFocusChanged { st ->
                                        if (st.hasFocus) scope.launch { kotlinx.coroutines.delay(16); listState.scrollToItem(0) }
                                    },
                                ) { onOpenTitle(f.kind, f.id) }
                            } else {
                                TvHeader(null, Modifier.padding(start = 32.dp, end = 40.dp, top = 20.dp, bottom = 8.dp))
                            }
                        }
                        if (continueItems.isNotEmpty()) {
                            item(key = "continue", contentType = "catalog") {
                                ContinueRow(continueItems) { onOpenTitle(it.kind, it.id) }
                            }
                        }
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
            TvHintBar(
                listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú"), TvHints.Exit),
                Modifier.padding(start = 32.dp, end = 40.dp, top = 6.dp, bottom = 12.dp),
            )
        }
    }
}

/** Destacado real (movies.getFeatured): fondo a la medida de la pantalla, sin animación. */
@Composable
private fun HomeHero(title: TitleDto, focus: FocusRequester, modifier: Modifier = Modifier, onOpen: () -> Unit) {
    val context = LocalContext.current
    val uiSounds = LocalUiSounds.current
    val lowRam = (context.applicationContext as? pro.verpelis.tv.PelisTvApp)?.lowRam == true
    // Solo fondos horizontales (nunca el póster estirado), al ancho real de la pantalla.
    val request = remember(title.backdropImage, lowRam) {
        TvImages.backdropRequest(context, BuildConfig.API_BASE_URL, title.backdropImage, lowRam)
    }
    Box(modifier.fillMaxWidth().height(318.dp)) {
        if (request != null) AsyncImage(request, null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(0f to Mn.Bg, 0.45f to Mn.Bg.copy(alpha = 0.85f), 1f to Mn.Bg.copy(alpha = 0.1f))))
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Mn.Bg.copy(alpha = 0.6f), 0.25f to Color.Transparent, 0.7f to Color.Transparent, 1f to Mn.Bg)))
        Column(Modifier.fillMaxSize().padding(start = 32.dp, end = 40.dp, top = 20.dp)) {
            TvHeader(null)
            Spacer(Modifier.weight(1f))
            Column(Modifier.width(460.dp)) {
                MnText("Destacado", color = Mn.Gold, size = 8.sp, weight = FontWeight.SemiBold, spacing = 2.sp)
                Spacer(Modifier.height(6.dp))
                MnText(title.displayName, color = Mn.Text, size = 30.sp, family = Mn.Serif, lines = 2)
                Spacer(Modifier.height(6.dp))
                val meta = listOfNotNull(
                    title.yearText.takeIf { it.isNotBlank() },
                    title.classification?.takeIf { it.isNotBlank() },
                    title.genreText.takeIf { it.isNotBlank() }?.replace(",", " •"),
                    if (title.kind == TitleKind.SERIES) "Serie" else "Película",
                )
                MnText(meta.joinToString("  ·  "), color = Mn.Variant, size = 9.sp, lines = 1)
                Spacer(Modifier.height(8.dp))
                MnText(title.synopsis.orEmpty(), color = Mn.Text.copy(alpha = 0.86f), size = 10.sp, lines = 3)
                Spacer(Modifier.height(14.dp))
                pro.verpelis.tv.ui.playback.NoirButton(
                    "Ver ahora",
                    { uiSounds.playClick(); onOpen() },
                    icon = pro.verpelis.tv.ui.playback.NoirIcon.Play,
                    primary = true,
                    focusRequester = focus,
                )
            }
            Spacer(Modifier.height(18.dp))
        }
    }
}

@Composable
private fun ContinueRow(items: List<ContinueItem>, onOpen: (ContinueItem) -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Text(
            "Continuar viendo",
            style = MaisonType.Title,
            modifier = Modifier.padding(start = 48.dp, bottom = 10.dp),
        )
        TvPivotScroll(0.06f) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 48.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items(items, key = { "c-" + it.id }, contentType = { "poster" }) { it ->
                    PosterCard(
                        item = CatalogItem(id = it.id, name = it.name, image = it.image),
                        onClick = { onOpen(it) },
                        progress = it.fraction,
                    )
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
    var featured: TitleDto? = null
    var continueItems: List<ContinueItem> = emptyList()

    fun expireIfStale() {
        if (catalog != null && System.currentTimeMillis() - at > TTL_MS) {
            catalog = null
            rows = null
            featured = null
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
