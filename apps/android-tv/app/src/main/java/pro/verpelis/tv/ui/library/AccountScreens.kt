package pro.verpelis.tv.ui.library

import pro.verpelis.tv.data.tv.historyPage
import pro.verpelis.tv.data.tv.favoritesPage
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import kotlinx.coroutines.launch
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.TvImages
import pro.verpelis.tv.data.api.PelisApiClient
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.data.qr.QrBitmap
import pro.verpelis.tv.data.tv.HistoryRowDto
import pro.verpelis.tv.data.tv.LocalTvRepository
import pro.verpelis.tv.data.tv.MeCache
import pro.verpelis.tv.data.tv.MeDto
import pro.verpelis.tv.data.tv.PlanDto
import pro.verpelis.tv.data.tv.TitleDto
import pro.verpelis.tv.data.tv.clearHistory
import pro.verpelis.tv.data.tv.favorites
import pro.verpelis.tv.data.tv.history
import pro.verpelis.tv.data.tv.plans
import pro.verpelis.tv.data.tv.removeHistory
import pro.verpelis.tv.data.tv.toCatalogItem
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHintBar
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.components.TvLoadError
import pro.verpelis.tv.ui.components.TvPivotScroll
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.playback.NoirButton
import pro.verpelis.tv.ui.playback.NoirIcon
import pro.verpelis.tv.ui.playback.noirFocus
import pro.verpelis.tv.ui.shell.TvHeader
import pro.verpelis.tv.ui.shell.TvHeaderChip
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val MenuHints = listOf(TvHints.Select, TvHints.Move, TvHint("◀", "Menú"), TvHints.Back)

@Composable
private fun ScreenFrame(title: String, eyebrow: String, chip: String? = null, actions: (@Composable androidx.compose.foundation.layout.RowScope.() -> Unit)? = null, body: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().padding(start = 32.dp, end = 32.dp, top = 18.dp, bottom = 14.dp)) {
        TvHeader(title = title, eyebrow = eyebrow, trailing = { if (chip != null) TvHeaderChip(chip) })
        if (actions != null) {
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(start = 6.dp), content = actions)
        }
        Spacer(Modifier.height(6.dp))
        Box(Modifier.weight(1f)) { body() }
        Spacer(Modifier.height(8.dp))
        TvHintBar(MenuHints)
    }
}

@Composable
private fun NeedSession(title: String, eyebrow: String, message: String, onNeedLogin: () -> Unit) {
    ScreenFrame(title, eyebrow) {
        LibraryMessage("Inicia sesión", message, action = "Iniciar sesión", actionFocus = remember { FocusRequester() }, onAction = onNeedLogin)
    }
}

private fun TitleDto.titleKind(): TitleKind = kind

// ---------------------------------------------------------------- Mi lista
@Composable
fun MyListScreen(onOpenTitle: (TitleKind, String) -> Unit, onOpenHistory: () -> Unit, onNeedLogin: () -> Unit) {
    val session = LocalSessionStore.current
    if (!session.hasSession()) {
        NeedSession("Mi lista", "Tu cuenta", "Guarda películas y series en Mi lista desde su ficha y encuéntralas aquí.", onNeedLogin)
        return
    }
    val repo = LocalTvRepository.current
    var items by remember { mutableStateOf<List<TitleDto>?>(null) }
    var total by remember { mutableStateOf(0) }
    var hasMore by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var focusedIndex by remember { mutableStateOf(0) }
    var error by remember { mutableStateOf<Throwable?>(null) }
    var attempt by remember { mutableStateOf(0) }
    val first = remember { FocusRequester() }
    val historyFocus = remember { FocusRequester() }
    val scope = rememberCoroutineScope()
    LaunchedEffect(attempt) {
        error = null
        runCatching { repo.favoritesPage(0) }
            .onSuccess { items = it.items; total = it.total; hasMore = it.hasMore }
            .onFailure { error = it }
    }
    val loadMore: () -> Unit = {
        val current = items
        if (current != null && hasMore && !loadingMore) {
            loadingMore = true
            scope.launch {
                runCatching { repo.favoritesPage(current.size) }.onSuccess { p ->
                    val seen = current.mapTo(HashSet()) { it.id }
                    items = current + p.items.filter { seen.add(it.id) }
                    total = p.total
                    hasMore = p.hasMore && p.items.isNotEmpty()
                }
                loadingMore = false
            }
        }
    }
    if (items == null && error != null) {
        TvLoadError(onRetry = { attempt++ }, title = "No pudimos cargar Mi lista", detail = PelisApiClient.friendlyNetworkError(error!!), hints = MenuHints)
        return
    }
    val list = items
    LaunchedEffect(list) {
        if (list != null) runCatching { if (list.isEmpty()) historyFocus.requestFocus() else first.requestFocus() }
    }
    ScreenFrame("Mi lista", "Tu cuenta", chip = list?.let { if (total > 0) pageIndicator(focusedIndex, total).replace("títulos", "guardados").replace("título", "guardado") else "0 guardados" }) {
        val historyButton: @Composable () -> Unit = {
            Row(Modifier.padding(vertical = 4.dp)) { NoirButton("Historial", onOpenHistory, focusRequester = historyFocus) }
        }
        when {
            list == null -> LibraryLoading()
            else -> TitleGrid(
                list.map { it.toCatalogItem() },
                onOpen = { item ->
                    val dto = list.first { it.id == item.id }
                    onOpenTitle(dto.titleKind(), dto.id)
                },
                firstFocus = first,
                header = historyButton,
                onNearEnd = loadMore,
                footer = loadingMore,
                onFocusIndex = { focusedIndex = it },
                empty = {
                    LibraryMessage(
                        "Tu lista está vacía",
                        "En la ficha de una película o serie elige “Mi lista” para guardarla aquí.",
                        Modifier.height(300.dp),
                    )
                },
            )
        }
    }
}

