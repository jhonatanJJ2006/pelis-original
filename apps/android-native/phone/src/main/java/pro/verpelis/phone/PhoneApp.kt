package pro.verpelis.phone

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import android.content.res.Configuration
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
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
import kotlinx.coroutines.async
import pro.verpelis.core.data.ApiException
import pro.verpelis.core.data.Kind
import pro.verpelis.core.data.PelisApi
import pro.verpelis.core.data.Title
import pro.verpelis.core.player.PlaybackRequest
import pro.verpelis.core.ui.Badge
import pro.verpelis.core.ui.EpisodePicker
import pro.verpelis.core.ui.Noir
import pro.verpelis.core.ui.NoirBody
import pro.verpelis.core.ui.NoirLabel
import pro.verpelis.core.ui.NoirSection
import pro.verpelis.core.ui.NoirTitle
import pro.verpelis.core.ui.PlaybackIntent
import pro.verpelis.core.ui.SectionHeader
import pro.verpelis.core.ui.Wordmark
import pro.verpelis.core.ui.rememberLoad

private data class Tab(val route: String, val label: String, val icon: ImageVector)
private val tabs = listOf(
    Tab("home", "Inicio", Icons.Filled.Home), Tab("search", "Buscar", Icons.Filled.Search),
    Tab("anime", "Anime", Icons.Filled.AutoAwesome), Tab("tv", "TV", Icons.Filled.Tv), Tab("profile", "Perfil", Icons.Filled.Person),
)

