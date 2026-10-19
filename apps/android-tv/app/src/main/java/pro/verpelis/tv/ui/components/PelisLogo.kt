package pro.verpelis.tv.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import pro.verpelis.tv.R
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnText

/** Marca P (misma losa y dorado que el favicon web, ver branding/gen-logo.py). */
@Composable
fun PelisMark(size: Dp, modifier: Modifier = Modifier) {
    Image(painterResource(R.drawable.pelis_mark), contentDescription = "Pelis", modifier = modifier.size(size))
}

/** Logo completo: marca P + "PELIS" en serif dorada. */
@Composable
fun PelisLogo(textSize: TextUnit = 16.sp, spacing: TextUnit = 3.sp, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        PelisMark((textSize.value * 1.7f).dp)
        Spacer(Modifier.width((textSize.value * 0.5f).dp))
        MnText("PELIS", color = Mn.Gold, size = textSize, family = Mn.Serif, spacing = spacing)
    }
}
