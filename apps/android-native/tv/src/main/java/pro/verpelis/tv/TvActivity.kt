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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.input.key.key
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tv
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import pro.verpelis.core.data.Channel
import pro.verpelis.core.ui.Badge
import pro.verpelis.core.ui.NoirLabel
import pro.verpelis.core.ui.ProgressLine
import pro.verpelis.core.ui.Wordmark
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.async
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
        val open = intent.getStringExtra("detailId")
        setContent { NoirTheme { TvApp(open) } }
    }
}

/** Foco TV del diseño: escala 1.1 y borde dorado de 3 dp. */
val GoldFocusBorder = Border(BorderStroke(3.dp, Noir.Gold), shape = RoundedCornerShape(6.dp))

private sealed interface TvRoute {
    data object Home : TvRoute
    data object Search : TvRoute
    data object Channels : TvRoute
    data object Anime : TvRoute
    data object MyList : TvRoute
    data class Detail(val t: Title) : TvRoute
}

@Composable
fun TvApp(openId: String? = null) {
    val ctx = LocalContext.current
    val api = remember { PelisApi.get(ctx) }
    var loggedIn by remember { mutableStateOf(api.session.hasSession) }
    if (!loggedIn) { PairingScreen(api) { loggedIn = true }; return }
    var route by remember { mutableStateOf<TvRoute>(TvRoute.Home) }
    var stack by remember { mutableStateOf(listOf<TvRoute>()) }
    fun go(r: TvRoute) { stack = stack + route; route = r }
    LaunchedEffect(openId) { if (openId != null) api.movie(openId)?.let { go(TvRoute.Detail(it)) } }
    androidx.activity.compose.BackHandler(enabled = stack.isNotEmpty()) { route = stack.last(); stack = stack.dropLast(1) }

    Row(Modifier.fillMaxSize().background(Noir.Ink)) {
        Column(Modifier.width(72.dp).fillMaxHeight().background(Noir.Ink).padding(vertical = 24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.size(36.dp).background(Noir.Raised, RoundedCornerShape(6.dp)), Alignment.Center) {
                Text("P", fontFamily = Noir.Display, color = Noir.Gold, fontSize = 20.sp)
            }
            Spacer(Modifier.weight(1f))
            listOf(
                Triple("Buscar", Icons.Filled.Search, TvRoute.Search),
                Triple("Inicio", Icons.Filled.Home, TvRoute.Home),
                Triple("TV en vivo", Icons.Filled.Tv, TvRoute.Channels),
                Triple("Anime", Icons.Filled.AutoAwesome, TvRoute.Anime),
                Triple("Mi lista", Icons.Filled.Bookmark, TvRoute.MyList),
            ).forEach { (l, icon, r) ->
                RailItem(l, icon, route == r) { stack = emptyList(); route = r }
            }
            Spacer(Modifier.weight(1f))
            Text("PELIS", fontFamily = Noir.Display, color = Noir.Gold, fontSize = 11.sp)
        }
        Box(Modifier.fillMaxSize()) {
            when (val r = route) {
                TvRoute.Home -> TvHome(api) { go(TvRoute.Detail(it)) }
                TvRoute.Search -> TvSearch(api) { go(TvRoute.Detail(it)) }
                TvRoute.Channels -> TvChannels(api)
                TvRoute.Anime -> TvCatalog("Anime", "No hay anime", { go(TvRoute.Detail(it)) }) { o, l -> api.animePage(o, l) }
                TvRoute.MyList -> TvLibrary(api) { go(TvRoute.Detail(it)) }
                is TvRoute.Detail -> TvDetail(api, r.t)
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun RailItem(label: String, icon: ImageVector, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        border = ClickableSurfaceDefaults.border(focusedBorder = GoldFocusBorder),
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (selected) Noir.Gold.copy(alpha = 0.16f) else Color.Transparent,
            focusedContainerColor = Noir.Raised, contentColor = if (selected) Noir.Gold else Noir.Muted, focusedContentColor = Noir.Gold,
        ),
        modifier = Modifier.size(44.dp),
    ) { Box(Modifier.fillMaxSize(), Alignment.Center) { androidx.compose.material3.Icon(icon, label, Modifier.size(22.dp)) } }
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

private class TvHomeData(val hero: Title?, val cont: List<Title>, val anime: List<Title>, val trending: List<Title>, val channels: List<Channel>, val rows: List<Pair<String, List<Title>>>)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvHome(api: PelisApi, onOpen: (Title) -> Unit) {
    val ctx = LocalContext.current
    val data = rememberLoad("home") {
        kotlinx.coroutines.coroutineScope {
            fun <T> bg(default: T, f: suspend () -> T) = async { runCatching { f() }.getOrDefault(default) }
            val trending = bg(emptyList()) { api.trending() }
            val featured = bg(emptyList()) { api.featured() }
            val cont = bg(emptyList()) { api.history().filter { it.progress in 0.01f..0.97f }.distinctBy { it.id } }
            val anime = bg(emptyList()) { api.animeList().filter { it.poster != null }.take(15) }
            val channels = bg(emptyList()) { api.channelsPage(0, 24).items.filter { it.online }.take(12) }
            val rows = listOf("Acción", "Comedia", "Drama", "Terror").map { g -> g to bg(emptyList()) { api.byGenre(g) } }
            val tr = trending.await()
            TvHomeData(
                hero = featured.await().firstOrNull { !it.comingSoon } ?: tr.firstOrNull { it.backdrop != null && !it.comingSoon },
                cont = cont.await(), anime = anime.await(), trending = tr.take(10), channels = channels.await(),
                rows = rows.map { (g, d) -> g to d.await() },
            )
        }
    }
    TvLoad(data) { d ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 32.dp)) {
            d.hero?.let { t -> item { TvHero(t, onPlay = { onOpen(t) }, onInfo = { onOpen(t) }) } }
            if (d.cont.isNotEmpty()) item {
                TvSection("Continuar viendo", "${d.cont.size} en curso")
                LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    items(d.cont, key = { it.id }) { t ->
                        Card(onClick = { onOpen(t) }, modifier = Modifier.width(280.dp).height(158.dp),
                            scale = CardDefaults.scale(focusedScale = 1.1f), border = CardDefaults.border(focusedBorder = GoldFocusBorder),
                            shape = CardDefaults.shape(RoundedCornerShape(6.dp))) {
                            Box(Modifier.fillMaxSize()) {
                                AsyncImage(t.backdrop, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Noir.Ink))))
                                Column(Modifier.align(Alignment.BottomStart).padding(10.dp)) {
                                    Text(t.name, color = Noir.Text, fontSize = 14.sp, fontFamily = Noir.Display, maxLines = 1)
                                    Spacer(Modifier.height(6.dp)); ProgressLine(t.progress)
                                }
                            }
                        }
                    }
                }
            }
            if (d.anime.isNotEmpty()) item { TvSection("Anime destacado", null, "Ediciones en simulcast"); PosterRow(d.anime, onOpen) }
            if (d.trending.isNotEmpty()) item {
                TvSection("Tendencias en Pelis", null, "Las obras más vistas")
                LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(d.trending.size) { i ->
                        val t = d.trending[i]
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text("${i + 1}", fontFamily = Noir.Display, fontWeight = FontWeight.Bold, fontSize = 96.sp, color = Noir.Gold.copy(alpha = 0.35f))
                            TvPoster(t) { onOpen(t) }
                        }
                    }
                }
            }
            if (d.channels.isNotEmpty()) item {
                TvSection("Canales en vivo", "Emisión 24/7")
                LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    items(d.channels, key = { it.id }) { ch -> TvChannelCard(ch) { PlaybackIntent.start(ctx, TvPlayerActivity::class.java, PlaybackRequest(api.channelStreamUrl(ch.id), ch.name, live = true)) } }
                }
            }
            items(d.rows.filter { it.second.isNotEmpty() }) { (g, list) -> TvSection(g); PosterRow(list, onOpen) }
            item {
                Row(Modifier.padding(horizontal = 48.dp, vertical = 24.dp), verticalAlignment = Alignment.CenterVertically) {
                    Wordmark(14.sp)
                    Spacer(Modifier.width(12.dp))
                    Text("Películas, series, anime y canales en vivo.", style = NoirBody)
                }
            }
        }
    }
}

