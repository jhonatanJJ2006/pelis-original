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
import androidx.compose.ui.input.key.key
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Home
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
            listOf(Triple("Inicio", Icons.Filled.Home, TvRoute.Home), Triple("TV en vivo", Icons.Filled.Tv, TvRoute.Channels),
                Triple("Anime", Icons.Filled.AutoAwesome, TvRoute.Anime), Triple("Mi lista", Icons.Filled.Bookmark, TvRoute.MyList)).forEach { (l, icon, r) ->
                RailItem(l, icon, route == r) { stack = emptyList(); route = r }
            }
            Spacer(Modifier.weight(1f))
            Text("PELIS", fontFamily = Noir.Display, color = Noir.Gold, fontSize = 11.sp)
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
            val channels = bg(emptyList()) { api.channels().filter { it.online }.take(12) }
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
                TvSection("Tendencias en PELIS", null, "Las obras más vistas")
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
                    Wordmark(14.sp, subtitle = null); Spacer(Modifier.width(12.dp))
                    Text("Maison Noir Cinémathèque", style = NoirBody)
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
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Badge("Estreno exclusivo Maison Noir", gold = true); Badge("HD") }
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
                Text(ch.category.uppercase(), style = NoirLabel.copy(fontSize = 9.sp))
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
                        Badge("Estreno exclusivo Maison Noir", gold = true); Badge("HD")
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
                    Text("TEMPORADA 1  ·  EPISODIOS", style = NoirLabel)
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
    val data = rememberLoad(Unit) { api.channels().filter { it.online }.groupBy { it.category } }
    TvLoad(data) { groups ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(vertical = 24.dp)) {
            item { Text("TV en vivo", style = NoirTitle, modifier = Modifier.padding(start = 48.dp)) }
            items(groups.entries.toList()) { (cat, list) ->
                Text(cat, style = NoirSection, modifier = Modifier.padding(start = 48.dp, top = 16.dp, bottom = 8.dp))
                LazyRow(contentPadding = PaddingValues(horizontal = 48.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                    items(list, key = { it.id }) { ch ->
                        TvChannelCard(ch) { PlaybackIntent.start(ctx, TvPlayerActivity::class.java, PlaybackRequest(api.channelStreamUrl(ch.id), ch.name, live = true)) }
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
    var useEmail by remember { mutableStateOf(false) }
    if (useEmail) { TvEmailLogin(api, onBack = { useEmail = false }, onDone = onDone); return }
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
            Text(pairing?.displayCode ?: "......", color = Noir.Gold, fontSize = 56.sp, letterSpacing = 8.sp, fontFamily = Noir.Display)
            error?.let { Text(it, style = NoirBody) }
            Spacer(Modifier.height(24.dp))
            TvButton("Usar correo y contraseña") { useEmail = true }
        }
        pairing?.let { p ->
            AsyncImage(api.qrUrl(p.verifyUrl), "Código QR", modifier = Modifier.size(280.dp).background(Noir.Text, RoundedCornerShape(8.dp)).padding(12.dp))
        }
    }
}

/** Alternativa en TV: correo y contraseña con el teclado en pantalla (misma sesión better-auth). */
@Composable
fun TvEmailLogin(api: PelisApi, onBack: () -> Unit, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    androidx.activity.compose.BackHandler(onBack = onBack)
    val focus = androidx.compose.ui.platform.LocalFocusManager.current
    fun login() { scope.launch { try { api.signInEmail(email, pass); onDone() } catch (e: Exception) { error = e.message ?: "No se pudo iniciar sesión" } } }
    // En TV el D-pad no sale de un campo de texto por defecto: arriba/abajo mueven el foco.
    val dpad = Modifier.onPreviewKeyEvent { ev ->
        if (ev.type != androidx.compose.ui.input.key.KeyEventType.KeyDown) return@onPreviewKeyEvent false
        when (ev.key) {
            androidx.compose.ui.input.key.Key.DirectionDown -> focus.moveFocus(androidx.compose.ui.focus.FocusDirection.Down)
            androidx.compose.ui.input.key.Key.DirectionUp -> focus.moveFocus(androidx.compose.ui.focus.FocusDirection.Up)
            else -> false
        }
    }
    Column(Modifier.fillMaxSize().background(Noir.Ink).padding(64.dp).width(520.dp)) {
        Wordmark(32.sp)
        Spacer(Modifier.height(20.dp))
        Text("Iniciar sesión", style = NoirTitle)
        Spacer(Modifier.height(16.dp))
        androidx.compose.material3.OutlinedTextField(email, { email = it }, label = { androidx.compose.material3.Text("Correo electrónico") }, singleLine = true,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Next),
            modifier = Modifier.width(520.dp).then(dpad))
        Spacer(Modifier.height(12.dp))
        androidx.compose.material3.OutlinedTextField(pass, { pass = it }, label = { androidx.compose.material3.Text("Contraseña") }, singleLine = true,
            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Done),
            keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { login() }),
            modifier = Modifier.width(520.dp).then(dpad))
        error?.let { Text(it, color = Color(0xFFE08A95), modifier = Modifier.padding(top = 8.dp)) }
        Spacer(Modifier.height(20.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            TvButton("Iniciar sesión", primary = true) { login() }
            TvButton("Volver al código", onClick = onBack)
        }
    }
}
