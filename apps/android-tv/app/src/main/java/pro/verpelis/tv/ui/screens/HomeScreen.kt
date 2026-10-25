package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.ui.unit.sp
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.data.HERO_EXTRA_DEBOUNCE_MS
import pro.verpelis.tv.data.HeroFocus
import pro.verpelis.tv.data.formatHeroDuration
import pro.verpelis.tv.data.formatHeroMinutes
import pro.verpelis.tv.data.heroFocus
import pro.verpelis.tv.data.heroMetaLine
import pro.verpelis.tv.data.heroRuntimeIds
import pro.verpelis.tv.data.tv.HERO_RUNTIME_BATCH
import pro.verpelis.tv.data.tv.ContinueItem
import pro.verpelis.tv.data.tv.LocalTvRepository
import pro.verpelis.tv.data.tv.TitleDto
import pro.verpelis.tv.data.tv.addFavorite
import pro.verpelis.tv.data.tv.isFavorite
import pro.verpelis.tv.data.tv.removeFavorite
import pro.verpelis.tv.ui.components.ContinueCard
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.shell.TvHeader
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
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
    val popular: List<CatalogItem> = emptyList(),
) {
    val isEmpty: Boolean
        get() = popular.isEmpty() && movies.isEmpty() && series.isEmpty() && anime.isEmpty()
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
    var preview by remember { mutableStateOf<HeroFocus?>(null) }
    var extraMinutes by remember { mutableStateOf<Int?>(null) }
    // Duraciones de todas las filas, pedidas en lotes de 40 una vez cargado el catálogo.
    var runtimes by remember { mutableStateOf(HomeCache.runtimes) }
    var extraFor by remember { mutableStateOf<String?>(null) }
    var favorite by remember { mutableStateOf<Boolean?>(null) }
    var favoriteFor by remember { mutableStateOf<String?>(null) }
    var trailerNote by remember { mutableStateOf(false) }
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
    val runtimeIds = remember(catalog, featured, continueItems) {
        heroRuntimeIds(
            continueItems.map { it.id },
            listOfNotNull(featured?.id),
            catalog?.popular?.map { it.id },
            catalog?.movies?.map { it.id },
            catalog?.series?.map { it.id },
        )
    }
    LaunchedEffect(runtimeIds) {
        val missing = runtimeIds.filter { it !in runtimes }
        if (missing.isEmpty()) return@LaunchedEffect
        for (attemptNo in 0..1) {
            val ask = if (attemptNo == 0) missing else missing.filter { runtimes[it] == null }
            if (ask.isEmpty()) break
            if (attemptNo == 1) kotlinx.coroutines.delay(6_000)
            for (batch in ask.chunked(HERO_RUNTIME_BATCH)) {
                val got = runCatching { repo.heroRuntimes(batch) }.getOrNull() ?: continue
                runtimes = runtimes + batch.associateWith { got[it] }
                HomeCache.runtimes = runtimes
            }
        }
    }
    val hero = preview
        ?: featured?.heroFocus()
        ?: catalog?.popular?.firstOrNull()?.heroFocus(TitleKind.MOVIE)
        ?: catalog?.movies?.firstOrNull()?.heroFocus(TitleKind.MOVIE)
    LaunchedEffect(hero?.id, catalog) {
        if (hero == null && catalog == null) return@LaunchedEffect
        if (focusedOnce) return@LaunchedEffect
        withFrameNanos { }
        val target = if (hero != null) heroFocus else firstPoster
        if (runCatching { target.requestFocus() }.isSuccess) focusedOnce = true
    }
    val heroId = hero?.id
    val knownDuration = hero?.durationSeconds
    LaunchedEffect(heroId, knownDuration) {
        trailerNote = false
        if (heroId == null || knownDuration != null) return@LaunchedEffect
        extraMinutes = null
        // Ya lo resolvió el lote (con o sin dato): no se pide otra vez.
        if (heroId in runtimes) return@LaunchedEffect
        kotlinx.coroutines.delay(HERO_EXTRA_DEBOUNCE_MS)
        val extras = runCatching { repo.heroExtras(heroId) }.getOrNull()
        extraFor = heroId
        extraMinutes = extras?.runtimeMinutes?.toInt()?.takeIf { it > 0 }
    }
    LaunchedEffect(heroId) {
        favorite = null
        val id = heroId ?: return@LaunchedEffect
        if (hero?.kind == TitleKind.ANIME) return@LaunchedEffect
        kotlinx.coroutines.delay(HERO_EXTRA_DEBOUNCE_MS)
        favoriteFor = id
        favorite = runCatching { repo.isFavorite(id) }.getOrNull()
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
        val shownHero = hero
        val firstRowIsContinue = continueItems.isNotEmpty()
        val firstRowIsPopular = !firstRowIsContinue && c != null && c.popular.isNotEmpty()
        Column(Modifier.fillMaxSize()) {
            when {
                c == null && f == null && shownHero == null && catalogLoading -> {
                    TvHeader(null, Modifier.padding(start = 32.dp, end = 40.dp, top = 20.dp, bottom = 8.dp))
                    HomeSkeleton()
                }
                else -> {
                    if (shownHero != null) {
                        val duration = shownHero.durationSeconds?.let { formatHeroDuration(it) }
                            ?: runtimes[shownHero.id]?.let { formatHeroMinutes(it) }
                            ?: extraMinutes.takeIf { extraFor == shownHero.id }?.let { formatHeroMinutes(it) }
                        HomeHero(
                            hero = shownHero,
                            meta = heroMetaLine(shownHero.year, duration, shownHero.classification, shownHero.genres),
                            favorite = favorite.takeIf { favoriteFor == shownHero.id },
                            trailerNote = trailerNote,
                            focus = heroFocus,
                            onPlay = { onOpenTitle(shownHero.kind, shownHero.id) },
                            onTrailer = { trailerNote = true },
                            onToggleList = {
                                scope.launch {
                                    val next = favorite != true
                                    val ok = runCatching {
                                        if (next) repo.addFavorite(shownHero.id) else repo.removeFavorite(shownHero.id)
                                    }.isSuccess
                                    if (ok) {
                                        favoriteFor = shownHero.id
                                        favorite = next
                                    }
                                }
                            },
                        )
                    } else {
                        TvHeader(null, Modifier.padding(start = 32.dp, end = 40.dp, top = 20.dp, bottom = 8.dp))
                    }
                    TvPivotScroll(0.18f) {
                    LazyColumn(
                        Modifier.fillMaxWidth().weight(1f),
                        state = listState,
                        contentPadding = PaddingValues(bottom = 40.dp),
                    ) {
                        if (continueItems.isNotEmpty()) {
                            item(key = "continue", contentType = "catalog") {
                                ContinueRow(
                                    continueItems,
                                    onOpen = { onOpenTitle(it.kind, it.id) },
                                    onFocused = { preview = it.heroFocus() },
                                    firstItemFocus = firstPoster,
                                )
                            }
                        }
                        if (c != null && c.popular.isNotEmpty()) {
                            item(key = "catalog-popular", contentType = "catalog") {
                                CatalogRow(
                                    "Populares",
                                    c.popular,
                                    { item -> onOpenTitle(kindOf(item), item.id) },
                                    subtitle = "Tendencias del cine",
                                    markFocused = true,
                                    firstItemFocus = if (firstRowIsPopular) firstPoster else null,
                                    onFocusIndex = { index -> preview = c.popular[index].heroFocus(kindOf(c.popular[index])) },
                                )
                            }
                        }
                        if (c != null && c.movies.isNotEmpty()) {
                            item(key = "catalog-movies", contentType = "catalog") {
                                CatalogRow(
                                    "Películas",
                                    c.movies,
                                    openMovie,
                                    markFocused = true,
                                    firstItemFocus = if (!firstRowIsContinue && !firstRowIsPopular) firstPoster else null,
                                    onFocusIndex = { index -> preview = c.movies[index].heroFocus(TitleKind.MOVIE) },
                                )
                            }
                        }
                        if (c != null && c.series.isNotEmpty()) {
                            item(key = "catalog-series", contentType = "catalog") {
                                CatalogRow(
                                    "Series",
                                    c.series,
                                    openSeries,
                                    markFocused = true,
                                    onFocusIndex = { index -> preview = c.series[index].heroFocus(TitleKind.SERIES) },
                                )
                            }
                        }
                        if (c != null && c.anime.isNotEmpty()) {
                            item(key = "catalog-anime", contentType = "catalog") {
                                CatalogRow(
                                    "Anime",
                                    c.anime,
                                    openAnime,
                                    markFocused = true,
                                    onFocusIndex = { index -> preview = c.anime[index].heroFocus(TitleKind.ANIME) },
                                )
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
            TvHintBar(
                listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú"), TvHints.Exit),
                Modifier.padding(start = 32.dp, end = 40.dp, top = 6.dp, bottom = 12.dp),
            )
        }
    }
}

@Composable
private fun ContinueRow(
    items: List<ContinueItem>,
    onOpen: (ContinueItem) -> Unit,
    onFocused: (ContinueItem) -> Unit,
    firstItemFocus: FocusRequester?,
) {
    Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Text(
            "Seguir viendo",
            style = MaisonType.Title.copy(fontSize = 18.sp),
            modifier = Modifier.padding(start = 48.dp, bottom = 10.dp),
        )
        TvPivotScroll(0.06f) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 48.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items(items, key = { "c-" + it.id }, contentType = { "poster" }) { it ->
                    ContinueCard(
                        item = it,
                        onClick = { onOpen(it) },
                        onFocused = { onFocused(it) },
                        focusRequester = if (it.id == items.first().id) firstItemFocus else null,
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
    /** id → minutos (null = sin dato). Pequeño: ~100 entradas. */
    var runtimes: Map<String, Int?> = emptyMap()

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
    val popular = async {
        runCatching { api.invokeCatalog("movies.getTrending", CatalogListArgs(limit = 18)) }
            .getOrDefault(emptyList())
    }
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
    HomeCatalog(
        movies = movies.await(),
        series = series.await(),
        anime = anime.await(),
        popular = popular.await(),
    )
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
    if (items.isNotEmpty()) result += "Canales populares" to items

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

private fun kindOf(item: CatalogItem): TitleKind =
    if (item.mediaType.equals("series", ignoreCase = true)) TitleKind.SERIES else TitleKind.MOVIE

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
