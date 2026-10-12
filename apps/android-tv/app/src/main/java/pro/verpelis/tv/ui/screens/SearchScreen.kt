package pro.verpelis.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.unit.dp
import androidx.tv.material3.Text
import kotlinx.coroutines.delay
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.TvChannel
import pro.verpelis.tv.data.api.TvListArgs
import pro.verpelis.tv.ui.components.ChannelCard
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir
import pro.verpelis.tv.ui.theme.MaisonType

@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onPlayChannel: (String, String) -> Unit,
) {
    val api = LocalApiClient.current.api
    val uiSounds = LocalUiSounds.current
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<TvChannel>>(emptyList()) }
    val focus = remember { FocusRequester() }

    LaunchedEffect(Unit) { focus.requestFocus() }

    LaunchedEffect(query) {
        val q = query.trim()
        if (q.length < 2) {
            results = emptyList()
            return@LaunchedEffect
        }
        delay(280)
        results = runCatching {
            api.invokeTvList(args = TvListArgs(search = q, limit = 36)).items
        }.getOrDefault(emptyList())
    }

    Column(Modifier.fillMaxSize().background(MaisonNoir.Background).padding(56.dp)) {
        TvFocusButton("Volver", {
            uiSounds.playClick()
            onBack()
        })
        Text("BÚSQUEDA", style = MaisonType.Eyebrow, modifier = Modifier.padding(top = 24.dp))
        Text("Buscar canales", style = MaisonType.Display, modifier = Modifier.padding(bottom = 16.dp))
        BasicTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier
                .focusRequester(focus)
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
                    if (query.isEmpty()) Text("Escribe el nombre del canal", style = MaisonType.Title.copy(color = MaisonNoir.Ash))
                    inner()
                }
            },
        )
        LazyVerticalGrid(
            columns = GridCells.Adaptive(200.dp),
            contentPadding = PaddingValues(top = 32.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(results, key = { it.id }) { channel ->
                ChannelCard(channel = channel, onClick = { onPlayChannel(channel.id, channel.name) })
            }
        }
    }
}
