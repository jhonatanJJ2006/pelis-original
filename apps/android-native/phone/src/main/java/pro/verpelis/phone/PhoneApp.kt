package pro.verpelis.phone

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.core.data.Kind
import pro.verpelis.core.data.PelisApi
import pro.verpelis.core.data.Title
import pro.verpelis.core.player.PlaybackRequest
import pro.verpelis.core.ui.Noir
import pro.verpelis.core.ui.NoirBody
import pro.verpelis.core.ui.NoirSection
import pro.verpelis.core.ui.NoirTitle
import pro.verpelis.core.ui.PlaybackIntent
import pro.verpelis.core.ui.rememberLoad

private data class Tab(val route: String, val label: String)
private val tabs = listOf(Tab("home", "Inicio"), Tab("search", "Buscar"), Tab("anime", "Anime"), Tab("tv", "TV"), Tab("profile", "Perfil"))

@Composable
fun PhoneApp() {
    val ctx = LocalContext.current
    val api = remember { PelisApi.get(ctx) }
    var loggedIn by remember { mutableStateOf(api.session.hasSession) }
    if (!loggedIn) { LoginScreen(api) { loggedIn = true }; return }

    val nav = rememberNavController()
    val current = nav.currentBackStackEntryAsState().value?.destination?.route
    Scaffold(
        containerColor = Noir.Ink,
        bottomBar = {
            if (tabs.any { it.route == current }) NavigationBar(containerColor = Noir.Surface) {
                tabs.forEach { t ->
                    NavigationBarItem(
                        selected = current == t.route,
                        onClick = { nav.navigate(t.route) { popUpTo("home"); launchSingleTop = true } },
                        icon = { Box(Modifier.size(6.dp).background(if (current == t.route) Noir.Gold else Color.Transparent, RoundedCornerShape(3.dp))) },
                        label = { Text(t.label) },
                        colors = NavigationBarItemDefaults.colors(selectedTextColor = Noir.Gold, unselectedTextColor = Noir.Muted, indicatorColor = Noir.Surface),
                    )
                }
            }
        },
    ) { pad ->
        NavHost(nav, "home", Modifier.padding(pad)) {
            composable("home") { HomeScreen(api, nav) }
            composable("search") { SearchScreen(api, nav) }
            composable("anime") { AnimeScreen(api, nav) }
            composable("tv") { ChannelsScreen(api) }
            composable("profile") { ProfileScreen(api, nav) { loggedIn = false } }
            composable("list") { SimpleListScreen("Mi lista", api, nav) { api.favorites() } }
            composable("history") { SimpleListScreen("Historial", api, nav) { api.history() } }
            composable("plans") { PlansScreen(api) }
            composable("detail/{kind}/{id}") { e ->
                DetailScreen(api, e.arguments?.getString("kind") ?: "movie", e.arguments?.getString("id") ?: "")
            }
        }
    }
}

fun NavHostController.open(t: Title) = navigate("detail/${if (t.kind == Kind.ANIME) "anime" else "movie"}/${t.id}")

fun openCustomTab(ctx: Context, url: String) =
    CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(ctx, Uri.parse(url))

