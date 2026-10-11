package pro.verpelis.tv

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Border
import androidx.tv.material3.Card
import androidx.tv.material3.CardDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.core.data.Kind
import pro.verpelis.core.data.Pairing
import pro.verpelis.core.data.PelisApi
import pro.verpelis.core.data.Title
import pro.verpelis.core.player.PlaybackRequest
import pro.verpelis.core.ui.Load
import pro.verpelis.core.ui.Noir
import pro.verpelis.core.ui.NoirBody
import pro.verpelis.core.ui.NoirSection
import pro.verpelis.core.ui.NoirTheme
import pro.verpelis.core.ui.NoirTitle
import pro.verpelis.core.ui.PlaybackIntent
import pro.verpelis.core.ui.rememberLoad

class TvActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NoirTheme { TvApp() } }
    }
}

/** Foco TV del diseño: escala 1.1 y borde dorado de 3 dp. */
val GoldFocusBorder = Border(BorderStroke(3.dp, Noir.Gold), shape = RoundedCornerShape(6.dp))

private sealed interface TvRoute {
    data object Home : TvRoute
    data object Channels : TvRoute
    data object Anime : TvRoute
    data object MyList : TvRoute
    data class Detail(val t: Title) : TvRoute
}

@Composable
fun TvApp() {
    val ctx = LocalContext.current
    val api = remember { PelisApi.get(ctx) }
    var loggedIn by remember { mutableStateOf(api.session.hasSession) }
    if (!loggedIn) { PairingScreen(api) { loggedIn = true }; return }
    var route by remember { mutableStateOf<TvRoute>(TvRoute.Home) }
    var stack by remember { mutableStateOf(listOf<TvRoute>()) }
    fun go(r: TvRoute) { stack = stack + route; route = r }
    androidx.activity.compose.BackHandler(enabled = stack.isNotEmpty()) { route = stack.last(); stack = stack.dropLast(1) }

    Row(Modifier.fillMaxSize().background(Noir.Ink)) {
        Column(Modifier.width(180.dp).fillMaxHeight().background(Noir.Surface).padding(vertical = 32.dp, horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("PELIS", style = NoirTitle.copy(color = Noir.Gold), modifier = Modifier.padding(start = 8.dp, bottom = 16.dp))
            listOf("Inicio" to TvRoute.Home, "TV en vivo" to TvRoute.Channels, "Anime" to TvRoute.Anime, "Mi lista" to TvRoute.MyList).forEach { (l, r) ->
                MenuItem(l, route == r) { stack = emptyList(); route = r }
            }
        }
        Box(Modifier.fillMaxSize()) {
            when (val r = route) {
                TvRoute.Home -> TvHome(api) { go(TvRoute.Detail(it)) }
                TvRoute.Channels -> TvChannels(api)
                TvRoute.Anime -> TvRowsScreen(api, { listOf("Anime" to api.animeList()) }) { go(TvRoute.Detail(it)) }
                TvRoute.MyList -> TvRowsScreen(api, { listOf("Mi lista" to api.favorites(), "Seguir viendo" to api.history()) }) { go(TvRoute.Detail(it)) }
                is TvRoute.Detail -> TvDetail(api, r.t)
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MenuItem(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (selected) Noir.Raised else Color.Transparent,
            focusedContainerColor = Noir.Gold, contentColor = Noir.Text, focusedContentColor = Noir.Ink,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) { Text(label, modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp), fontSize = 16.sp) }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvPoster(t: Title, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.width(150.dp).aspectRatio(2f / 3f),
        scale = CardDefaults.scale(focusedScale = 1.1f),
        border = CardDefaults.border(focusedBorder = GoldFocusBorder),
        shape = CardDefaults.shape(RoundedCornerShape(6.dp)),
    ) {
        AsyncImage(t.poster, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().background(Noir.Raised))
    }
}

@Composable
fun <T> TvLoad(state: Load<T>, content: @Composable (T) -> Unit) {
    when (state) {
        is Load.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) { androidx.compose.material3.CircularProgressIndicator(color = Noir.Gold) }
        is Load.Err -> Box(Modifier.fillMaxSize(), Alignment.Center) { Text(state.message, style = NoirBody) }
        is Load.Ok -> content(state.value)
    }
}

@Composable
fun TvRowsScreen(api: PelisApi, load: suspend () -> List<Pair<String, List<Title>>>, header: (@Composable () -> Unit)? = null, onOpen: (Title) -> Unit) {
    val data = rememberLoad(load) { load() }
    TvLoad(data) { rows ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 24.dp)) {
            header?.let { h -> item { h() } }
            items(rows.filter { it.second.isNotEmpty() }) { (label, list) ->
                Text(label, style = NoirSection, modifier = Modifier.padding(start = 48.dp, top = 16.dp, bottom = 8.dp))
                LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    items(list.distinctBy { it.id }, key = { it.id }) { TvPoster(it) { onOpen(it) } }
                }
            }
        }
    }
}

