package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import kotlinx.coroutines.delay
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalUiSounds
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import pro.verpelis.tv.data.api.CatalogItem
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.data.playback.TitleKind
import pro.verpelis.tv.ui.components.CatalogRow
import pro.verpelis.tv.data.api.TvListArgs
import pro.verpelis.tv.ui.components.ChannelCard
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir
import pro.verpelis.tv.ui.theme.MaisonType

@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onPlayChannel: (String, String) -> Unit,
    onOpenTitle: (TitleKind, String) -> Unit,
) {
    val api = LocalApiClient.current.api
    val uiSounds = LocalUiSounds.current
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<TvChannel>>(emptyList()) }
    var titles by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    var anime by remember { mutableStateOf<List<CatalogItem>>(emptyList()) }
    val focus = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current

    LaunchedEffect(Unit) { focus.requestFocus() }

    LaunchedEffect(query) {
        val q = query.trim()
        if (q.length < 2) {
            results = emptyList()
            titles = emptyList()
            anime = emptyList()
            return@LaunchedEffect
        }
        delay(280)
        coroutineScope {
            val m = async { runCatching { api.invokeCatalogSearch("movies.search", mapOf("q" to q, "limit" to 18)) }.getOrDefault(emptyList()) }
            val a = async { runCatching { api.invokeCatalogSearch("anime.search", mapOf("query" to q, "limit" to 18)) }.getOrDefault(emptyList()) }
            val c = async { runCatching { api.invokeTvList(args = TvListArgs(search = q, limit = 36)).items }.getOrDefault(emptyList()) }
            titles = m.await()
            anime = a.await()
            results = c.await()
        }
    }

    Column(Modifier.fillMaxSize().background(MaisonNoir.Background).padding(horizontal = 56.dp, vertical = 28.dp)) {
        TvFocusButton("Volver", {
            uiSounds.playClick()
            onBack()
        })
        Text("BÚSQUEDA", style = MaisonType.Eyebrow, modifier = Modifier.padding(top = 16.dp))
        Text("Buscar películas, series, anime y canales", style = MaisonType.Display.copy(fontSize = 30.sp), modifier = Modifier.padding(bottom = 12.dp))
        BasicTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier
                .focusRequester(focus)
                // Con el D-pad, abajo/arriba salen del campo hacia los resultados / Volver.
                .onPreviewKeyEvent { ev ->
                    if (ev.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                    when (ev.key) {
                        Key.DirectionDown -> { focusManager.moveFocus(FocusDirection.Down); true }
                        Key.DirectionUp -> { focusManager.moveFocus(FocusDirection.Up); true }
                        else -> false
                    }
                }
                .fillMaxWidth()
                .border(1.dp, MaisonNoir.Gold)
                .background(MaisonNoir.Surface)
                .padding(horizontal = 20.dp, vertical = 8.dp),
            textStyle = MaisonType.Title,
            cursorBrush = SolidColor(MaisonNoir.Gold),
            decorationBox = { inner ->
                androidx.compose.foundation.layout.Box(
                    Modifier.padding(vertical = 8.dp),
                ) {
                    if (query.isEmpty()) Text("Escribe un título o canal", style = MaisonType.Title.copy(color = MaisonNoir.Ash))
                    inner()
                }
            },
        )
        LazyColumn(
            contentPadding = PaddingValues(top = 16.dp),
            modifier = Modifier.fillMaxWidth().weight(1f),
        ) {
            if (titles.isNotEmpty()) {
                item(key = "titles") {
                    CatalogRow(
                        title = "Películas y series",
                        items = titles,
                        onOpen = { onOpenTitle(if (it.mediaType == "series") TitleKind.SERIES else TitleKind.MOVIE, it.id) },
                    )
                }
            }
            if (anime.isNotEmpty()) {
                item(key = "anime") {
                    CatalogRow(title = "Anime", items = anime, onOpen = { onOpenTitle(TitleKind.ANIME, it.id) })
                }
            }
            if (results.isNotEmpty()) {
                item(key = "channels") {
                    Column(Modifier.padding(vertical = 12.dp)) {
                        Text("Canales", color = MaisonNoir.Gold, modifier = Modifier.padding(vertical = 8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            items(results, key = { it.id }) { channel ->
                                ChannelCard(channel = channel, onClick = { onPlayChannel(channel.id, channel.name) })
                            }
                        }
                    }
                }
            }
        }
        pro.verpelis.tv.ui.components.TvHintBar(
            listOf(
                pro.verpelis.tv.ui.components.TvHints.Select,
                pro.verpelis.tv.ui.components.TvHints.Move,
                pro.verpelis.tv.ui.components.TvHints.Back,
            ),
            Modifier.padding(top = 8.dp),
        )
    }
}
