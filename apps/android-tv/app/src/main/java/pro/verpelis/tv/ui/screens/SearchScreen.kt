package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.data.api.TvListArgs
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.ui.components.CatalogRow
import pro.verpelis.tv.ui.components.ChannelCard
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.playback.NoirSpinner
import pro.verpelis.tv.ui.playback.noirFocus
import pro.verpelis.tv.ui.shell.TvHeader

private enum class SearchType(val label: String) { ALL("Todo"), TITLES("Películas y series"), ANIME("Anime"), CHANNELS("Canales") }

private val KeyRows = listOf("ABCDEFG", "HIJKLMN", "ÑOPQRST", "UVWXYZ1", "2345678")

/** Búsqueda con teclado en pantalla (A–Z, Ñ, 0–9) para el control remoto, y filtros por tipo. */
@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onPlayChannel: (String, String) -> Unit,
    onOpenTitle: (TitleKind, String) -> Unit,
) {
    val api = LocalApiClient.current.api
    val sounds = LocalUiSounds.current
    var query by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf(SearchType.ALL) }
    var channels by remember { mutableStateOf<List<TvChannel>>(emptyList()) }
    var titles by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var anime by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    val firstKey = remember { FocusRequester() }

    LaunchedEffect(Unit) { runCatching { firstKey.requestFocus() } }
    LaunchedEffect(query) {
        val q = query.trim()
        if (q.length < 2) {
            channels = emptyList(); titles = emptyList(); anime = emptyList(); searching = false
            return@LaunchedEffect
        }
        delay(350)
        searching = true
        coroutineScope {
            val m = async { runCatching { api.invokeCatalogSearch("movies.search", mapOf("q" to q, "limit" to 18)) }.getOrDefault(emptyList()) }
            val a = async { runCatching { api.invokeCatalogSearch("anime.search", mapOf("query" to q, "limit" to 18)) }.getOrDefault(emptyList()) }
            val c = async { runCatching { api.invokeTvList(args = TvListArgs(search = q, limit = 24)).items }.getOrDefault(emptyList()) }
            titles = m.await(); anime = a.await(); channels = c.await()
        }
        searching = false
    }
    val type_ = type
    val showTitles = (type_ == SearchType.ALL || type_ == SearchType.TITLES) && titles.isNotEmpty()
    val showAnime = (type_ == SearchType.ALL || type_ == SearchType.ANIME) && anime.isNotEmpty()
    val showChannels = (type_ == SearchType.ALL || type_ == SearchType.CHANNELS) && channels.isNotEmpty()

    Column(Modifier.fillMaxSize().padding(start = 32.dp, end = 24.dp, top = 18.dp, bottom = 14.dp)) {
        TvHeader(title = "Buscar", eyebrow = "PELÍCULAS, SERIES, ANIME Y CANALES")
        Spacer(Modifier.height(12.dp))
        Row(Modifier.weight(1f)) {
            // Teclado
            Column(Modifier.width(300.dp)) {
                Box(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)).background(Mn.Lowest)
                        .border(1.dp, Mn.Gold.copy(alpha = 0.6f), RoundedCornerShape(4.dp)).padding(horizontal = 12.dp, vertical = 10.dp),
                ) {
                    if (query.isEmpty()) MnText("Escribe un título o canal", color = Mn.Outline, size = 12.sp)
                    else MnText(query + "▏", color = Mn.Text, size = 14.sp, lines = 1)
                }
                Spacer(Modifier.height(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    KeyRows.forEachIndexed { r, row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            row.forEachIndexed { c, ch ->
                                KeyCap(ch.toString(), 38.dp, if (r == 0 && c == 0) firstKey else null) { sounds.playClick(); if (query.length < 40) query += ch }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        KeyCap("9", 38.dp) { sounds.playClick(); query += "9" }
                        KeyCap("0", 38.dp) { sounds.playClick(); query += "0" }
                        KeyCap("Espacio", 82.dp) { sounds.playClick(); if (query.isNotEmpty() && !query.endsWith(" ")) query += " " }
                        KeyCap("Borrar", 60.dp) { sounds.playClick(); query = query.dropLast(1) }
                        KeyCap("Limpiar", 60.dp) { sounds.playClick(); query = "" }
                    }
                }
            }
            Spacer(Modifier.width(18.dp))
            // Resultados
            Column(Modifier.weight(1f)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SearchType.entries.forEach { t ->
                        NoirButton(t.label, { sounds.playClick(); type = t }, selected = type == t)
                    }
                }
                Spacer(Modifier.height(6.dp))
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    when {
                        query.trim().length < 2 -> SearchHint("Escribe al menos 2 letras con el teclado de la izquierda.")
                        searching && !showTitles && !showAnime && !showChannels -> NoirSpinner(Modifier.align(Alignment.Center))
                        !showTitles && !showAnime && !showChannels -> SearchHint("No encontramos resultados para “${query.trim()}”.")
                        else -> LazyColumn(contentPadding = PaddingValues(top = 4.dp, bottom = 16.dp), modifier = Modifier.fillMaxSize()) {
                            if (showTitles) item(key = "titles") {
                                CatalogRow(title = "Películas y series", items = titles, onOpen = { onOpenTitle(if (it.mediaType == "series") TitleKind.SERIES else TitleKind.MOVIE, it.id) })
                            }
                            if (showAnime) item(key = "anime") {
                                CatalogRow(title = "Anime", items = anime, onOpen = { onOpenTitle(TitleKind.ANIME, it.id) })
                            }
                            if (showChannels) item(key = "channels") {
                                Column(Modifier.padding(vertical = 8.dp)) {
                                    MnText("Canales", color = Mn.Text, size = 15.sp, family = Mn.Serif, modifier = Modifier.padding(start = 8.dp, bottom = 8.dp))
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)) {
                                        items(channels, key = { it.id }) { ch -> ChannelCard(channel = ch, onClick = { onPlayChannel(ch.id, ch.name) }) }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        TvHintBar(listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú"), TvHints.Back))
    }
}

@Composable
private fun SearchHint(text: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { MnText(text, color = Mn.Variant, size = 11.sp, lines = 2) }
}

@Composable
private fun KeyCap(label: String, width: Dp, focusRequester: FocusRequester? = null, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    Box(
        Modifier
            .let { if (focusRequester != null) it.focusRequester(focusRequester) else it }
            .onFocusChanged { focused = it.isFocused }
            .noirFocus(focused, shape, scale = 1.06f)
            .size(width = width, height = 34.dp)
            .clip(shape)
            .background(if (focused) Mn.Gold else Mn.High)
            .border(1.dp, if (focused) Mn.GoldLight else Mn.OutlineVar, shape)
            .clickable(remember { MutableInteractionSource() }, null, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        MnText(label, color = if (focused) Mn.OnGold else Mn.Text, size = if (label.length > 1) 9.sp else 13.sp, weight = FontWeight.SemiBold, lines = 1)
    }
}