@Composable
fun PhoneApp(startRoute: String = "home") {
    val ctx = LocalContext.current
    val api = remember { PelisApi.get(ctx) }
    var loggedIn by remember { mutableStateOf(api.session.hasSession) }
    // Invitado: puede explorar el catálogo; reproducir sigue pidiendo sesión y plan (muro en el servidor).
    var guest by remember { mutableStateOf(false) }
    if (!loggedIn && !guest) { LoginScreen(api, onGuest = { guest = true }) { loggedIn = true }; return }

    val nav = rememberNavController()
    val current = nav.currentBackStackEntryAsState().value?.destination?.route
    LaunchedEffect(startRoute) { if (startRoute.startsWith("detail/") || startRoute in listOf("list", "history", "plans")) nav.navigate(startRoute) }
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    val showTabs = tabs.any { it.route == current }
    Row(Modifier.fillMaxSize().background(Noir.Ink)) {
    // En horizontal la barra de pestañas va a la izquierda (riel) para no quitar alto al contenido.
    if (landscape && showTabs) androidx.compose.material3.NavigationRail(containerColor = Noir.Surface, modifier = Modifier.statusBarsPadding()) {
        tabs.forEach { t ->
            androidx.compose.material3.NavigationRailItem(
                selected = current == t.route,
                onClick = { nav.navigate(t.route) { popUpTo("home"); launchSingleTop = true } },
                icon = { Icon(t.icon, t.label) },
                label = { Text(t.label.uppercase(), fontSize = 9.sp, letterSpacing = 0.6.sp) },
                colors = androidx.compose.material3.NavigationRailItemDefaults.colors(
                    selectedIconColor = Noir.Gold, selectedTextColor = Noir.Gold,
                    unselectedIconColor = Noir.Muted, unselectedTextColor = Noir.Muted, indicatorColor = Noir.Surface,
                ),
            )
        }
    }
    Scaffold(
        modifier = Modifier.weight(1f),
        containerColor = Noir.Ink,
        bottomBar = {
            if (!landscape && showTabs) NavigationBar(containerColor = Noir.Surface, tonalElevation = 0.dp) {
                tabs.forEach { t ->
                    NavigationBarItem(
                        selected = current == t.route,
                        onClick = { nav.navigate(t.route) { popUpTo("home"); launchSingleTop = true } },
                        icon = { Icon(t.icon, t.label) },
                        label = { Text(t.label.uppercase(), fontSize = 10.sp, letterSpacing = 0.8.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Noir.Gold, selectedTextColor = Noir.Gold,
                            unselectedIconColor = Noir.Muted, unselectedTextColor = Noir.Muted, indicatorColor = Noir.Surface,
                        ),
                    )
                }
            }
        },
    ) { pad ->
        NavHost(nav, if (tabs.any { it.route == startRoute }) startRoute else "home", Modifier.padding(pad)) {
            composable("home") { HomeScreen(api, nav) }
            composable("search") { SearchScreen(api, nav) }
            composable("anime") { AnimeScreen(api, nav) }
            composable("tv") { ChannelsScreen(api) }
            composable("profile") {
                if (loggedIn) ProfileScreen(api, nav) { loggedIn = false; guest = false }
                else LoginScreen(api) { loggedIn = true; guest = false }
            }
            composable("list") { SimpleListScreen("Mi lista", "Aún no guardaste títulos", api, nav) { o, l -> api.favoritesPage(o, l) } }
            composable("history") { SimpleListScreen("Historial", "Todavía no viste nada", api, nav) { o, l -> api.historyPage(o, l) } }
            composable("plans") { PlansScreen(api) }
            composable("detail/{kind}/{id}") { e ->
                DetailScreen(api, nav, e.arguments?.getString("kind") ?: "movie", e.arguments?.getString("id") ?: "")
            }
        }
    }
    }
}

fun NavHostController.open(t: Title) = navigate("detail/${if (t.kind == Kind.ANIME) "anime" else "movie"}/${t.id}")

fun openCustomTab(ctx: Context, url: String) =
    CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(ctx, Uri.parse(url))

@Composable
private fun TopBar(nav: NavHostController? = null, back: Boolean = false) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        if (back && nav != null) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver", tint = Noir.Text, modifier = Modifier.clickable { nav.popBackStack() })
            Spacer(Modifier.width(12.dp))
        }
        Wordmark()
        Spacer(Modifier.weight(1f))
        if (nav != null && !back) Box(Modifier.size(30.dp).border(1.dp, Noir.Gold, RoundedCornerShape(15.dp)).clickable { nav.navigate("profile") }, Alignment.Center) {
            Icon(Icons.Filled.Person, "Perfil", tint = Noir.Gold, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun noirFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Noir.Gold, unfocusedBorderColor = Noir.Line, focusedContainerColor = Noir.Raised,
    unfocusedContainerColor = Noir.Raised, cursorColor = Noir.Gold, focusedTextColor = Noir.Text, unfocusedTextColor = Noir.Text,
)

@Composable
fun LoginScreen(api: PelisApi, onGuest: (() -> Unit)? = null, onDone: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var waitingGoogle by remember { mutableStateOf(false) }
    var googleBusy by remember { mutableStateOf(false) }
    var googleNote by remember { mutableStateOf<String?>(null) }
    // Deep link de vuelta del navegador: valida state (un solo uso) y canjea el código por la sesión.
    val callback by AuthCallback.uri.collectAsState()
    LaunchedEffect(callback) {
        val uri = callback ?: return@LaunchedEffect
        AuthCallback.uri.value = null
        busy = true; error = null
        try {
            val cb = api.googleLogin.consume(uri.scheme, uri.host, uri.path, uri.getQueryParameter("code"), uri.getQueryParameter("state"))
            api.exchangeGoogleCode(cb)
            waitingGoogle = false
            onDone()
        } catch (e: Exception) {
            waitingGoogle = false
            error = e.message ?: "No se pudo iniciar sesión con Google"
        }
        busy = false
    }

    Column(Modifier.fillMaxSize().background(Noir.Ink).statusBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
        Wordmark()
        Spacer(Modifier.height(40.dp))
        Column(Modifier.fillMaxWidth().background(Noir.Surface, RoundedCornerShape(10.dp)).border(1.dp, Noir.Line, RoundedCornerShape(10.dp)).padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.width(80.dp).height(2.dp).background(Brush.horizontalGradient(listOf(Color.Transparent, Noir.Gold, Color.Transparent))))
            Spacer(Modifier.height(16.dp))
            Text("PELIS", fontFamily = Noir.Display, fontWeight = FontWeight.Bold, fontSize = 36.sp, color = Noir.Gold, letterSpacing = 3.sp)
            Spacer(Modifier.height(12.dp))
            Text("Iniciar sesión", style = NoirSection.copy(fontSize = 22.sp))
            Spacer(Modifier.height(20.dp))
            Text("Correo electrónico", style = NoirLabel, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(email, { email = it }, placeholder = { Text("tu@correo.com") }, singleLine = true, colors = noirFieldColors(),
                leadingIcon = { Icon(Icons.Filled.Email, null, tint = Noir.Muted) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth()) {
                Text("Contraseña", style = NoirLabel)
                Spacer(Modifier.weight(1f))
                Text("¿Olvidaste tu contraseña?", color = Noir.Gold, fontSize = 11.sp, modifier = Modifier.clickable { openCustomTab(ctx, api.base + "/login") })
            }
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(pass, { pass = it }, singleLine = true, colors = noirFieldColors(),
                leadingIcon = { Icon(Icons.Filled.Lock, null, tint = Noir.Muted) },
                visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth())
            error?.let { Text(it, color = Color(0xFFE08A95), fontSize = 13.sp, modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) }
            Spacer(Modifier.height(20.dp))
            GoldButton(if (busy) "Entrando…" else "Iniciar sesión", enabled = !busy && email.isNotBlank() && pass.isNotBlank(), modifier = Modifier.fillMaxWidth(), onClick = {
                busy = true; error = null
                scope.launch {
                    try { api.signInEmail(email, pass); onDone() } catch (e: Exception) { error = e.message ?: "No se pudo iniciar sesión" }
                    busy = false
                }
            })
            Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).height(1.dp).background(Noir.Line)); Text("  o  ", color = Noir.Muted, fontSize = 12.sp); Box(Modifier.weight(1f).height(1.dp).background(Noir.Line))
            }
            // Google: hoja de cuentas nativa (Credential Manager) dentro de la app. Respaldo automático:
            // flujo web de verpelis.pro en una Custom Tab (sin Google Play services, sin cuentas o sin cliente Android).
            fun openWebGoogle(note: String?) {
                googleNote = note
                waitingGoogle = true
                runCatching { openCustomTab(ctx, api.googleLogin.start()) }
                    .onFailure { waitingGoogle = false; error = "No se pudo abrir el navegador" }
            }
            GhostButton(if (googleBusy) "Conectando con Google…" else "Continuar con Google", modifier = Modifier.fillMaxWidth(), onClick = {
                if (busy || googleBusy) return@GhostButton
                error = null; googleNote = null; waitingGoogle = false; googleBusy = true
                scope.launch {
                    try {
                        val n = try { api.googleNonce() } catch (e: ApiException) {
                            if (e.status == 404 || e.status == 503) null else throw e
                        }
                        if (n == null) { openWebGoogle(null); return@launch }
                        when (val r = NativeGoogleSignIn.request(ctx, n.clientId, n.nonce)) {
                            is NativeGoogleSignIn.Result.Token -> { busy = true; api.signInGoogleIdToken(r.idToken); onDone() }
                            NativeGoogleSignIn.Result.Cancelled -> Unit
                            is NativeGoogleSignIn.Result.Fallback -> {
                                Log.i("PelisGoogle", "Respaldo Custom Tab: ${r.reason}")
                                openWebGoogle("El selector de cuentas de Google no está disponible en este dispositivo; continúa en el navegador.")
                            }
                        }
                    } catch (e: Exception) {
                        error = e.message ?: "No se pudo iniciar sesión con Google"
                    } finally {
                        googleBusy = false; busy = false
                    }
                }
            })
            googleNote?.let { Text(it, color = Noir.Muted, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 12.dp)) }
            if (waitingGoogle) Text("Completa el inicio de sesión con Google en el navegador; volverás a la app automáticamente.", style = NoirBody, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 12.dp))
            Spacer(Modifier.height(18.dp))
            Row {
                Text("¿No tienes cuenta? ", color = Noir.Muted, fontSize = 13.sp)
                Text("Regístrate", color = Noir.Gold, fontSize = 13.sp, modifier = Modifier.clickable { openCustomTab(ctx, api.base + "/register") })
            }
            if (onGuest != null) Text("Explorar el catálogo sin iniciar sesión", color = Noir.Gold, fontSize = 13.sp,
                modifier = Modifier.padding(top = 14.dp).clickable { onGuest() })
            Spacer(Modifier.height(16.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(Noir.Line))
            Text("Conexión protegida con cifrado de grado cinematográfico", color = Noir.Muted, fontSize = 10.sp, modifier = Modifier.padding(top = 12.dp))
        }
    }
}

