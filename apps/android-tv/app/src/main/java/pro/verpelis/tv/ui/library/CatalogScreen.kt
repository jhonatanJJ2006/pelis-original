package pro.verpelis.tv.ui.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.api.PelisApiClient
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.data.tv.CATALOG_PAGE
import pro.verpelis.tv.data.tv.CatalogKind
import pro.verpelis.tv.data.tv.LocalTvRepository
import pro.verpelis.tv.data.tv.TvRepository
import pro.verpelis.tv.data.tv.catalogGenres
import pro.verpelis.tv.data.tv.catalogPage
import pro.verpelis.tv.data.tv.toCatalogItem
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.components.TvLoadError
import pro.verpelis.tv.ui.shell.TvHeader
import pro.verpelis.tv.ui.shell.TvHeaderChip
import pro.verpelis.tv.ui.playback.NoirButton

/** Estado de un catálogo; se conserva al volver de una ficha (15 min). */
private class CatalogState {
    val items = mutableStateListOf<CatalogItem>()
    var genres by mutableStateOf<List<String>>(emptyList())
    var genre by mutableStateOf<String?>(null)
    var hasMore by mutableStateOf(true)
    var loading by mutableStateOf(false)
    var error by mutableStateOf<Throwable?>(null)
    var at = System.currentTimeMillis()

    suspend fun loadMore(repo: TvRepository, kind: CatalogKind) {
        if (loading || !hasMore) return
        loading = true
        error = null
        val forGenre = genre
        runCatching { repo.catalogPage(kind, forGenre, items.size) }
            .onSuccess { page ->
                if (forGenre == genre) {
                    val seen = items.mapTo(HashSet()) { it.id }
                    items.addAll(page.map { it.toCatalogItem() }.filter { seen.add(it.id) })
                    hasMore = page.size >= CATALOG_PAGE
                }
            }
            .onFailure { error = it }
        loading = false
    }

    fun reset(newGenre: String?) {
        genre = newGenre
        items.clear()
        hasMore = true
        error = null
    }
}

private object CatalogStore {
    private val states = HashMap<CatalogKind, CatalogState>()
    fun get(kind: CatalogKind): CatalogState {
        val s = states[kind]
        if (s != null && System.currentTimeMillis() - s.at < 15 * 60_000) return s
        return CatalogState().also { states[kind] = it }
    }
}

/** Películas / Series / Anime: géneros reales del API + cuadrícula paginada. */
@Composable
fun CatalogScreen(kind: CatalogKind, onOpenTitle: (TitleKind, String) -> Unit) {
    val repo = LocalTvRepository.current
    val sounds = LocalUiSounds.current
    val state = remember(kind) { CatalogStore.get(kind) }
    val scope = rememberCoroutineScope()
    val firstPoster = remember { FocusRequester() }
    val gridState = rememberLazyGridState()
    var focusedOnce by remember { mutableStateOf(state.items.isNotEmpty()) }
    val titleKind = when (kind) {
        CatalogKind.MOVIES -> TitleKind.MOVIE
        CatalogKind.SERIES -> TitleKind.SERIES
        CatalogKind.ANIME -> TitleKind.ANIME
    }

    LaunchedEffect(kind) {
        if (state.genres.isEmpty()) runCatching { repo.catalogGenres(kind) }.onSuccess { state.genres = it.take(30) }
        if (state.items.isEmpty()) state.loadMore(repo, kind)
    }
    LaunchedEffect(state.items.size) {
        if (!focusedOnce && state.items.isNotEmpty()) {
            focusedOnce = true
            // La cuadrícula compone sus celdas en el layout: se reintenta unos frames.
            for (i in 0 until 10) {
                androidx.compose.runtime.withFrameNanos { }
                if (runCatching { firstPoster.requestFocus() }.isSuccess) break
            }
        }
    }

    if (state.items.isEmpty() && state.error != null) {
        TvLoadError(
            onRetry = { scope.launch { state.hasMore = true; state.loadMore(repo, kind) } },
            title = "No pudimos cargar ${kind.title.lowercase()}",
            detail = PelisApiClient.friendlyNetworkError(state.error!!),
            hints = listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú")),
        )
        return
    }

    Column(Modifier.fillMaxSize().padding(start = 32.dp, end = 32.dp, top = 18.dp, bottom = 14.dp)) {
        TvHeader(
            title = kind.title,
            eyebrow = "CATÁLOGO",
            trailing = {
                val n = state.items.size
                if (n > 0 && !state.hasMore) TvHeaderChip(if (n == 1) "1 título" else "$n títulos")
            },
        )
        Spacer(Modifier.height(4.dp))
        // Los géneros van como cabecera de la misma cuadrícula: así ▲/▼ entre chips y pósters
        // funciona con la búsqueda de foco normal (dos listas perezosas hermanas no se cruzan).
        val chips: @Composable () -> Unit = {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp),
            ) {
                item(key = "all") {
                    NoirButton("Todos", {
                        sounds.playClick()
                        if (state.genre != null) { state.reset(null); scope.launch { gridState.scrollToItem(0); state.loadMore(repo, kind) } }
                    }, selected = state.genre == null)
                }
                items(state.genres, key = { it }) { g ->
                    NoirButton(g, {
                        sounds.playClick()
                        if (state.genre != g) { state.reset(g); scope.launch { gridState.scrollToItem(0); state.loadMore(repo, kind) } }
                    }, selected = state.genre == g)
                }
            }
        }
        Box(Modifier.weight(1f)) {
            TitleGrid(
                items = state.items,
                onOpen = { onOpenTitle(titleKind, it.id) },
                firstFocus = firstPoster,
                state = gridState,
                onNearEnd = { scope.launch { state.loadMore(repo, kind) } },
                footer = state.loading && state.items.isNotEmpty(),
                header = chips,
                empty = when {
                    state.items.isNotEmpty() -> null
                    state.loading -> ({ LibraryLoading(Modifier.height(260.dp)) })
                    else -> ({
                        LibraryMessage(
                            "No hay títulos",
                            if (state.genre != null) "No encontramos ${kind.title.lowercase()} de ${state.genre}. Prueba con otro género." else "Todavía no hay ${kind.title.lowercase()} en el catálogo.",
                            Modifier.height(260.dp),
                        )
                    })
                },
            )
        }
        Spacer(Modifier.height(8.dp))
        TvHintBar(listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú"), TvHints.Back))
    }
}