@Composable
fun TvSection(title: String, badge: String? = null, subtitle: String? = null) {
    Column(Modifier.padding(start = 48.dp, top = 20.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, style = NoirSection.copy(fontSize = 24.sp))
            if (badge != null) { Spacer(Modifier.width(10.dp)); Badge(badge, gold = true) }
        }
        if (subtitle != null) Text(subtitle, style = NoirBody.copy(fontSize = 12.sp))
    }
}

@Composable
fun PosterRow(list: List<Title>, onOpen: (Title) -> Unit) {
    LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
        items(list.distinctBy { it.id }, key = { it.id }) { TvPoster(it) { onOpen(it) } }
    }
}

@Composable
fun TvHero(t: Title, onPlay: () -> Unit, onInfo: () -> Unit) {
    Box(Modifier.fillMaxWidth().height(380.dp)) {
        AsyncImage(t.backdrop, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Noir.Ink, Noir.Ink.copy(alpha = 0.6f), Color.Transparent))))
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Transparent, Noir.Ink))))
        Column(Modifier.align(Alignment.CenterStart).padding(start = 48.dp).width(560.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Badge("Destacado", gold = true); Badge("HD") }
            Spacer(Modifier.height(10.dp))
            Text(listOf(t.genre.split(",").firstOrNull().orEmpty(), t.classification, t.year).filter { it.isNotBlank() }.joinToString("  ·  "), style = NoirBody)
            Text(t.name, style = NoirTitle.copy(fontSize = 44.sp, lineHeight = 48.sp))
            Text(t.synopsis, color = Noir.Text.copy(alpha = 0.8f), fontSize = 15.sp, maxLines = 2)
            Spacer(Modifier.height(18.dp))
            val fr = remember { androidx.compose.ui.focus.FocusRequester() }
            LaunchedEffect(t.id) { runCatching { fr.requestFocus() } }
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                TvButton("Reproducir", primary = true, modifier = Modifier.focusRequester(fr), onClick = onPlay)
                TvButton("Más información", onClick = onInfo)
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvChannelCard(ch: Channel, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.size(260.dp, 146.dp), scale = CardDefaults.scale(focusedScale = 1.1f),
        border = CardDefaults.border(focusedBorder = GoldFocusBorder), colors = CardDefaults.colors(containerColor = Noir.Surface),
        shape = CardDefaults.shape(RoundedCornerShape(6.dp))) {
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Noir.Raised, Noir.Ink)))) {
            AsyncImage(ch.logo, ch.name, contentScale = ContentScale.Fit, modifier = Modifier.align(Alignment.Center).size(120.dp, 60.dp))
            Box(Modifier.padding(8.dp)) { Badge("En vivo", danger = true) }
            Column(Modifier.align(Alignment.BottomStart).padding(10.dp)) {
                Text(ch.name, color = Noir.Text, fontSize = 13.sp, maxLines = 1)
                Text(ch.category, style = NoirLabel.copy(fontSize = 9.sp))
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvDetail(api: PelisApi, t: Title) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var msg by remember { mutableStateOf<String?>(null) }
    var fav by remember { mutableStateOf(false) }
    var episode by remember { mutableStateOf(1) }
    val full = rememberLoad(t.id) { if (t.kind == Kind.ANIME) api.anime(t.id) ?: t else api.movie(t.id) ?: t }
    val m = (full as? Load.Ok)?.value ?: t
    val isSeries = m.kind == Kind.SERIES || m.kind == Kind.ANIME
    val episodes = if (m.kind == Kind.ANIME) m.episodes.takeIf { it > 0 } ?: 12 else m.episodes.coerceAtLeast(1)
    LaunchedEffect(t.id) { if (t.kind != Kind.ANIME) fav = runCatching { api.isFavorite(t.id) }.getOrDefault(false) }
    fun play(ep: Int) = scope.launch {
        msg = null
        if (m.kind != Kind.ANIME && m.comingSoon) { msg = "Próximamente: este título todavía no tiene video"; return@launch }
        val req = when {
            m.kind == Kind.ANIME -> api.animeEpisode(m.id, ep)?.let { (u, s) -> PlaybackRequest(u, "${m.name} - Ep. $ep", null, s) }
            m.kind == Kind.SERIES && ep > 1 -> null
            else -> api.playableUrl(m)?.let { PlaybackRequest(it, if (isSeries) "${m.name} - Ep. $ep" else m.name, m.id, m.subtitles) }
        }
        if (req == null) msg = if (isSeries) "El episodio $ep aún no está disponible" else "Este título no tiene video disponible todavía"
        else PlaybackIntent.start(ctx, TvPlayerActivity::class.java, req)
    }
    Box(Modifier.fillMaxSize()) {
        AsyncImage(m.backdrop, m.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Noir.Ink, Noir.Ink.copy(alpha = 0.75f), Color.Transparent))))
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Noir.Ink))))
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(48.dp)) {
            item {
                Column(Modifier.width(600.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Badge("Destacado", gold = true); Badge("HD")
                        if (m.classification.isNotBlank()) Badge(m.classification, danger = true)
                    }
                    Spacer(Modifier.height(12.dp))
                    Text(m.name, style = NoirTitle.copy(fontSize = 44.sp, lineHeight = 48.sp))
                    Text(listOf(m.year, m.genre, if (isSeries) "$episodes episodios" else "").filter { it.isNotBlank() }.joinToString("  ·  "), style = NoirBody)
                    Spacer(Modifier.height(14.dp))
                    Text(m.synopsis, color = Noir.Text, fontSize = 15.sp, maxLines = 5)
                    Spacer(Modifier.height(22.dp))
                    val fr = remember { androidx.compose.ui.focus.FocusRequester() }
                    LaunchedEffect(t.id) { runCatching { fr.requestFocus() } }
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        TvButton(if (m.kind != Kind.ANIME && m.comingSoon) "Próximamente" else if (isSeries) "Reproducir episodio $episode" else "Reproducir", primary = true, modifier = Modifier.focusRequester(fr)) { play(episode) }
                        if (m.kind != Kind.ANIME) TvButton(if (fav) "En mi lista" else "Agregar a mi lista") {
                            scope.launch { runCatching { api.setFavorite(m.id, !fav); fav = !fav } }
                        }
                    }
                    msg?.let { Text(it, color = Color(0xFFE08A95), modifier = Modifier.padding(top = 12.dp)) }
                }
            }
            if (isSeries) item {
                Column(Modifier.padding(top = 28.dp)) {
                    Text("Temporada 1 · Episodios", style = NoirLabel)
                    LazyRow(contentPadding = PaddingValues(vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        items((1..episodes).toList()) { e ->
                            val ok = m.kind == Kind.ANIME || (e == 1 && !m.comingSoon)
                            Surface(
                                onClick = { episode = e; play(e) },
                                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
                                border = ClickableSurfaceDefaults.border(focusedBorder = GoldFocusBorder),
                                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
                                colors = ClickableSurfaceDefaults.colors(
                                    containerColor = if (e == episode) Noir.Gold.copy(alpha = 0.16f) else Noir.Surface,
                                    focusedContainerColor = Noir.Raised, contentColor = Noir.Text, focusedContentColor = Noir.Gold,
                                ),
                                modifier = Modifier.width(130.dp),
                            ) {
                                Column(Modifier.padding(12.dp)) {
                                    Text("EP. $e", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                                    Text(if (ok) "Disponible" else "Próximamente", fontSize = 11.sp, color = Noir.Muted)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TvButton(label: String, primary: Boolean = false, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = modifier,
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
    var cat by remember { mutableStateOf<String?>(null) }
    val cats = rememberLoad(Unit) { api.channelCategories() }
    val names = (cats as? Load.Ok)?.value.orEmpty()
    Column(Modifier.fillMaxSize()) {
        Text("TV en vivo", style = NoirTitle, modifier = Modifier.padding(start = 48.dp, top = 24.dp, bottom = 8.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            item { TvButton("Todos") { cat = null } }
            items(names) { c -> TvButton(c) { cat = c } }
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            TvChannelPage(api, cat) { ch ->
                PlaybackIntent.start(ctx, TvPlayerActivity::class.java, PlaybackRequest(api.channelStreamUrl(ch.id), ch.name, live = true))
            }
        }
    }
}

/** Catálogo paginado. Sin texto se muestran las películas populares. */
@Composable
fun TvSearch(api: PelisApi, onOpen: (Title) -> Unit) {
    var q by remember { mutableStateOf("") }
    var debounced by remember { mutableStateOf("") }
    LaunchedEffect(q) { delay(300); debounced = q.trim() }
    val searching = debounced.length >= 2
    Column(Modifier.fillMaxSize()) {
        Text("Buscar", style = NoirTitle, modifier = Modifier.padding(start = 48.dp, top = 24.dp))
        androidx.compose.material3.OutlinedTextField(
            value = q,
            onValueChange = { q = it },
            singleLine = true,
            placeholder = { androidx.compose.material3.Text("Películas, series, actores") },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 48.dp, vertical = 12.dp),
        )
        if (!searching) {
            Text("Películas populares", style = NoirSection, modifier = Modifier.padding(start = 48.dp, bottom = 8.dp))
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            TvTitlePage(if (searching) debounced else "popular", if (searching) "Sin resultados para \"$debounced\"" else "No hay títulos", onOpen) { offset, limit ->
                if (searching) api.moviesPage(offset, limit, mediaType = null, search = debounced)
                else api.moviesPage(offset, limit, sort = "popular")
            }
        }
    }
}

@Composable
fun TvCatalog(title: String, empty: String, onOpen: (Title) -> Unit, load: suspend (Int, Int) -> pro.verpelis.core.data.Page<Title>) {
    Column(Modifier.fillMaxSize()) {
        Text(title, style = NoirTitle, modifier = Modifier.padding(start = 48.dp, top = 24.dp, bottom = 8.dp))
        Box(Modifier.weight(1f).fillMaxWidth()) { TvTitlePage(title, empty, onOpen, load) }
    }
}

@Composable
fun TvLibrary(api: PelisApi, onOpen: (Title) -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        Text(if (tab == 0) "Mi lista" else "Seguir viendo", style = NoirTitle, modifier = Modifier.padding(start = 48.dp, top = 24.dp))
        Row(Modifier.padding(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TvButton("Mi lista", primary = tab == 0) { tab = 0 }
            TvButton("Seguir viendo", primary = tab == 1) { tab = 1 }
        }
        Box(Modifier.weight(1f).fillMaxWidth()) {
            TvTitlePage(tab, if (tab == 0) "Tu lista está vacía" else "Todavía no hay nada en seguir viendo", onOpen) { offset, limit ->
                if (tab == 0) api.favoritesPage(offset, limit) else api.historyPage(offset, limit)
            }
        }
    }
}

@Composable
fun TvTitlePage(
    key: Any?,
    empty: String,
    onOpen: (Title) -> Unit,
    load: suspend (offset: Int, limit: Int) -> pro.verpelis.core.data.Page<Title>,
) {
    val pageState = remember(key) { mutableIntStateOf(0) }
    val pageIndex = pageState.intValue
    val limit = pro.verpelis.core.data.PAGE_SIZE
    val state = rememberLoad(key, pageIndex) { load(pageIndex * limit, limit) }
    Box(Modifier.fillMaxSize()) {
        TvLoad(state) { page ->
            if (page.items.isEmpty()) {
                Box(Modifier.fillMaxSize(), Alignment.Center) { Text(empty, style = NoirBody) }
                return@TvLoad
            }
            LazyVerticalGrid(
                columns = GridCells.Adaptive(150.dp),
                contentPadding = PaddingValues(horizontal = 48.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                gridItems(page.items, key = { it.id }) { t ->
                    TvPoster(t) { onOpen(t) }
                }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    TvPageBar(page.pageNumber, page.pageCount, page.total, "título", "títulos",
                        onPrev = { pageState.intValue = pageIndex - 1 }, onNext = { pageState.intValue = pageIndex + 1 })
                }
            }
        }
    }
}

@Composable
fun TvChannelPage(api: PelisApi, category: String?, onOpen: (Channel) -> Unit) {
    val pageState = remember(category) { mutableIntStateOf(0) }
    val pageIndex = pageState.intValue
    val limit = pro.verpelis.core.data.PAGE_SIZE
    val state = rememberLoad(category, pageIndex) { api.channelsPage(pageIndex * limit, limit, category) }
    Box(Modifier.fillMaxSize()) {
        TvLoad(state) { page ->
            if (page.items.isEmpty()) {
                Box(Modifier.fillMaxSize(), Alignment.Center) { Text("No hay canales", style = NoirBody) }
                return@TvLoad
            }
            LazyVerticalGrid(
                columns = GridCells.Adaptive(220.dp),
                contentPadding = PaddingValues(horizontal = 48.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                gridItems(page.items, key = { it.id }) { ch ->
                    TvChannelCard(ch) { onOpen(ch) }
                }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    TvPageBar(page.pageNumber, page.pageCount, page.total, "canal", "canales",
                        onPrev = { pageState.intValue = pageIndex - 1 }, onNext = { pageState.intValue = pageIndex + 1 })
                }
            }
        }
    }
}

@Composable
fun TvPageBar(page: Int, pages: Int, total: Int, one: String, many: String, onPrev: () -> Unit, onNext: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        if (pages > 1) {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
                TvButton("Anterior") { if (page > 1) onPrev() }
                Text("Página $page de $pages", style = NoirBody)
                TvButton("Siguiente") { if (page < pages) onNext() }
            }
        }
        Text(if (total == 1) "1 $one" else "$total $many", style = NoirBody, modifier = Modifier.padding(top = 8.dp))
    }
}

/**
 * Inicio de sesión en TV — diseño Google Stitch "PELIS - Iniciar sesión (Android TV 10-Foot) |
 * Maison Noir" (fe4203145f55480985b6537208384423). QR/código de vinculación (flujo link-tv) y
 * correo/contraseña visibles a la vez; el campo de correo recibe el foco al abrir, así el
 * control remoto siempre tiene dónde estar (antes la pantalla de correo abría sin foco).
 */
@Composable
fun PairingScreen(api: PelisApi, onDone: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var pairing by remember { mutableStateOf<Pairing?>(null) }
    var pairError by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableStateOf(0) }
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val firstField = remember { FocusRequester() }
    val regenButton = remember { FocusRequester() }
    val host = remember { api.base.removePrefix("https://").removePrefix("http://").trimEnd('/') }
    val versionName = remember { runCatching { ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName }.getOrNull() ?: "" }

    LaunchedEffect(Unit) {
        delay(150)
        runCatching { firstField.requestFocus() }
    }
    LaunchedEffect(attempt) {
        pairError = null
        try {
            val p = api.createPairing(); pairing = p
            while (true) {
                delay(3000)
                when (api.pairingStatus(p)) {
                    "approved" -> { api.claimPairing(p); onDone(); return@LaunchedEffect }
                    "expired" -> { attempt++; return@LaunchedEffect }
                }
            }
        } catch (e: Exception) { pairError = e.message ?: "Sin conexión"; pairing = null; delay(5000); attempt++ }
    }
    fun login() {
        if (busy) return
        if (email.isBlank() || pass.isBlank()) { error = "Completa correo y contraseña"; return }
        busy = true; error = null
        scope.launch {
            try { api.signInEmail(email, pass); onDone() } catch (e: Exception) { error = e.message ?: "No se pudo iniciar sesión" }
            busy = false
        }
    }

    MnTvLoginFrame(versionName = versionName, host = host) {
        MnPanel(0.59f, right = firstField) {
            MnEyebrow(MnIcon.Phone, "Vincular con tu teléfono")
            MnTitle("Escanea para entrar", "Accede al instante sin escribir credenciales en pantalla usando la cámara de tu smartphone o tableta.")
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                MnQrCard(
                    qr = null,
                    loading = pairing == null,
                    modifier = Modifier.width(168.dp),
                    image = pairing?.let { p -> { AsyncImage(api.qrUrl(p.verifyUrl), "Código QR para vincular la TV", modifier = Modifier.fillMaxSize().padding(8.dp)) } },
                )
                Column(Modifier.weight(1f)) {
                    MnCodeCard(pairing?.displayCode?.ifBlank { null } ?: pairing?.code, if (pairing != null) "Activo" else "Generando", host)
                    Spacer(Modifier.height(10.dp))
                    MnSteps(host)
                    Spacer(Modifier.height(10.dp))
                    MnStatusLine(pairError ?: if (pairing != null) "Esperando confirmación en el celular…" else "Generando código…", isError = pairError != null)
                }
            }
            MnPanelFooter {
                MnExpiry(parseIsoMillis(pairing?.expiresAt))
                Spacer(Modifier.weight(1f))
                MnOutlineButton("Generar nuevo código", onClick = { pairing = null; attempt++ }, icon = MnIcon.Refresh, focusRequester = regenButton)
            }
        }
        MnPanel(0.41f, left = regenButton) {
            MnEyebrow(MnIcon.Remote, "Con tu cuenta")
            MnTitle("Correo y contraseña", "Usa el control remoto para escribir tus credenciales")
            Spacer(Modifier.height(16.dp))
            MnInputField(
                label = "Correo electrónico", icon = MnIcon.Mail, value = email, onValueChange = { email = it },
                placeholder = "tu@correo.com", keyboardType = KeyboardType.Email, focusRequester = firstField,
            )
            Spacer(Modifier.height(10.dp))
            MnInputField(
                label = "Contraseña", icon = MnIcon.Lock, value = pass, onValueChange = { pass = it },
                placeholder = "••••••••", isPassword = true, keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done, onImeAction = { login() },
            )
            error?.let { Spacer(Modifier.height(8.dp)); MnStatusLine(it, isError = true) }
            Spacer(Modifier.height(14.dp))
            MnPrimaryButton(if (busy) "Entrando…" else "Iniciar sesión", onClick = { login() })
            Spacer(Modifier.weight(1f))
            MnPanelFooter {
                MnText("¿No tienes cuenta?", color = Mn.Variant, size = 9.sp)
                Spacer(Modifier.weight(1f))
                MnText("Regístrate en $host", color = Mn.Gold, size = 9.sp, weight = FontWeight.SemiBold)
            }
        }
    }
}
