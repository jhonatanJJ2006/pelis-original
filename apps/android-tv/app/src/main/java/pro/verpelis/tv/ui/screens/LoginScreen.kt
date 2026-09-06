package pro.verpelis.tv.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.PairingCreateResponse
import pro.verpelis.tv.data.qr.QrBitmap
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir

@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    onBack: () -> Unit,
) {
    val session = LocalSessionStore.current
    val api = LocalApiClient.current
    val uiSounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()

    var pairing by remember { mutableStateOf<PairingCreateResponse?>(null) }
    var qr by remember { mutableStateOf<Bitmap?>(null) }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var statusText by remember { mutableStateOf("Generando código…") }
    var signedIn by remember { mutableStateOf(session.hasSession()) }

    fun requestPairing() {
        scope.launch {
            busy = true
            error = ""
            statusText = "Generando código…"
            try {
                val created = api.createPairing(session.deviceId)
                if (created.code.isBlank() || created.error != null) {
                    error = created.error ?: "No se pudo crear el código"
                    return@launch
                }
                session.deviceId = created.deviceId
                pairing = created
                qr = QrBitmap.encode(created.verifyUrl)
                statusText = "Esperando confirmación en el celular…"
            } catch (ex: Exception) {
                error = ex.message ?: "Error de conexión. Reintenta."
            } finally {
                busy = false
            }
        }
    }

    LaunchedEffect(Unit) {
        if (!session.hasSession()) requestPairing()
    }

    LaunchedEffect(pairing?.code) {
        val current = pairing ?: return@LaunchedEffect
        while (true) {
            delay(2_500)
            try {
                val poll = api.pairingStatus(current.code, current.deviceId)
                when (poll.status) {
                    "expired" -> {
                        requestPairing()
                        return@LaunchedEffect
                    }
                    "approved", "claimed" -> {
                        val claim = api.claimPairing(current.code, current.deviceId)
                        if (claim.error != null && claim.ok != true && claim.status != "claimed") {
                            error = claim.error ?: "No se pudo completar el acceso"
                            continue
                        }
                        session.persistClaim(claim.cookieName, claim.token)
                        signedIn = true
                        onSignedIn()
                        return@LaunchedEffect
                    }
                }
            } catch (_: Exception) {
                // reintento en el siguiente tick
            }
        }
    }

    Row(Modifier.fillMaxSize().background(MaisonNoir.Background)) {
        Column(
            modifier = Modifier
                .width(380.dp)
                .fillMaxHeight()
                .background(MaisonNoir.Surface)
                .padding(40.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text("Pelis", color = MaisonNoir.Chalk, fontSize = 36.sp)
                Text(
                    "TELEVISIÓN",
                    color = MaisonNoir.Gold,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 24.dp, bottom = 12.dp),
                )
                Text("Iniciar sesión", color = MaisonNoir.Chalk, fontSize = 42.sp)
                Text(
                    "Escanea el código QR con tu celular o entra a verpelis.pro/link-tv e ingresa el código.",
                    color = MaisonNoir.Silver,
                    modifier = Modifier.padding(top = 16.dp),
                )
            }
            Text("Canales en vivo al terminar.", color = MaisonNoir.Ash)
        }

        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .padding(40.dp),
            contentAlignment = Alignment.Center,
        ) {
            Row(
                modifier = Modifier
                    .widthIn(max = 720.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaisonNoir.Elevated)
                    .padding(28.dp),
                horizontalArrangement = Arrangement.spacedBy(28.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaisonNoir.Chalk),
                    contentAlignment = Alignment.Center,
                ) {
                    val bitmap = qr
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap.asImageBitmap(),
                            contentDescription = "Código QR para vincular la tele",
                            modifier = Modifier.size(200.dp),
                        )
                    } else {
                        Text("QR", color = MaisonNoir.Ash)
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (signedIn) {
                        Text("SESIÓN", color = MaisonNoir.Ash, fontSize = 12.sp)
                        Text("Activa en este televisor", color = MaisonNoir.Gold, fontSize = 28.sp)
                        Text("Puedes cerrar sesión o volver a los canales en vivo.", color = MaisonNoir.Silver)
                    } else {
                        Text("TU CÓDIGO", color = MaisonNoir.Ash, fontSize = 12.sp)
                        Text(
                            text = pairing?.displayCode ?: pairing?.code ?: "······",
                            color = MaisonNoir.Chalk,
                            fontSize = 44.sp,
                        )
                        Text(
                            "En el celular, con tu cuenta de Pelis, abre verpelis.pro/link-tv y confirma.",
                            color = MaisonNoir.Silver,
                        )
                        if (error.isNotBlank()) {
                            Text(error, color = MaisonNoir.Danger)
                        } else {
                            Text(statusText, color = MaisonNoir.Silver)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (signedIn) {
                            TvFocusButton(
                                label = "Ir a canales",
                                onClick = {
                                    uiSounds.playClick()
                                    onSignedIn()
                                },
                            )
                            TvFocusButton(
                                label = "Cerrar sesión",
                                onClick = {
                                    uiSounds.playClick()
                                    session.clear()
                                    signedIn = false
                                    requestPairing()
                                },
                                focusedContainer = MaisonNoir.Danger,
                                focusedContent = MaisonNoir.Chalk,
                            )
                        } else {
                            TvFocusButton(
                                label = if (busy) "Generando…" else "Nuevo código",
                                onClick = {
                                    uiSounds.playClick()
                                    requestPairing()
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}