@Composable
fun TvHome(api: PelisApi, onOpen: (Title) -> Unit) {
    var hero by remember { mutableStateOf<Title?>(null) }
    TvRowsScreen(api, {
        val trending = api.trending()
        hero = api.featured().firstOrNull() ?: trending.firstOrNull()
        listOf("Tendencias" to trending, "Series" to api.series()) +
            listOf("Acción", "Comedia", "Drama", "Terror").map { it to runCatching { api.byGenre(it) }.getOrDefault(emptyList()) }
    }, header = {
        hero?.let { t ->
            Box(Modifier.fillMaxWidth().height(300.dp)) {
                AsyncImage(t.backdrop, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Noir.Ink, Color.Transparent))))
                Column(Modifier.align(Alignment.CenterStart).padding(start = 48.dp).width(420.dp)) {
                    Text(t.name, style = NoirTitle.copy(fontSize = 36.sp))
                    Text(t.synopsis, style = NoirBody, maxLines = 3)
                }
            }
        }
    }, onOpen = onOpen)
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvDetail(api: PelisApi, t: Title) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var msg by remember { mutableStateOf<String?>(null) }
    var fav by remember { mutableStateOf(false) }
    LaunchedEffect(t.id) { if (t.kind != Kind.ANIME) fav = runCatching { api.isFavorite(t.id) }.getOrDefault(false) }
    Box(Modifier.fillMaxSize()) {
        AsyncImage(t.backdrop, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Noir.Ink, Noir.Ink.copy(alpha = 0.7f), Color.Transparent))))
        Column(Modifier.padding(48.dp).width(520.dp)) {
            Text(t.name, style = NoirTitle.copy(fontSize = 40.sp))
            Text(listOf(t.year, t.genre, t.classification).filter { it.isNotBlank() }.joinToString("  ·  "), style = NoirBody)
            Spacer(Modifier.height(16.dp))
            Text(t.synopsis, color = Noir.Text, maxLines = 6)
            Spacer(Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                TvButton("Reproducir", primary = true) {
                    scope.launch {
                        val req = if (t.kind == Kind.ANIME) api.animeEpisode(t.id, 1)?.let { (u, s) -> PlaybackRequest(u, "${t.name} - Ep. 1", null, s) }
                        else (api.movie(t.id) ?: t).let { m -> m.videoUrl?.let { PlaybackRequest(it, m.name, m.id, m.subtitles) } }
                        if (req == null) msg = "Este título no tiene video disponible todavía"
                        else PlaybackIntent.start(ctx, TvPlayerActivity::class.java, req)
                    }
                }
                if (t.kind != Kind.ANIME) TvButton(if (fav) "En mi lista" else "Agregar a mi lista") {
                    scope.launch { runCatching { api.setFavorite(t.id, !fav); fav = !fav } }
                }
            }
            msg?.let { Text(it, style = NoirBody, modifier = Modifier.padding(top = 12.dp)) }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvButton(label: String, primary: Boolean = false, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        border = ClickableSurfaceDefaults.border(focusedBorder = GoldFocusBorder),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (primary) Noir.Gold else Noir.Raised, contentColor = if (primary) Noir.Ink else Noir.Text,
            focusedContainerColor = if (primary) Noir.Gold else Noir.Raised, focusedContentColor = if (primary) Noir.Ink else Noir.Text,
        ),
    ) { Text(label, modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp), fontSize = 16.sp) }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvChannels(api: PelisApi) {
    val ctx = LocalContext.current
    val data = rememberLoad(Unit) { api.channels().filter { it.online }.groupBy { it.category } }
    TvLoad(data) { groups ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 24.dp)) {
            item { Text("TV en vivo", style = NoirTitle, modifier = Modifier.padding(start = 48.dp)) }
            items(groups.entries.toList()) { (cat, list) ->
                Text(cat, style = NoirSection, modifier = Modifier.padding(start = 48.dp, top = 16.dp, bottom = 8.dp))
                LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    items(list, key = { it.id }) { ch ->
                        Card(
                            onClick = { PlaybackIntent.start(ctx, TvPlayerActivity::class.java, PlaybackRequest(api.channelStreamUrl(ch.id), ch.name, live = true)) },
                            modifier = Modifier.size(200.dp, 112.dp),
                            scale = CardDefaults.scale(focusedScale = 1.1f),
                            border = CardDefaults.border(focusedBorder = GoldFocusBorder),
                            colors = CardDefaults.colors(containerColor = Noir.Raised),
                        ) {
                            Column(Modifier.fillMaxSize().padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                AsyncImage(ch.logo, ch.name, modifier = Modifier.size(96.dp, 48.dp))
                                Text(ch.name, fontSize = 12.sp, color = Noir.Text, maxLines = 1)
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Inicio de sesión en TV con código / QR (flujo link-tv existente). */
@Composable
fun PairingScreen(api: PelisApi, onDone: () -> Unit) {
    var pairing by remember { mutableStateOf<Pairing?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableStateOf(0) }
    LaunchedEffect(attempt) {
        error = null
        try {
            val p = api.createPairing(); pairing = p
            while (true) {
                delay(3000)
                when (api.pairingStatus(p)) {
                    "approved" -> { api.claimPairing(p); onDone(); return@LaunchedEffect }
                    "expired" -> { attempt++; return@LaunchedEffect }
                }
            }
        } catch (e: Exception) { error = e.message ?: "Sin conexión"; delay(5000); attempt++ }
    }
    Row(Modifier.fillMaxSize().background(Noir.Ink).padding(64.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text("PELIS", style = NoirTitle.copy(color = Noir.Gold, fontSize = 48.sp))
            Spacer(Modifier.height(16.dp))
            Text("Vincula esta TV", style = NoirTitle)
            Spacer(Modifier.height(8.dp))
            Text("1. En tu celular o computadora abre ${api.base.removePrefix("https://")}/link-tv", color = Noir.Text, fontSize = 18.sp)
            Text("2. Inicia sesión e ingresa este código, o escanea el QR", color = Noir.Text, fontSize = 18.sp)
            Spacer(Modifier.height(24.dp))
            Text(pairing?.displayCode ?: "......", color = Noir.Gold, fontSize = 56.sp, letterSpacing = 8.sp)
            error?.let { Text(it, style = NoirBody) }
        }
        pairing?.let { p ->
            AsyncImage(api.qrUrl(p.verifyUrl), "Código QR", modifier = Modifier.size(280.dp).background(Noir.Text, RoundedCornerShape(8.dp)).padding(12.dp))
        }
    }
}