private data class HomeData(val hero: Title?, val continueWatching: List<Title>, val trending: List<Title>, val latest: List<Title>,
                            val anime: List<Title>, val channels: List<pro.verpelis.core.data.Channel>, val rows: List<Pair<String, List<Title>>>, val plans: List<pro.verpelis.core.data.Plan>)

@Composable
fun HomeScreen(api: PelisApi, nav: NavHostController) {
    val ctx = LocalContext.current
    val data = rememberLoad(Unit) {
        kotlinx.coroutines.coroutineScope {
            fun <T> bg(default: T, f: suspend () -> T) = async { runCatching { f() }.getOrDefault(default) }
            val trending = bg(emptyList()) { api.trending() }
            val featured = bg(emptyList()) { api.featured() }
            val cont = bg(emptyList()) { api.history().filter { it.progress in 0.01f..0.97f }.distinctBy { it.id }.take(10) }
            val latest = bg(emptyList()) { api.movies(limit = 20).sortedByDescending { it.year } }
            val anime = bg(emptyList()) { api.animeList().filter { it.poster != null }.take(15) }
            val channels = bg(emptyList()) { api.channelsPage(0, 24).items.filter { it.online }.take(12) }
            val rows = listOf("Acción", "Comedia", "Terror").map { g -> g to bg(emptyList()) { api.byGenre(g) } }
            val plans = bg(emptyList()) { api.plans() }
            val tr = trending.await()
            // Sin nada de lo esencial (p. ej. sin conexión): error con «Reintentar» en vez de pantalla vacía.
            if (tr.isEmpty() && featured.await().isEmpty() && latest.await().isEmpty()) error("No se pudo cargar el inicio")
            HomeData(
                hero = featured.await().firstOrNull { !it.comingSoon } ?: tr.firstOrNull { it.backdrop != null && !it.comingSoon },
                continueWatching = cont.await(), trending = tr, latest = latest.await(), anime = anime.await(),
                channels = channels.await(), rows = rows.map { (g, d) -> g to d.await() }, plans = plans.await(),
            )
        }
    }
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    LoadBox(data) { d ->
        LazyColumn(Modifier.fillMaxSize().background(Noir.Ink), state = listState) {
            item { Box { d.hero?.let { Hero(it, onPlay = { nav.open(it) }, onInfo = { nav.open(it) }) }; TopBar(nav) } }
            item { ContinueRow(d.continueWatching, onAll = { nav.navigate("history") }) { nav.open(it) } }
            item { TitleRow("Estrenos", d.latest, action = "Ver catálogo", onAction = { nav.navigate("search") }) { nav.open(it) } }
            item { RankedRow(d.trending) { nav.open(it) } }
            item { TitleRow("Anime destacado", d.anime, action = "Ver todo", onAction = { nav.navigate("anime") }) { nav.open(it) } }
            if (d.channels.isNotEmpty()) item {
                Column(Modifier.padding(vertical = 12.dp)) {
                    SectionHeader("Canales en vivo", "Ver todos", onAction = { nav.navigate("tv") }, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(d.channels, key = { it.id }) { ch ->
                            ChannelCard(ch, { PlaybackIntent.start(ctx, PlayerActivity::class.java, PlaybackRequest(api.channelStreamUrl(ch.id), ch.name, live = true)) })
                        }
                    }
                }
            }
            items(d.rows) { (g, list) -> TitleRow(g, list) { nav.open(it) } }
            if (d.plans.isNotEmpty()) item { PlansTeaser(d.plans) { nav.navigate("plans") } }
            item {
                Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Wordmark(16.sp)
                    Text("Películas, series, anime y canales en vivo.", color = Noir.Muted, fontSize = 11.sp, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
fun Hero(t: Title, onPlay: () -> Unit, onInfo: () -> Unit) {
    Box(Modifier.fillMaxWidth().height(520.dp)) {
        AsyncImage(t.backdrop ?: t.poster, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Noir.Ink.copy(alpha = 0.7f), Color.Transparent, Noir.Ink.copy(alpha = 0.7f), Noir.Ink))))
        Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                if (t.isRecent()) Badge("Estreno exclusivo", gold = true)
                Text(t.meta(), color = Noir.Text, fontSize = 11.sp)
            }
            Spacer(Modifier.height(8.dp))
            Text(t.name, style = NoirTitle.copy(fontSize = 34.sp, lineHeight = 38.sp))
            Text(pro.verpelis.core.data.SynopsisText.clean(t.synopsis, 120), color = Noir.Text.copy(alpha = 0.8f), fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                GoldButton("Reproducir", onPlay, Modifier.weight(1f), icon = Icons.Filled.PlayArrow)
                GhostButton("Más información", onInfo, Modifier.weight(1f), icon = Icons.Filled.Info)
            }
        }
    }
}