// ---------------------------------------------------------------- Historial
@Composable
fun HistoryScreen(onOpenTitle: (TitleKind, String) -> Unit, onNeedLogin: () -> Unit) {
    val session = LocalSessionStore.current
    if (!session.hasSession()) {
        NeedSession("Historial", "Tu cuenta", "Inicia sesión para ver lo que viste en todos tus dispositivos.", onNeedLogin)
        return
    }
    val repo = LocalTvRepository.current
    val sounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()
    var rows by remember { mutableStateOf<List<HistoryRowDto>?>(null) }
    var error by remember { mutableStateOf<Throwable?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableStateOf(0) }
    var confirmClear by remember { mutableStateOf(false) }
    val first = remember { FocusRequester() }
    val clearFocus = remember { FocusRequester() }
    var total by remember { mutableStateOf(0) }
    var hasMore by remember { mutableStateOf(false) }
    var loadingMore by remember { mutableStateOf(false) }
    var focusedIndex by remember { mutableStateOf(0) }
    LaunchedEffect(attempt) {
        error = null
        runCatching { repo.historyPage(0) }
            .onSuccess { rows = it.items; total = it.total; hasMore = it.hasMore }
            .onFailure { error = it }
    }
    fun loadMore() {
        val current = rows ?: return
        if (!hasMore || loadingMore) return
        loadingMore = true
        scope.launch {
            runCatching { repo.historyPage(current.size) }.onSuccess { p ->
                val seen = current.mapTo(HashSet()) { it.movieId }
                rows = current + p.items.filter { seen.add(it.movieId) }
                total = p.total
                hasMore = p.hasMore && p.items.isNotEmpty()
            }
            loadingMore = false
        }
    }
    if (rows == null && error != null) {
        TvLoadError(onRetry = { attempt++ }, title = "No pudimos cargar tu historial", detail = PelisApiClient.friendlyNetworkError(error!!), hints = MenuHints)
        return
    }
    val list = rows
    var focusedOnce by remember { mutableStateOf(false) }
    LaunchedEffect(list) {
        if (list != null && !focusedOnce) {
            focusedOnce = true
            runCatching { if (list.isEmpty()) Unit else first.requestFocus() }
        }
    }
    ScreenFrame("Historial", "Tu cuenta", chip = list?.let { if (total > 0) pageIndicator(focusedIndex, total) else "0 títulos" }, actions = if (list.isNullOrEmpty()) null else ({
        NoirButton(if (confirmClear) "Pulsa otra vez para borrar todo" else "Borrar historial", {
            sounds.playClick()
            if (!confirmClear) { confirmClear = true; return@NoirButton }
            confirmClear = false
            scope.launch {
                runCatching { repo.clearHistory() }
                    .onSuccess { rows = emptyList(); total = 0; hasMore = false; actionError = null }
                    .onFailure { actionError = "No se pudo borrar: " + PelisApiClient.friendlyNetworkError(it) }
            }
        }, Modifier.focusProperties { down = first }, selected = confirmClear, focusRequester = clearFocus, onFocus = { if (!it) confirmClear = false })
        actionError?.let { MnText(it, color = Mn.Error, size = 9.sp, modifier = Modifier.align(Alignment.CenterVertically)) }
    })) {
        when {
            list == null -> LibraryLoading()
            list.isEmpty() -> LibraryMessage("Sin historial", "Lo que empieces a ver aparecerá aquí.")
            else -> TvPivotScroll(0.3f) {
                LazyColumn(state = rememberLazyListState(), verticalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(6.dp)) {
                    itemsIndexed(list, key = { _, it -> it.movieId }) { index, row ->
                        val movie = row.movie!!
                        if (index >= list.size - 6) LaunchedEffect(list.size) { loadMore() }
                        HistoryRow(
                            row = row,
                            modifier = (if (index == 0) Modifier.focusRequester(first).focusProperties { up = clearFocus } else Modifier)
                                .onFocusChanged { if (it.hasFocus) focusedIndex = index },
                            onOpen = { sounds.playClick(); onOpenTitle(movie.kind, movie.id) },
                            onRemove = {
                                sounds.playClick()
                                scope.launch {
                                    runCatching { repo.removeHistory(row.movieId) }
                                        .onSuccess { rows = rows?.filterNot { it.movieId == row.movieId }; total = (total - 1).coerceAtLeast(0); actionError = null }
                                        .onFailure { actionError = "No se pudo quitar: " + PelisApiClient.friendlyNetworkError(it) }
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}

private fun formatDay(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return runCatching {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
        val d = parser.parse(iso.take(19)) ?: return ""
        SimpleDateFormat("d MMM yyyy", Locale("es")).format(d)
    }.getOrDefault("")
}

private fun minutes(sec: Double): String {
    val m = (sec / 60).toInt()
    return if (m >= 60) "${m / 60} h ${m % 60} min" else "$m min"
}

@Composable
private fun HistoryRow(row: HistoryRowDto, modifier: Modifier, onOpen: () -> Unit, onRemove: () -> Unit) {
    val movie = row.movie ?: return
    val context = LocalContext.current
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(6.dp)
    Row(verticalAlignment = Alignment.CenterVertically) {
        Row(
            modifier
                .weight(1f)
                .onFocusChanged { focused = it.isFocused }
                .noirFocus(focused, shape, scale = 1.01f)
                .clip(shape)
                .background(if (focused) Mn.High else Mn.Low)
                .border(if (focused) 2.dp else 1.dp, if (focused) Mn.Gold else Mn.OutlineVar, shape)
                .clickable(remember { MutableInteractionSource() }, null, onClick = onOpen)
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(width = 40.dp, height = 60.dp).clip(RoundedCornerShape(3.dp)).background(Mn.Container)) {
                val req = remember(movie.image) {
                    ImageRequest.Builder(context).data(TvImages.sized(BuildConfig.API_BASE_URL, movie.image, 128)).size(96, 144).build()
                }
                AsyncImage(req, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                MnText(movie.displayName, color = if (focused) Mn.Gold else Mn.Text, size = 13.sp, weight = FontWeight.SemiBold, lines = 1)
                Spacer(Modifier.height(3.dp))
                val parts = listOfNotNull(
                    if (movie.kind == TitleKind.SERIES) "Serie" else "Película",
                    movie.yearText.takeIf { it.isNotBlank() },
                    formatDay(row.lastWatched).takeIf { it.isNotBlank() }?.let { "Visto el $it" },
                )
                MnText(parts.joinToString(" · "), color = Mn.Variant, size = 9.sp, lines = 1)
                if (row.duration > 0) {
                    Spacer(Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.width(180.dp).height(3.dp).background(Mn.Highest)) {
                            Box(Modifier.fillMaxWidth(row.fraction.coerceAtLeast(0.02f)).height(3.dp).background(Mn.Gold))
                        }
                        Spacer(Modifier.width(8.dp))
                        MnText("${(row.fraction * 100).toInt()}% · ${minutes(row.progress)} de ${minutes(row.duration)}", color = Mn.Outline, size = 8.5.sp)
                    }
                }
            }
        }
        Spacer(Modifier.width(10.dp))
        NoirButton("Quitar", onRemove)
    }
}

// ---------------------------------------------------------------- Perfil
@Composable
fun ProfileScreen(onOpenMyList: () -> Unit, onOpenHistory: () -> Unit, onNeedLogin: () -> Unit, onSignedOut: () -> Unit) {
    val session = LocalSessionStore.current
    if (!session.hasSession()) {
        NeedSession("Perfil", "Tu cuenta", "Inicia sesión para ver tu cuenta y tu plan en este televisor.", onNeedLogin)
        return
    }
    val repo = LocalTvRepository.current
    val sounds = LocalUiSounds.current
    var me by remember { mutableStateOf(MeCache.me) }
    var plans by remember { mutableStateOf<List<PlanDto>?>(null) }
    var loading by remember { mutableStateOf(true) }
    var confirmOut by remember { mutableStateOf(false) }
    val listFocus = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        me = MeCache.get(repo, force = true)
        plans = runCatching { repo.plans() }.getOrNull()
        loading = false
        runCatching { listFocus.requestFocus() }
    }
    val manageUrl = BuildConfig.API_BASE_URL.trimEnd('/') + "/subscribe"
    val qr = remember(manageUrl) { QrBitmap.encode(manageUrl, 360)?.asImageBitmap() }

    ScreenFrame("Perfil", "Tu cuenta") {
        val user = me
        if (user == null && loading) { LibraryLoading(); return@ScreenFrame }
        if (user == null) {
            LibraryMessage("No pudimos cargar tu cuenta", "Revisa la conexión e inténtalo de nuevo, o vuelve a iniciar sesión.", action = "Iniciar sesión", actionFocus = remember { FocusRequester() }, onAction = onNeedLogin)
            return@ScreenFrame
        }
        Row(Modifier.fillMaxSize().padding(start = 6.dp, top = 8.dp), horizontalArrangement = Arrangement.spacedBy(28.dp)) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(64.dp).clip(CircleShape).background(Mn.Gold), contentAlignment = Alignment.Center) {
                        MnText(user.initials, color = Mn.OnGold, size = 22.sp, family = Mn.Serif, weight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.width(16.dp))
                    Column {
                        MnText(user.displayName, color = Mn.Text, size = 20.sp, family = Mn.Serif, lines = 1)
                        user.email?.let { MnText(it, color = Mn.Variant, size = 10.sp, lines = 1) }
                    }
                }
                Spacer(Modifier.height(18.dp))
                PlanCard(user, plans)
                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    NoirButton("Mi lista", onOpenMyList, primary = true, focusRequester = listFocus)
                    NoirButton("Historial", onOpenHistory)
                    NoirButton(if (confirmOut) "Pulsa otra vez para salir" else "Cerrar sesión", {
                        sounds.playClick()
                        if (!confirmOut) { confirmOut = true; return@NoirButton }
                        session.clear()
                        MeCache.clear()
                        onSignedOut()
                    }, selected = confirmOut, onFocus = { if (!it) confirmOut = false })
                }
            }
            Column(
                Modifier.width(230.dp).clip(RoundedCornerShape(8.dp)).background(Mn.Low).border(1.dp, Mn.OutlineVar, RoundedCornerShape(8.dp)).padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                SectionLabel("Plan y pagos en la web")
                Spacer(Modifier.height(10.dp))
                if (qr != null) {
                    Box(Modifier.size(150.dp).clip(RoundedCornerShape(4.dp)).background(androidx.compose.ui.graphics.Color.White).padding(8.dp)) {
                        Image(qr, contentDescription = "Código QR para gestionar tu plan", modifier = Modifier.fillMaxSize())
                    }
                }
                Spacer(Modifier.height(10.dp))
                MnText("Escanéalo con tu celular para cambiar o pagar tu plan.", color = Mn.Variant, size = 9.sp, lines = 3)
                Spacer(Modifier.height(4.dp))
                MnText(manageUrl.removePrefix("https://"), color = Mn.Gold, size = 9.sp, lines = 1)
            }
        }
    }
}

@Composable
private fun PlanCard(user: MeDto, plans: List<PlanDto>?) {
    val plan = plans?.firstOrNull { it.id == user.planId }
    val shape = RoundedCornerShape(8.dp)
    Column(Modifier.fillMaxWidth().clip(shape).background(Mn.Low).border(1.dp, if (user.planId != null) Mn.Gold.copy(alpha = 0.5f) else Mn.OutlineVar, shape).padding(16.dp)) {
        SectionLabel("Tu plan")
        Spacer(Modifier.height(6.dp))
        if (user.planId == null) {
            MnText("Sin plan activo", color = Mn.Text, size = 16.sp, family = Mn.Serif)
            Spacer(Modifier.height(4.dp))
            MnText("Puedes activar uno desde la web con el código QR.", color = Mn.Variant, size = 10.sp, lines = 2)
        } else {
            MnText(plan?.name ?: "Plan activo", color = Mn.Text, size = 16.sp, family = Mn.Serif, lines = 1)
            Spacer(Modifier.height(4.dp))
            val details = listOfNotNull(
                plan?.price?.let { p -> "$" + (if (p % 1.0 == 0.0) p.toInt().toString() else "%.2f".format(Locale.US, p)) + (plan.months?.toInt()?.let { m -> if (m == 1) " / mes" else " / $m meses" } ?: "") },
                plan?.maxDevices?.toInt()?.takeIf { it > 0 }?.let { if (it == 1) "1 pantalla" else "$it pantallas" },
                user.planExpiresAt?.let { "Activo hasta " + SimpleDateFormat("d 'de' MMMM 'de' yyyy", Locale("es")).format(Date(it.toLong())) },
            )
            MnText(details.joinToString(" · "), color = Mn.Variant, size = 10.sp, lines = 2)
        }
    }
}
