package pro.verpelis.tv.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun TvFocusButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    focusedContainer: Color = MaisonNoir.Gold,
    focusedContent: Color = MaisonNoir.Background,
    container: Color = MaisonNoir.Elevated,
    content: Color = MaisonNoir.Chalk,
) {
    val uiSounds = LocalUiSounds.current
    var focused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = modifier.onFocusChanged { state ->
            val next = state.isFocused
            if (next && !focused) uiSounds.playFocus()
            focused = next
        },
        colors = ClickableSurfaceDefaults.colors(
            containerColor = container,
            contentColor = content,
            focusedContainerColor = focusedContainer,
            focusedContentColor = focusedContent,
        ),
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(PaddingValues(horizontal = 20.dp, vertical = 12.dp)),
        )
    }
}