@Composable
fun LoginScreen(api: PelisApi, onDone: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var waitingGoogle by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().background(Noir.Ink).statusBarsPadding().padding(24.dp), verticalArrangement = Arrangement.Center) {
        Text("PELIS", style = NoirTitle.copy(color = Noir.Gold, fontSize = 40.sp))
        Spacer(Modifier.height(8.dp))
        Text("Inicia sesión para continuar", style = NoirBody)
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(email, { email = it }, label = { Text("Correo electrónico") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(pass, { pass = it }, label = { Text("Contraseña") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
        error?.let { Text(it, color = Color(0xFFE08A95), modifier = Modifier.padding(top = 8.dp)) }
        Spacer(Modifier.height(16.dp))
        GoldButton(if (busy) "Entrando..." else "Iniciar sesión", enabled = !busy && email.isNotBlank() && pass.isNotBlank(), modifier = Modifier.fillMaxWidth(), onClick = {
            busy = true; error = null
            scope.launch {
                try { api.signInEmail(email, pass); onDone() } catch (e: Exception) { error = e.message ?: "No se pudo iniciar sesión" }
                busy = false
            }
        })
        Spacer(Modifier.height(12.dp))
        // Google: se abre en el navegador (Custom Tab) usando el flujo de vinculación existente (/link-tv).
        OutlinedButton(onClick = {
            error = null
            scope.launch {
                try {
                    val p = api.createPairing()
                    openCustomTab(ctx, p.verifyUrl)
                    waitingGoogle = true
                    while (waitingGoogle) {
                        delay(2500)
                        when (api.pairingStatus(p)) {
                            "approved" -> { api.claimPairing(p); waitingGoogle = false; onDone() }
                            "expired" -> { waitingGoogle = false; error = "El código expiró, intenta de nuevo" }
                        }
                    }
                } catch (e: Exception) { waitingGoogle = false; error = e.message }
            }
        }, modifier = Modifier.fillMaxWidth()) { Text("Continuar con Google", color = Noir.Text) }
        if (waitingGoogle) Text("Completa el inicio de sesión en el navegador y aprueba este dispositivo.", style = NoirBody, modifier = Modifier.padding(top = 12.dp))
        TextButton(onClick = { openCustomTab(ctx, api.base + "/register") }) { Text("Crear cuenta", color = Noir.Gold) }
    }
}

@Composable
fun HomeScreen(api: PelisApi, nav: NavHostController) {
    val data = rememberLoad(Unit) {
        val trending = api.trending()
        val featured = api.featured().ifEmpty { trending }
        val rows = listOf("Acción", "Comedia", "Drama", "Terror", "Animación").map { g -> g to runCatching { api.byGenre(g) }.getOrDefault(emptyList()) }
        Triple(featured, trending, rows)
    }
    LoadBox(data) { (featured, trending, rows) ->
        LazyColumn(Modifier.fillMaxSize()) {
            featured.firstOrNull()?.let { hero -> item { Hero(hero) { nav.open(hero) } } }
            item { TitleRow("Tendencias", trending) { nav.open(it) } }
            items(rows) { (g, list) -> TitleRow(g, list) { nav.open(it) } }
        }
    }
}

@Composable
fun Hero(t: Title, onClick: () -> Unit) {
    Box(Modifier.fillMaxWidth().height(460.dp).clickable(onClick = onClick)) {
        AsyncImage(t.backdrop ?: t.poster, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Noir.Ink.copy(alpha = 0.6f), Noir.Ink))))
        Column(Modifier.align(Alignment.BottomStart).padding(20.dp)) {
            Text(t.name, style = NoirTitle.copy(fontSize = 32.sp))
            Text(listOf(t.year, t.genre, t.classification).filter { it.isNotBlank() }.joinToString("  ·  "), style = NoirBody)
            Spacer(Modifier.height(12.dp))
            GoldButton("Ver ahora", onClick)
        }
    }
}

@Composable
fun SearchScreen(api: PelisApi, nav: NavHostController) {
    var q by remember { mutableStateOf("") }
    var genre by remember { mutableStateOf<String?>(null) }
    var mode by remember { mutableIntStateOf(0) } // 0 películas, 1 series
    val genres = rememberLoad(Unit) { api.genres() }
    val results = rememberLoad(q, genre, mode) {
        delay(300)
        when {
            q.length >= 2 -> api.search(q)
            mode == 1 -> api.series()
            else -> api.movies(genre)
        }
    }
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        OutlinedTextField(q, { q = it }, placeholder = { Text("Buscar películas y series") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(16.dp))
        Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip("Películas", mode == 0) { mode = 0 }
            Chip("Series", mode == 1) { mode = 1 }
        }
        if (mode == 0 && genres is pro.verpelis.core.ui.Load.Ok) {
            androidx.compose.foundation.lazy.LazyRow(contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { Chip("Todos", genre == null) { genre = null } }
                items(genres.value) { g -> Chip(g, genre == g) { genre = g } }
            }
        }
        LoadBox(results) { list -> Grid(list) { nav.open(it) } }
    }
}