@Composable
private fun PlansTeaser(plans: List<pro.verpelis.core.data.Plan>, onOpen: () -> Unit) {
    Column(Modifier.padding(16.dp).fillMaxWidth().background(Noir.Surface, RoundedCornerShape(10.dp)).border(1.dp, Noir.Line, RoundedCornerShape(10.dp)).padding(16.dp)) {
        Text("Membresía", style = NoirLabel.copy(color = Noir.Gold))
        Text("Elige tu plan", style = NoirSection)
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            plans.take(3).forEach { p ->
                Column(Modifier.weight(1f).background(Noir.Raised, RoundedCornerShape(6.dp))
                    .border(1.dp, if (p.recommended) Noir.Gold else Noir.Line, RoundedCornerShape(6.dp)).padding(10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally) {
                    if (p.recommended) Text("Recomendado", style = NoirLabel.copy(color = Noir.Gold, fontSize = 8.sp))
                    Text(p.name, color = Noir.Text, fontSize = 12.sp)
                    Text("$" + "%.2f".format(p.price), color = Noir.Gold, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        GoldButton("Gestionar o cambiar suscripción", onOpen, Modifier.fillMaxWidth())
    }
}

@Composable
fun SearchScreen(api: PelisApi, nav: NavHostController) {
    var q by rememberSaveable { mutableStateOf("") }
    var genre by rememberSaveable { mutableStateOf<String?>(null) }
    var mode by rememberSaveable { mutableIntStateOf(0) }
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    val genres = rememberLoad(Unit) { api.genres() }
    // Búsqueda con espera corta; sin texto se ven las películas populares (paginadas).
    var debounced by rememberSaveable { mutableStateOf(q.trim()) }
    LaunchedEffect(q) { delay(300); debounced = q.trim() }
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        // En horizontal se omiten título y encabezado para dejar sitio a la cuadrícula.
        if (!landscape) Text("Buscar", style = NoirTitle, modifier = Modifier.padding(start = 16.dp, top = 12.dp))
        OutlinedTextField(q, { q = it }, placeholder = { Text("Películas, series, actores") }, singleLine = true, colors = noirFieldColors(),
            leadingIcon = { Icon(Icons.Filled.Search, null, tint = Noir.Muted) }, modifier = Modifier.fillMaxWidth().padding(16.dp))
        Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip("Películas", mode == 0) { mode = 0 }
            Chip("Series", mode == 1) { mode = 1 }
        }
        if (mode == 0 && genres is pro.verpelis.core.ui.Load.Ok) {
            LazyRow(contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { Chip("Todos", genre == null) { genre = null } }
                items(genres.value) { g -> Chip(g, genre == g) { genre = g } }
            }
        } else Spacer(Modifier.height(12.dp))
        val searching = debounced.length >= 2
        if (!landscape && !searching && mode == 0 && genre == null) {
            Text("Películas populares", style = NoirSection, modifier = Modifier.padding(horizontal = 16.dp))
        }
        PagedGrid(
            key = Triple(debounced.takeIf { searching }, genre, mode),
            empty = if (searching) "Sin resultados para \"$debounced\"" else "No hay títulos",
            onOpen = { nav.open(it) },
        ) { offset, limit ->
            when {
                searching -> api.moviesPage(offset, limit, mediaType = null, search = debounced)
                mode == 1 -> api.moviesPage(offset, limit, mediaType = "series")
                genre != null -> api.moviesPage(offset, limit, genre = genre)
                else -> api.moviesPage(offset, limit, sort = "popular")
            }
        }
    }
}

@Composable
fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    Text(text, color = if (selected) Noir.Ink else Noir.Text, fontSize = 13.sp, fontWeight = FontWeight.Medium,
        modifier = Modifier.background(if (selected) Noir.Gold else Noir.Raised, RoundedCornerShape(16.dp))
            .border(1.dp, if (selected) Noir.Gold else Noir.Line, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 7.dp))
}

@Composable
fun Grid(list: List<Title>, empty: String = "No hay resultados", onOpen: (Title) -> Unit) {
    if (list.isEmpty()) {
        Column(Modifier.fillMaxWidth().padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Filled.Search, null, tint = Noir.Gold, modifier = Modifier.size(40.dp))
            Spacer(Modifier.height(12.dp))
            Text(empty, style = NoirSection, textAlign = TextAlign.Center)
        }
        return
    }
    LazyVerticalGrid(GridCells.Adaptive(108.dp), contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        gridItems(list, key = { it.id }) { PosterCard(it, { onOpen(it) }, Modifier) }
    }
}

