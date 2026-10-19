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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.flow.distinctUntilChanged
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.ui.components.PosterCard
import pro.verpelis.tv.ui.components.TvPivotScroll
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.playback.NoirSpinner

/** Cuadrícula de pósters (6 por fila) con carga de la página siguiente al acercarse al final. */
@Composable
fun TitleGrid(
    items: List<CatalogItem>,
    onOpen: (CatalogItem) -> Unit,
    modifier: Modifier = Modifier,
    firstFocus: FocusRequester? = null,
    state: LazyGridState = rememberLazyGridState(),
    progress: (CatalogItem) -> Float? = { null },
    onNearEnd: (() -> Unit)? = null,
    footer: Boolean = false,
    /** Fila de ancho completo encima de los pósters (chips, botones). */
    header: (@Composable () -> Unit)? = null,
    /** Contenido de ancho completo cuando no hay pósters (cargando, vacío). */
    empty: (@Composable () -> Unit)? = null,
    /** Avisa qué póster tiene el foco (indicador de página). */
    onFocusIndex: ((Int) -> Unit)? = null,
) {
    if (onNearEnd != null) {
        LaunchedEffect(state, items.size) {
            snapshotFlow { state.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 }
                .distinctUntilChanged()
                .collect { last -> if (items.isNotEmpty() && last >= items.size - 12 + (if (header != null) 1 else 0)) onNearEnd() }
        }
    }
    TvPivotScroll(0.25f) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(6),
            state = state,
            modifier = modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 8.dp, end = 8.dp, top = 10.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            if (header != null) {
                item(key = "header", span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }, contentType = "header") { header() }
            }
            if (items.isEmpty() && empty != null) {
                item(key = "empty", span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }, contentType = "empty") { empty() }
            }
            itemsIndexed(items, key = { i, it -> it.id.ifBlank { "i$i" } }, contentType = { _, _ -> "poster" }) { i, item ->
                PosterCard(
                    item = item,
                    onClick = { onOpen(item) },
                    progress = progress(item),
                    modifier = Modifier
                        .let { if (i == 0 && firstFocus != null) it.focusRequester(firstFocus) else it }
                        .let { m -> if (onFocusIndex != null) m.onFocusChanged { if (it.hasFocus) onFocusIndex(i) } else m }

                )
            }
            if (footer) {
                item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }, contentType = "footer") {
                    Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) { NoirSpinner(size = 22.dp) }
                }
            }
        }
    }
}

/** Mensaje centrado (vacío, sin sesión) con una acción opcional. */
@Composable
fun LibraryMessage(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    action: String? = null,
    actionFocus: FocusRequester? = null,
    onAction: () -> Unit = {},
) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(Modifier.widthIn(max = 460.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            MnText(title, color = Mn.Text, size = 22.sp, family = Mn.Serif, lines = 2)
            Spacer(Modifier.height(8.dp))
            MnText(message, color = Mn.Variant, size = 11.sp, lines = 3)
            if (action != null) {
                Spacer(Modifier.height(18.dp))
                NoirButton(action, onAction, primary = true, focusRequester = actionFocus)
                if (actionFocus != null) LaunchedEffect(Unit) { runCatching { actionFocus.requestFocus() } }
            }
        }
    }
}

@Composable
fun LibraryLoading(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { NoirSpinner() }
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    MnText(text, color = Mn.Gold, size = 8.sp, weight = FontWeight.SemiBold, spacing = 1.6.sp, modifier = modifier)
}