@Composable
fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    Text(text, color = if (selected) Noir.Ink else Noir.Text, fontSize = 13.sp,
        modifier = Modifier.background(if (selected) Noir.Gold else Noir.Raised, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 7.dp))
}

@Composable
fun Grid(list: List<Title>, onOpen: (Title) -> Unit) {
    if (list.isEmpty()) { Text("No hay resultados", style = NoirBody, modifier = Modifier.padding(24.dp)); return }
    LazyVerticalGrid(GridCells.Adaptive(110.dp), contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        items(list, key = { it.id }) { PosterCard(it, { onOpen(it) }, Modifier) }
    }
}

@Composable
fun AnimeScreen(api: PelisApi, nav: NavHostController) {
    var q by remember { mutableStateOf("") }
    val data = rememberLoad(q) { delay(300); if (q.length >= 2) api.searchAnime(q) else api.animeList() }
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Text("Anime", style = NoirTitle, modifier = Modifier.padding(16.dp))
        OutlinedTextField(q, { q = it }, placeholder = { Text("Buscar anime") }, singleLine = true, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
        LoadBox(data) { Grid(it) { t -> nav.open(t) } }
    }
}

@Composable
fun DetailScreen(api: PelisApi, kind: String, id: String) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val data = rememberLoad(kind, id) { if (kind == "anime") api.anime(id) else api.movie(id) }
    var fav by remember { mutableStateOf(false) }
    var episode by remember { mutableIntStateOf(1) }
    var msg by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(id) { if (kind != "anime") fav = runCatching { api.isFavorite(id) }.getOrDefault(false) }
    LoadBox(data) { t ->
        if (t == null) { Text("No encontrado", style = NoirBody, modifier = Modifier.padding(24.dp)); return@LoadBox }
        LazyColumn(Modifier.fillMaxSize()) {
            item {
                Box(Modifier.fillMaxWidth().height(300.dp)) {
                    AsyncImage(t.backdrop, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Noir.Ink))))
                }
            }
            item {
                Column(Modifier.padding(20.dp)) {
                    Text(t.name, style = NoirTitle)
                    Text(listOf(t.year, t.genre, t.classification).filter { it.isNotBlank() }.joinToString("  ·  "), style = NoirBody)
                    Spacer(Modifier.height(16.dp))
                    if (kind == "anime") {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Episodio", color = Noir.Text)
                            TextButton(onClick = { if (episode > 1) episode-- }) { Text("-", color = Noir.Gold, fontSize = 20.sp) }
                            Text("$episode", color = Noir.Text)
                            TextButton(onClick = { episode++ }) { Text("+", color = Noir.Gold, fontSize = 20.sp) }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        GoldButton("Reproducir", onClick = {
                            scope.launch {
                                msg = null
                                val req = if (kind == "anime") {
                                    api.animeEpisode(t.id, episode)?.let { (u, s) -> PlaybackRequest(u, "${t.name} - Ep. $episode", null, s) }
                                } else t.videoUrl?.let { PlaybackRequest(it, t.name, t.id, t.subtitles) }
                                if (req == null) msg = "Este título no tiene video disponible todavía"
                                else PlaybackIntent.start(ctx, PlayerActivity::class.java, req)
                            }
                        })
                        if (kind != "anime") OutlinedButton(onClick = {
                            scope.launch { runCatching { api.setFavorite(t.id, !fav); fav = !fav } }
                        }) { Text(if (fav) "En mi lista" else "Mi lista", color = Noir.Text) }
                    }
                    msg?.let { Text(it, color = Noir.Muted, modifier = Modifier.padding(top = 8.dp)) }
                    Spacer(Modifier.height(16.dp))
                    Text(t.synopsis, color = Noir.Text, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
fun ChannelsScreen(api: PelisApi) {
    val ctx = LocalContext.current
    val data = rememberLoad(Unit) { api.channels().filter { it.online }.groupBy { it.category } }
    LoadBox(data) { groups ->
        LazyColumn(Modifier.fillMaxSize().statusBarsPadding()) {
            item { Text("TV en vivo", style = NoirTitle, modifier = Modifier.padding(16.dp)) }
            groups.forEach { (cat, list) ->
                item { Text(cat, style = NoirSection, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
                items(list, key = { it.id }) { ch ->
                    Row(Modifier.fillMaxWidth().clickable {
                        PlaybackIntent.start(ctx, PlayerActivity::class.java, PlaybackRequest(api.channelStreamUrl(ch.id), ch.name, live = true))
                    }.padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(ch.logo, ch.name, modifier = Modifier.size(56.dp, 36.dp).background(Noir.Raised, RoundedCornerShape(4.dp)))
                        Spacer(Modifier.size(12.dp))
                        Text(ch.name, color = Noir.Text)
                    }
                }
            }
        }
    }
}

@Composable
fun SimpleListScreen(title: String, api: PelisApi, nav: NavHostController, load: suspend () -> List<Title>) {
    val data = rememberLoad(title) { load() }
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Text(title, style = NoirTitle, modifier = Modifier.padding(16.dp))
        LoadBox(data) { Grid(it.distinctBy { t -> t.id }) { t -> nav.open(t) } }
    }
}

@Composable
fun ProfileScreen(api: PelisApi, nav: NavHostController, onLogout: () -> Unit) {
    val scope = rememberCoroutineScope()
    val me = rememberLoad(Unit) { api.me() }
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(16.dp)) {
        Text("Perfil", style = NoirTitle)
        Spacer(Modifier.height(12.dp))
        LoadBox(me) { m ->
            Column {
                Text(m?.name ?: "", color = Noir.Text, fontSize = 18.sp)
                Text(m?.email ?: "", style = NoirBody)
                Text(if (m?.planName != null) "Suscripción activa" else "Sin suscripción activa", color = Noir.Gold, modifier = Modifier.padding(top = 6.dp))
                Spacer(Modifier.height(20.dp))
                listOf("Mi lista" to "list", "Historial" to "history", "Planes" to "plans").forEach { (l, r) ->
                    Text(l, color = Noir.Text, fontSize = 16.sp, modifier = Modifier.fillMaxWidth().clickable { nav.navigate(r) }.padding(vertical = 14.dp))
                }
                Spacer(Modifier.height(20.dp))
                OutlinedButton(onClick = { scope.launch { api.signOut(); onLogout() } }) { Text("Cerrar sesión", color = Color(0xFFE08A95)) }
            }
        }
    }
}

@Composable
fun PlansScreen(api: PelisApi) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val data = rememberLoad(Unit) { api.plans() }
    var error by remember { mutableStateOf<String?>(null) }
    LoadBox(data) { plans ->
        LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { Text("Planes", style = NoirTitle) }
            error?.let { e -> item { Text(e, color = Color(0xFFE08A95)) } }
            items(plans, key = { it.id }) { p ->
                Column(Modifier.fillMaxWidth().background(Noir.Surface, RoundedCornerShape(8.dp))
                    .then(if (p.recommended) Modifier.background(Noir.Raised, RoundedCornerShape(8.dp)) else Modifier).padding(16.dp)) {
                    if (p.recommended) Text("Recomendado", color = Noir.Gold, fontSize = 12.sp)
                    Text(p.name, style = NoirSection)
                    Text("$" + "%.2f".format(p.price) + if (p.months == 1) " / mes" else " / ${p.months} meses", color = Noir.Gold, fontSize = 18.sp)
                    Text(p.description, style = NoirBody)
                    p.features.forEach { Text("- $it", color = Noir.Text, fontSize = 13.sp) }
                    Spacer(Modifier.height(10.dp))
                    GoldButton("Elegir plan", onClick = {
                        scope.launch {
                            // El pago se hace en el checkout web (Stripe) en el navegador.
                            val url = runCatching { api.checkoutUrl(p.id) }.getOrNull()
                            if (url != null) openCustomTab(ctx, url) else { error = null; openCustomTab(ctx, api.base + "/subscribe") }
                        }
                    })
                }
            }
        }
    }
}
