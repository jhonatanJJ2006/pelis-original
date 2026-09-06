package pro.verpelis.tv.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
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
    Surface(
        onClick = onClick,
        modifier = modifier,
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
