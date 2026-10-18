package pro.verpelis.tv.ui.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.PelisApiClient
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.data.api.TvListArgs
import pro.verpelis.tv.ui.components.ChannelCard
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.components.TvLoadError
import pro.verpelis.tv.ui.components.TvPivotScroll
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.playback.NoirSpinner
import pro.verpelis.tv.ui.shell.TvHeader
import pro.verpelis.tv.ui.shell.TvHeaderChip

private const val LIVE_PAGE = 48

private object LiveStore {
    val channels = mutableStateListOf<TvChannel>()
    var categories by mutableStateOf<List<String>>(emptyList())
    var category by mutableStateOf<String?>(null)
    var total by mutableStateOf(0)
    var hasMore by mutableStateOf(true)
    var loading by mutableStateOf(false)
    var error by mutableStateOf<Throwable?>(null)
    var at = 0L
}

/** TV en vivo: categorías reales (tv.getCategories) + cuadrícula de canales (tv.list paginado). Sin guía de programación. */
@Composable
fun LiveScreen(onPlayChannel: (TvChannel) -> Unit) {
    val api = LocalApiClient.current.api
    val sounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()
    val s = LiveStore
    val gridState = rememberLazyGridState()
    val first = remember { FocusRequester() }
    var focusedOnce by remember { mutableStateOf(false) }

    suspend fun loadMore() {
        if (s.loading || !s.hasMore) return
        s.loading = true
        s.error = null
        val cat = s.category
        runCatching { api.invokeTvList(args = TvListArgs(category = cat, limit = LIVE_PAGE, offset = s.channels.size)) }
            .onSuccess { r ->
                if (cat == s.category) {
                    val seen = s.channels.mapTo(HashSet()) { it.id }
                    s.channels.addAll(r.items.filter { seen.add(it.id) })
                    s.total = r.total
                    s.hasMore = r.hasMore && r.items.isNotEmpty()
                }
            }
            .onFailure { s.error = it }
        s.loading = false
    }
    fun select(cat: String?) {
        if (s.category == cat) return
        s.category = cat
        s.channels.clear()
        s.hasMore = true
        scope.launch { gridState.scrollToItem(0); loadMore() }
    }

    LaunchedEffect(Unit) {
        if (System.currentTimeMillis() - s.at > 15 * 60_000) {
            s.channels.clear(); s.hasMore = true; s.category = null; s.at = System.currentTimeMillis()
        }
        if (s.categories.isEmpty()) runCatching { api.invokeGetCategories() }.onSuccess { s.categories = it.filter { c -> c.isNotBlank() } }
        if (s.channels.isEmpty()) loadMore()
    }
    LaunchedEffect(s.channels.size) {
        if (!focusedOnce && s.channels.isNotEmpty()) {
            focusedOnce = true
            for (i in 0 until 10) {
                androidx.compose.runtime.withFrameNanos { }
                if (runCatching { first.requestFocus() }.isSuccess) break
            }
        }
    }
    LaunchedEffect(gridState) {
        snapshotFlow { gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 }
            .distinctUntilChanged()
            .collect { last -> if (s.channels.isNotEmpty() && last >= s.channels.size - 8) loadMore() }
    }

    if (s.channels.isEmpty() && s.error != null) {
        TvLoadError(
            onRetry = { scope.launch { s.hasMore = true; loadMore() } },
            title = "No pudimos cargar los canales",
            detail = PelisApiClient.friendlyNetworkError(s.error!!),
            hints = listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú")),
        )
        return
    }

    Column(Modifier.fillMaxSize().padding(start = 32.dp, end = 32.dp, top = 18.dp, bottom = 14.dp)) {
        TvHeader(title = "TV en vivo", eyebrow = "CANALES", trailing = {
            if (s.total > 0) TvHeaderChip(if (s.total == 1) "1 canal" else "${s.total} canales")
        })
        Spacer(Modifier.height(4.dp))
        Box(Modifier.weight(1f)) {
            TvPivotScroll(0.25f) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(4),
                    state = gridState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 6.dp, bottom = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    item(key = "cats", span = { GridItemSpan(maxLineSpan) }, contentType = "header") {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp)) {
                            item(key = "all") { NoirButton("Todos", { sounds.playClick(); select(null) }, selected = s.category == null) }
                            items(s.categories, key = { it }) { c -> NoirButton(c, { sounds.playClick(); select(c) }, selected = s.category == c) }
                        }
                    }
                    if (s.channels.isEmpty()) {
                        item(key = "empty", span = { GridItemSpan(maxLineSpan) }) {
                            if (s.loading) LibraryLoading(Modifier.height(260.dp))
                            else LibraryMessage("Sin canales", "No hay canales disponibles en esta categoría ahora mismo.", Modifier.height(260.dp))
                        }
                    }
                    itemsIndexed(s.channels, key = { _, c -> c.id }, contentType = { _, _ -> "channel" }) { i, c ->
                        ChannelCard(channel = c, onClick = { onPlayChannel(c) }, modifier = if (i == 0) Modifier.focusRequester(first) else Modifier)
                    }
                    if (s.loading && s.channels.isNotEmpty()) {
                        item(key = "more", span = { GridItemSpan(maxLineSpan) }) {
                            Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) { NoirSpinner(size = 22.dp) }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        TvHintBar(listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú"), TvHints.Back))
    }
}