@Composable
fun AnimeScreen(api: PelisApi, nav: NavHostController) {
    var q by rememberSaveable { mutableStateOf("") }
    var debounced by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(q) { delay(300); debounced = q.trim() }
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Anime", style = NoirTitle); Spacer(Modifier.width(8.dp)); Badge("Simulcast", gold = true)
        }
        OutlinedTextField(q, { q = it }, placeholder = { Text("Buscar anime") }, singleLine = true, colors = noirFieldColors(),
            leadingIcon = { Icon(Icons.Filled.Search, null, tint = Noir.Muted) }, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp))
        PagedGrid(debounced, if (debounced.length >= 2) "Sin resultados para \"$debounced\"" else "No hay anime", { t -> nav.open(t) }) { offset, limit ->
            api.animePage(offset, limit, search = debounced.takeIf { it.length >= 2 })
        }
    }
}

@Composable
fun DetailScreen(api: PelisApi, nav: NavHostController, kind: String, id: String) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val data = rememberLoad(kind, id) {
        val t = if (kind == "anime") api.anime(id) else api.movie(id)
        val more = runCatching {
            if (kind == "anime") api.animeList().filter { it.id != id }.take(6)
            else t?.genre?.split(",")?.firstOrNull()?.trim()?.let { g -> api.byGenre(g).filter { it.id != id }.take(6) } ?: emptyList()
        }.getOrDefault(emptyList())
        t to more
    }
    var fav by remember { mutableStateOf(false) }
    var season by remember { mutableIntStateOf(1) }
    var episode by remember { mutableIntStateOf(1) }
    var msg by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(id) { if (kind != "anime") fav = runCatching { api.isFavorite(id) }.getOrDefault(false) }
    LoadBox(data) { (t, more) ->
        if (t == null) { Text("No encontrado", style = NoirBody, modifier = Modifier.padding(24.dp)); return@LoadBox }
        val isSeries = t.kind == Kind.SERIES || kind == "anime"
        val episodes = if (kind == "anime") t.episodes.takeIf { it > 0 } ?: 12 else t.episodes
        fun play() = scope.launch {
            msg = null
            if (kind != "anime" && t.comingSoon) { msg = "Próximamente: este título todavía no tiene video"; return@launch }
            val req = if (kind == "anime") {
                api.animeEpisode(t.id, episode)?.let { (u, s) -> PlaybackRequest(u, "${t.name} - Ep. $episode", null, s) }
            } else if (t.kind == Kind.SERIES && episode > 1) null
            else {
                val d = api.playback(t)
                // Sin plan (o sin sesión): muro de suscripción en lugar de "sin video".
                if (d.block != null) {
                    msg = if (d.block == pro.verpelis.core.data.StreamResolution.Block.PLAN) "Necesitas una suscripción activa para ver este título" else "Inicia sesión para continuar"
                    nav.navigate(if (d.block == pro.verpelis.core.data.StreamResolution.Block.PLAN) "plans" else "profile"); return@launch
                }
                d.url?.let { PlaybackRequest(it, if (t.kind == Kind.SERIES) "${t.name} - Ep. $episode" else t.name, t.id, t.subtitles) }
            }
            if (req == null && kind == "anime") {
                // Episodios que solo existen como reproductor embebido: por ahora solo se ven en la web.
                val embed = runCatching { api.animeEmbedUrl(t.id, episode) }.getOrNull()
                if (embed != null) { msg = "Por ahora, el episodio $episode solo se puede ver en verpelis.pro"; return@launch }
            }
            if (req == null) msg = if (isSeries) "El episodio $episode aún no está disponible" else "Este título no tiene video disponible todavía"
            else PlaybackIntent.start(ctx, PlayerActivity::class.java, req)
        }
        LazyColumn(Modifier.fillMaxSize()) {
            item {
                Box(Modifier.fillMaxWidth().height(320.dp)) {
                    AsyncImage(t.backdrop, t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Noir.Ink.copy(alpha = 0.6f), Color.Transparent, Noir.Ink))))
                    TopBar(nav, back = true)
                    if (t.isRecent()) Box(Modifier.align(Alignment.BottomStart).padding(16.dp)) { Badge("Estreno", gold = true) }
                }
            }
            item {
                Column(Modifier.padding(horizontal = 16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Badge("HD"); if (t.subtitles.isNotEmpty()) Badge("Subtítulos"); if (t.classification.isNotBlank()) Badge(t.classification, danger = true)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(t.name, style = NoirTitle)
                    Text(t.meta(), style = NoirBody)
                    Spacer(Modifier.height(16.dp))
                    GoldButton(if (kind != "anime" && t.comingSoon) "Próximamente" else if (isSeries) "Reproducir episodio $episode" else "Reproducir", { play() }, Modifier.fillMaxWidth(), icon = Icons.Filled.PlayArrow)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (kind != "anime") GhostButton(if (fav) "En mi lista" else "Mi lista", {
                            scope.launch { runCatching { api.setFavorite(t.id, !fav); fav = !fav } }
                        }, Modifier.weight(1f), icon = if (fav) Icons.Filled.Check else Icons.Filled.Add)
                        GhostButton("Compartir", {
                            ctx.startActivity(android.content.Intent.createChooser(android.content.Intent(android.content.Intent.ACTION_SEND).setType("text/plain")
                                .putExtra(android.content.Intent.EXTRA_TEXT, "${t.name} en PELIS: ${api.base}/movies/${t.id}"), "Compartir"))
                        }, Modifier.weight(1f))
                    }
                    msg?.let { Text(it, color = Color(0xFFE08A95), fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
                    if (isSeries) {
                        Spacer(Modifier.height(18.dp))
                        EpisodePicker(seasons = 1, season = season, episodes = episodes.coerceAtLeast(1), selected = episode,
                            onSeason = { season = it; episode = 1 }, onEpisode = { episode = it },
                            available = { e -> kind == "anime" || (e == 1 && !t.comingSoon) })
                    }
                    Spacer(Modifier.height(18.dp))
                    Column(Modifier.fillMaxWidth().background(Noir.Surface, RoundedCornerShape(8.dp)).border(1.dp, Noir.Line, RoundedCornerShape(8.dp)).padding(16.dp)) {
                        Text("Sinopsis oficial", style = NoirSection.copy(color = Noir.Gold, fontSize = 17.sp))
                        Spacer(Modifier.height(8.dp))
                        Text(pro.verpelis.core.data.SynopsisText.clean(t.synopsis).ifBlank { "Sin sinopsis por ahora." }, color = Noir.Text, fontSize = 14.sp, lineHeight = 21.sp)
                    }
                    if (t.actors.isNotBlank()) {
                        Spacer(Modifier.height(18.dp))
                        Text("Reparto principal", style = NoirSection)
                        Spacer(Modifier.height(8.dp))
                        t.actors.split(",").map { it.trim() }.filter { it.isNotBlank() }.take(6).chunked(2).forEach { pair ->
                            Row(Modifier.padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                pair.forEach { a ->
                                    Row(Modifier.weight(1f).background(Noir.Surface, RoundedCornerShape(6.dp)).padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Box(Modifier.size(30.dp).background(Noir.Raised, RoundedCornerShape(15.dp)).border(1.dp, Noir.Gold.copy(alpha = 0.5f), RoundedCornerShape(15.dp)), Alignment.Center) {
                                            Text(a.split(" ").mapNotNull { it.firstOrNull()?.uppercase() }.take(2).joinToString(""), color = Noir.Gold, fontSize = 11.sp)
                                        }
                                        Spacer(Modifier.width(8.dp))
                                        Text(a, color = Noir.Text, fontSize = 12.sp, maxLines = 1)
                                    }
                                }
                                if (pair.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
            if (more.isNotEmpty()) item { TitleRow("Más como esto", more) { nav.open(it) } }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
fun ChannelsScreen(api: PelisApi) {
    val ctx = LocalContext.current
    var cat by remember { mutableStateOf<String?>(null) }
    val cats = rememberLoad(Unit) { api.channelCategories() }
    val pageState = remember(cat) { mutableIntStateOf(0) }
    val pageIndex = pageState.intValue
    val limit = pro.verpelis.core.data.PAGE_SIZE
    val data = rememberLoad(cat, pageIndex) { api.channelsPage(pageIndex * limit, limit, cat) }
    val names = (cats as? pro.verpelis.core.ui.Load.Ok)?.value.orEmpty()
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Text("TV en vivo", style = NoirTitle, modifier = Modifier.padding(16.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { Chip("Todos", cat == null) { cat = null } }
            items(names) { c -> Chip(c, cat == c) { cat = c } }
        }
        Box(Modifier.weight(1f)) {
            LoadBox(data) { page ->
                if (page.items.isEmpty()) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) { Text("No hay canales", style = NoirBody) }
                    return@LoadBox
                }
                LazyVerticalGrid(
                    GridCells.Adaptive(160.dp),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    gridItems(page.items, key = { it.id }) { ch ->
                        ChannelCard(ch, {
                            PlaybackIntent.start(ctx, PlayerActivity::class.java, PlaybackRequest(api.channelStreamUrl(ch.id), ch.name, live = true))
                        }, Modifier)
                    }
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        PageControls(
                            page.pageNumber,
                            page.pageCount,
                            page.total,
                            onPrev = { pageState.intValue = pageIndex - 1 },
                            onNext = { pageState.intValue = pageIndex + 1 },
                            one = "canal",
                            many = "canales",
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SimpleListScreen(title: String, empty: String, api: PelisApi, nav: NavHostController, load: suspend (Int, Int) -> pro.verpelis.core.data.Page<Title>) {
    Column(Modifier.fillMaxSize()) {
        TopBar(nav, back = true)
        Text(title, style = NoirTitle, modifier = Modifier.padding(horizontal = 16.dp))
        PagedGrid(title, empty, { t -> nav.open(t) }) { o, l -> load(o, l) }
    }
}

@Composable
fun ProfileScreen(api: PelisApi, nav: NavHostController, onLogout: () -> Unit) {
    val scope = rememberCoroutineScope()
    val me = rememberLoad(Unit) { api.me() }
    Column(Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
        Wordmark()
        Spacer(Modifier.height(20.dp))
        LoadBox(me) { m ->
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(60.dp).background(Noir.Raised, RoundedCornerShape(30.dp)).border(2.dp, Noir.Gold, RoundedCornerShape(30.dp)), Alignment.Center) {
                        Text((m?.name ?: "?").split(" ").mapNotNull { it.firstOrNull()?.uppercase() }.take(2).joinToString(""), color = Noir.Gold, fontSize = 20.sp, fontFamily = Noir.Display)
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(m?.name ?: "", style = NoirSection)
                        Text(m?.email ?: "", style = NoirBody)
                    }
                }
                Spacer(Modifier.height(16.dp))
                Row(Modifier.fillMaxWidth().background(Noir.Surface, RoundedCornerShape(8.dp)).border(1.dp, if (m?.planName != null) Noir.Gold else Noir.Line, RoundedCornerShape(8.dp)).padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Membresía", style = NoirLabel)
                        Text(if (m?.planName != null) "Suscripción activa" else "Sin suscripción activa", color = Noir.Gold, fontSize = 15.sp)
                    }
                    Text("Planes  >", color = Noir.Gold, fontSize = 13.sp, modifier = Modifier.clickable { nav.navigate("plans") })
                }
                Spacer(Modifier.height(12.dp))
                listOf("Mi lista" to "list", "Historial" to "history", "Planes y pagos" to "plans").forEach { (l, r) ->
                    Row(Modifier.fillMaxWidth().clickable { nav.navigate(r) }.padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(l, color = Noir.Text, fontSize = 15.sp); Spacer(Modifier.weight(1f)); Text(">", color = Noir.Muted)
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Noir.Line))
                }
                Spacer(Modifier.height(24.dp))
                GhostButton("Cerrar sesión", { scope.launch { api.signOut(); onLogout() } }, Modifier.fillMaxWidth(), color = Color(0xFFE08A95))
            }
        }
    }
}

@Composable
fun PlansScreen(api: PelisApi) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val data = rememberLoad(Unit) { api.plans() }
    // Plan activo del usuario (users.me devuelve planId); sin sesión queda null.
    var current by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) { current = runCatching { api.me()?.planName }.getOrNull() }
    LoadBox(data) { plans ->
        LazyColumn(Modifier.fillMaxSize().statusBarsPadding(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Text("Membresía", style = NoirLabel.copy(color = Noir.Gold))
                Text("Elige tu plan", style = NoirTitle)
                Text("Cancela cuando quieras. El pago se completa de forma segura en el navegador.", style = NoirBody)
            }
            items(plans, key = { it.id }) { p ->
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(Noir.Surface)
                    .border(if (p.recommended || p.id == current) 2.dp else 1.dp, if (p.recommended || p.id == current) Noir.Gold else Noir.Line, RoundedCornerShape(10.dp)).padding(18.dp)) {
                    if (p.id == current) { Badge("Tu plan actual", gold = true); Spacer(Modifier.height(8.dp)) }
                    else if (p.recommended) { Badge("Recomendado", gold = true); Spacer(Modifier.height(8.dp)) }
                    Text(p.name, style = NoirSection.copy(fontSize = 22.sp))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text("$" + "%.2f".format(p.price), color = Noir.Gold, fontSize = 30.sp, fontFamily = Noir.Display, fontWeight = FontWeight.SemiBold)
                        Text(if (p.months == 1) " / mes" else " / ${p.months} meses", color = Noir.Muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 5.dp))
                    }
                    Text(p.description, style = NoirBody)
                    Spacer(Modifier.height(10.dp))
                    p.features.forEach { f ->
                        Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Check, null, tint = Noir.Gold, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(8.dp))
                            Text(f, color = Noir.Text, fontSize = 13.sp)
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    val action: () -> Unit = {
                        scope.launch {
                            val url = runCatching { api.checkoutUrl(p.id) }.getOrNull()
                            openCustomTab(ctx, url ?: (api.base + "/subscribe"))
                        }
                    }
                    if (p.id == current) GhostButton("Plan actual", {}, Modifier.fillMaxWidth())
                    else if (p.recommended) GoldButton("Elegir ${p.name}", action, Modifier.fillMaxWidth()) else GhostButton("Elegir ${p.name}", action, Modifier.fillMaxWidth())
                }
            }
        }
    }
}
