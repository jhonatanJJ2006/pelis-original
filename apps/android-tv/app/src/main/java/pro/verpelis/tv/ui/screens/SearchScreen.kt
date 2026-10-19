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
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.os.SystemClock
import androidx.compose.foundation.Image
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.data.api.TvKeyboardSession
import pro.verpelis.tv.data.api.TvListArgs
import pro.verpelis.tv.data.qr.QrBitmap
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

/** Texto máximo en la búsqueda (igual que el límite del servidor para el celular). */
private const val MAX_QUERY = 80

/**
 * Sesión del teclado del celular. Vive en el proceso para reutilizar el mismo
 * código al volver a Buscar (las sesiones del servidor duran 10 min).
 */
private object PhoneKeyboardStore {
    var session: TvKeyboardSession? = null
    var version = -1
    var createdAt = 0L
    fun fresh(): TvKeyboardSession? =
        session?.takeIf { SystemClock.elapsedRealtime() - createdAt < 9 * 60_000L }
    fun clear() { session = null; version = -1 }
}

/** Búsqueda con teclado en pantalla (A–Z, Ñ, 0–9) para el control remoto, y filtros por tipo. */
@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onPlayChannel: (String, String) -> Unit,
    onOpenTitle: (TitleKind, String) -> Unit,
) {
    val client = LocalApiClient.current
    val api = client.api
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val sounds = LocalUiSounds.current
    var query by rememberSaveable { mutableStateOf("") }
    var type by rememberSaveable { mutableStateOf(SearchType.ALL) }
    var channels by remember { mutableStateOf<List<TvChannel>>(emptyList()) }
    var titles by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var anime by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    val firstKey = remember { FocusRequester() }
    val resultsFocus = remember { FocusRequester() }
    val chipsFocus = remember { FocusRequester() }
    var phone by remember { mutableStateOf(PhoneKeyboardStore.fresh()) }
    var focusResults by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { runCatching { firstKey.requestFocus() } }
    // Teclado del celular: pregunta cada segundo solo con Buscar abierto y la app visible.
    LaunchedEffect(Unit) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            var renewals = 0
            while (true) {
                var session = PhoneKeyboardStore.fresh()
                if (session == null) {
                    session = client.createTvKeyboard()
                    if (session == null) { phone = null; delay(30_000); continue }
                    PhoneKeyboardStore.session = session
                    PhoneKeyboardStore.version = -1
                    PhoneKeyboardStore.createdAt = SystemClock.elapsedRealtime()
                }
                phone = session
                val poll = client.pollTvKeyboard(session.code, PhoneKeyboardStore.version)
                when {
                    poll == null -> delay(3_000)
                    poll.expired -> {
                        PhoneKeyboardStore.clear(); phone = null
                        if (++renewals > 6) return@repeatOnLifecycle
                    }
                    else -> {
                        if (poll.v != PhoneKeyboardStore.version) {
                            val first = PhoneKeyboardStore.version < 0
                            PhoneKeyboardStore.version = poll.v
                            // Al empezar no se pisa lo escrito con el control (versión 0 = sin texto).
                            if (!(first && poll.v == 0)) {
                                poll.text?.let { query = it.take(MAX_QUERY) }
                                if (poll.done) focusResults = true
                            }
                        }
                        delay(1_000)
                    }
                }
            }
        }
    }
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
    val hasResults = query.trim().length >= 2 && (showTitles || showAnime || showChannels)
    val firstRow = when { showTitles -> "titles"; showAnime -> "anime"; else -> "channels" }
    // ▲ desde la primera fila de resultados va a los filtros (no al teclado).
    var firstRowFocused by remember { mutableStateOf(false) }
    fun rowMod(key: String) = if (key == firstRow) Modifier.onFocusChanged { firstRowFocused = it.hasFocus } else Modifier
    // ► desde la última tecla de cada fila va a los resultados (los filtros quedan con ▲/▼).
    val toResults: () -> Boolean = { if (hasResults) runCatching { resultsFocus.requestFocus() }; true }
    LaunchedEffect(focusResults, hasResults) {
        if (focusResults && hasResults) { delay(50); runCatching { resultsFocus.requestFocus() }; focusResults = false }
    }

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
                                KeyCap(ch.toString(), 38.dp, if (r == 0 && c == 0) firstKey else null, onRight = if (c == row.length - 1) toResults else null) { sounds.playClick(); if (query.length < MAX_QUERY) query += ch }
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        KeyCap("9", 38.dp) { sounds.playClick(); query += "9" }
                        KeyCap("0", 38.dp) { sounds.playClick(); query += "0" }
                        KeyCap("Espacio", 82.dp) { sounds.playClick(); if (query.isNotEmpty() && !query.endsWith(" ")) query += " " }
                        KeyCap("Borrar", 60.dp) { sounds.playClick(); query = query.dropLast(1) }
                        KeyCap("Limpiar", 60.dp, onRight = toResults) { sounds.playClick(); query = "" }
                    }
                }
                phone?.let { PhoneKeyboardCard(it) }
            }
            Spacer(Modifier.width(18.dp))
            // Resultados
            Column(Modifier.weight(1f)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SearchType.entries.forEach { t ->
                        NoirButton(
                            t.label, { sounds.playClick(); type = t },
                            // ▼ desde los filtros va al primer resultado.
                            modifier = if (hasResults) Modifier.focusProperties { down = resultsFocus } else Modifier,
                            selected = type == t, focusRequester = if (type == t) chipsFocus else null,
                        )
                    }
                }
                Spacer(Modifier.height(6.dp))
                Box(
                    Modifier.weight(1f).fillMaxWidth().onPreviewKeyEvent { e ->
                        // ▲ desde la primera fila de resultados va a los filtros (no al teclado).
                        firstRowFocused && e.type == KeyEventType.KeyDown && e.key == Key.DirectionUp &&
                            runCatching { chipsFocus.requestFocus() }.isSuccess
                    },
                ) {
                    when {
                        query.trim().length < 2 -> SearchHint("Escribe al menos 2 letras con el teclado de la izquierda.")
                        searching && !showTitles && !showAnime && !showChannels -> NoirSpinner(Modifier.align(Alignment.Center))
                        !showTitles && !showAnime && !showChannels -> SearchHint("No encontramos resultados para “${query.trim()}”.")
                        else -> LazyColumn(contentPadding = PaddingValues(top = 4.dp, bottom = 16.dp), modifier = Modifier.fillMaxSize()) {
                            if (showTitles) item(key = "titles") {
                                CatalogRow(modifier = rowMod("titles"), title = "Películas y series", items = titles, onOpen = { onOpenTitle(if (it.mediaType == "series") TitleKind.SERIES else TitleKind.MOVIE, it.id) }, firstItemFocus = if (firstRow == "titles") resultsFocus else null)
                            }
                            if (showAnime) item(key = "anime") {
                                CatalogRow(modifier = rowMod("anime"), title = "Anime", items = anime, onOpen = { onOpenTitle(TitleKind.ANIME, it.id) }, firstItemFocus = if (firstRow == "anime") resultsFocus else null)
                            }
                            if (showChannels) item(key = "channels") {
                                Column(rowMod("channels").padding(vertical = 8.dp)) {
                                    MnText("Canales", color = Mn.Text, size = 15.sp, family = Mn.Serif, modifier = Modifier.padding(start = 8.dp, bottom = 8.dp))
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp)) {
                                        items(channels, key = { it.id }) { ch ->
                                            val m = if (firstRow == "channels" && ch.id == channels.first().id) Modifier.focusRequester(resultsFocus) else Modifier
                                            ChannelCard(channel = ch, onClick = { onPlayChannel(ch.id, ch.name) }, modifier = m)
                                        }
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
private fun KeyCap(label: String, width: Dp, focusRequester: FocusRequester? = null, onRight: (() -> Boolean)? = null, onClick: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(4.dp)
    Box(
        Modifier
            .let { if (focusRequester != null) it.focusRequester(focusRequester) else it }
            .onFocusChanged { focused = it.isFocused }
            .let { m ->
                if (onRight == null) m
                else m.onPreviewKeyEvent { e -> e.type == KeyEventType.KeyDown && e.key == Key.DirectionRight && onRight() }
            }
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

/** QR y código para escribir la búsqueda desde el celular. */
@Composable
private fun PhoneKeyboardCard(session: TvKeyboardSession) {
    val qr = remember(session.url) { QrBitmap.encode(session.url, 200)?.asImageBitmap() }
    Spacer(Modifier.height(10.dp))
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(4.dp)).background(Mn.Lowest)
            .border(1.dp, Mn.OutlineVar, RoundedCornerShape(4.dp)).padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (qr != null) {
            Image(qr, contentDescription = "Código QR", filterQuality = FilterQuality.None, modifier = Modifier.size(64.dp).clip(RoundedCornerShape(2.dp)))
            Spacer(Modifier.width(10.dp))
        }
        Column {
            MnText("ESCRIBE DESDE TU CELULAR", color = Mn.Gold, size = 7.5.sp, weight = FontWeight.SemiBold, spacing = 1.2.sp, lines = 1)
            Spacer(Modifier.height(3.dp))
            MnText("Escanea el código o entra a ${session.url.substringAfter("://").substringBefore("?")}", color = Mn.Variant, size = 8.sp, lines = 2)
            Spacer(Modifier.height(3.dp))
            MnText(session.displayCode ?: session.code, color = Mn.Text, size = 13.sp, weight = FontWeight.SemiBold, spacing = 2.sp, lines = 1)
        }
    }
}
