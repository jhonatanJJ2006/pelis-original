package pro.verpelis.tv.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.PairingCreateResponse
import pro.verpelis.tv.data.qr.PairingVerifyUrl
import pro.verpelis.tv.data.qr.QrBitmap
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.components.TvHint
import pro.verpelis.tv.ui.components.TvHints
import pro.verpelis.tv.ui.login.NetflixLoginFrame
import pro.verpelis.tv.ui.login.PhoneLoginCard
import pro.verpelis.tv.ui.login.ChoiceButton
import pro.verpelis.tv.ui.login.FormPanel
import pro.verpelis.tv.ui.login.LocalMnFocusSound
import pro.verpelis.tv.ui.login.Mn
import pro.verpelis.tv.ui.login.MnIcon
import pro.verpelis.tv.ui.login.MnInputField
import pro.verpelis.tv.ui.login.MnLink
import pro.verpelis.tv.ui.login.MnOutlineButton
import pro.verpelis.tv.ui.login.MnPanelFooter
import pro.verpelis.tv.ui.login.MnPrimaryButton
import pro.verpelis.tv.ui.login.MnStatusLine
import pro.verpelis.tv.ui.login.MnText
import pro.verpelis.tv.ui.login.parseIsoMillis
import pro.verpelis.tv.ui.theme.MaisonNoir

/**
 * Inicio de sesión TV estilo Netflix — diseño Google Stitch "PELIS Rediseño"
 * (0e67b58f9e0f425fb7d8371c664dd76e): "¿Cómo quieres iniciar sesión?" con la tarjeta
 * recomendada "Usa tu celular" (QR real hacia /link-tv + código) o "Usar correo y contraseña".
 * Fondo: un único JPEG pequeño (960x540) sin animación, apto para TV con poca RAM.
 */
private enum class LoginMode { Choose, SignIn, SignUp, VerifyOtp }

@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    onBack: () -> Unit,
) {
    val session = LocalSessionStore.current
    val api = LocalApiClient.current
    val uiSounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()

    var mode by remember { mutableStateOf(LoginMode.Choose) }
    var pairing by remember { mutableStateOf<PairingCreateResponse?>(null) }
    var qr by remember { mutableStateOf<Bitmap?>(null) }
    var error by remember { mutableStateOf("") }
    var pairError by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var pairBusy by remember { mutableStateOf(false) }
    var otpStatus by remember { mutableStateOf("") }
    var statusText by remember { mutableStateOf("Generando código…") }
    var signedIn by remember { mutableStateOf(session.hasSession()) }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var pendingPassword by remember { mutableStateOf("") }
    var resendCooldown by remember { mutableIntStateOf(0) }

    fun requestPairing() {
        scope.launch {
            pairBusy = true
            pairError = ""
            statusText = "Generando código…"
            try {
                val created = api.createPairing(session.deviceId)
                if (created.code.isBlank() || created.error != null) {
                    pairError = created.error ?: created.message ?: "No se pudo crear el código"
                    pairing = null
                    qr = null
                    return@launch
                }
                session.deviceId = created.deviceId.ifBlank { session.deviceId }
                pairing = created
                val payload = PairingVerifyUrl.resolve(created.verifyUrl, created.code, BuildConfig.API_BASE_URL)
                val bitmap = QrBitmap.encode(payload) ?: decodeQrPng(api.fetchQrPng(payload))
                qr = bitmap
                if (bitmap == null) {
                    pairError = "No se pudo dibujar el código QR"
                } else {
                    statusText = "Esperando confirmación en el celular…"
                }
            } catch (ex: Exception) {
                pairError = ex.message ?: "Error de conexión. Reintenta."
                pairing = null
                qr = null
            } finally {
                pairBusy = false
            }
        }
    }

    fun switchMode(next: LoginMode) {
        uiSounds.playClick()
        mode = next
        error = ""
    }

    LaunchedEffect(Unit) {
        if (!session.hasSession()) requestPairing()
    }

    LaunchedEffect(resendCooldown) {
        if (resendCooldown <= 0) return@LaunchedEffect
        delay(1_000)
        resendCooldown = (resendCooldown - 1).coerceAtLeast(0)
    }

    // El QR está siempre visible junto al formulario: se sondea mientras haya código.
    LaunchedEffect(pairing?.code, signedIn) {
        if (signedIn) return@LaunchedEffect
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
                            pairError = claim.error ?: "No se pudo completar el acceso"
                            continue
                        }
                        session.persistClaim(claim.cookieName, claim.token, claim.cookieValue)
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

    fun submitSignIn() {
        scope.launch {
            if (email.isBlank() || password.isBlank()) {
                error = "Completa correo y contraseña"
                return@launch
            }
            busy = true
            error = ""
            try {
                val result = api.signInEmail(email.trim(), password)
                if (result.ok && !result.token.isNullOrBlank()) {
                    session.persistClaim(result.cookieName, result.token)
                    signedIn = true
                    onSignedIn()
                    return@launch
                }
                if (result.needsEmailVerification) {
                    pendingPassword = password
                    mode = LoginMode.VerifyOtp
                    api.sendVerificationOtp(email.trim())
                    resendCooldown = 30
                    error = result.error ?: "Verifica tu email con el código enviado"
                } else {
                    error = friendlyAuthError(result.error) ?: "No se pudo iniciar sesión"
                }
            } catch (ex: Exception) {
                error = ex.message ?: "Error de conexión. Reintenta."
            } finally {
                busy = false
            }
        }
    }

    fun submitSignUp() {
        scope.launch {
            if (name.isBlank() || email.isBlank() || password.isBlank()) {
                error = "Completa nombre, correo y contraseña"
                return@launch
            }
            if (password.length < 8) {
                error = "La contraseña debe tener al menos 8 caracteres"
                return@launch
            }
            busy = true
            error = ""
            try {
                val result = api.signUpEmail(email.trim(), password, name.trim())
                if (!result.ok) {
                    error = result.error ?: "No se pudo crear la cuenta"
                    return@launch
                }
                pendingPassword = password
                mode = LoginMode.VerifyOtp
                val otpSend = api.sendVerificationOtp(email.trim())
                if (!otpSend.ok) {
                    error = otpSend.error ?: "Cuenta creada; no se pudo enviar el código"
                    otpSend.cooldownSeconds?.let { resendCooldown = it }
                } else {
                    resendCooldown = 30
                    otpStatus = "Revisa tu correo e ingresa el código"
                }
            } catch (ex: Exception) {
                error = ex.message ?: "Error de conexión. Reintenta."
            } finally {
                busy = false
            }
        }
    }

    fun submitOtp() {
        scope.launch {
            if (otp.length != 6) {
                error = "El código debe tener 6 dígitos"
                return@launch
            }
            busy = true
            error = ""
            try {
                val verified = api.verifyEmailOtp(email.trim(), otp.trim())
                if (!verified.ok) {
                    error = verified.error ?: "Código inválido o expirado"
                    return@launch
                }
                // Verify does not emit token — must sign-in again.
                val pwd = pendingPassword.ifBlank { password }
                val result = api.signInEmail(email.trim(), pwd)
                if (result.ok && !result.token.isNullOrBlank()) {
                    session.persistClaim(result.cookieName, result.token)
                    signedIn = true
                    onSignedIn()
                } else {
                    error = result.error ?: "Email verificado. Inicia sesión de nuevo."
                    mode = LoginMode.SignIn
                }
            } catch (ex: Exception) {
                error = ex.message ?: "Error de conexión. Reintenta."
            } finally {
                busy = false
            }
        }
    }

    fun resendOtp() {
        if (resendCooldown > 0) return
        scope.launch {
            busy = true
            error = ""
            try {
                val sent = api.sendVerificationOtp(email.trim())
                if (sent.ok) {
                    resendCooldown = 30
                    otpStatus = "Código reenviado"
                } else {
                    error = sent.error ?: "No se pudo reenviar"
                    sent.cooldownSeconds?.let { resendCooldown = it }
                }
            } catch (ex: Exception) {
                error = ex.message ?: "Error de conexión. Reintenta."
            } finally {
                busy = false
            }
        }
    }

    val host = remember { BuildConfig.API_BASE_URL.removePrefix("https://").removePrefix("http://").trimEnd('/') }
    val qrImage = remember(qr) { qr?.asImageBitmap() }
    val firstField = remember { FocusRequester() }
    LaunchedEffect(mode, signedIn) {
        if (signedIn) return@LaunchedEffect
        delay(120)
        runCatching { firstField.requestFocus() }
    }
    BackHandler(enabled = !signedIn && mode != LoginMode.Choose) {
        switchMode(if (mode == LoginMode.VerifyOtp) LoginMode.SignIn else LoginMode.Choose)
    }

    if (signedIn) {
        Box(Modifier.fillMaxSize().background(MaisonNoir.Background), contentAlignment = Alignment.Center) {
            SignedInPanel(
                onGoLive = {
                    uiSounds.playClick()
                    onSignedIn()
                },
                onSignOut = {
                    uiSounds.playClick()
                    session.clear()
                    signedIn = false
                    mode = LoginMode.Choose
                    requestPairing()
                },
            )
        }
        return
    }

    CompositionLocalProvider(LocalMnFocusSound provides { uiSounds.playFocus() }) {
        NetflixLoginFrame(
            hints = if (mode == LoginMode.Choose) {
                listOf(TvHints.Select, TvHint("◀ ▶", "Cambiar opción"), TvHints.Exit)
            } else {
                listOf(TvHints.Select, TvHints.Move, TvHints.Back)
            },
            trailing = "$host · v${BuildConfig.VERSION_NAME}",
        ) {
            when (mode) {
                LoginMode.Choose -> {
                    MnText("¿Cómo quieres iniciar sesión?", size = 26.sp, family = Mn.Serif, color = Mn.Text, lines = 1)
                    Spacer(Modifier.height(18.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        PhoneLoginCard(
                            qr = qrImage,
                            loading = pairBusy,
                            code = pairing?.displayCode?.ifBlank { null } ?: pairing?.code,
                            host = host,
                            status = pairError.ifBlank { null },
                            expiresAtMillis = parseIsoMillis(pairing?.expiresAt),
                            focusRequester = firstField,
                            onRegenerate = {
                                uiSounds.playClick()
                                requestPairing()
                            },
                        )
                        Column(Modifier.width(56.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.width(1.dp).height(70.dp).background(Mn.Highest))
                            Spacer(Modifier.height(6.dp))
                            MnText("o", color = Mn.Outline, size = 11.sp, family = Mn.Serif)
                            Spacer(Modifier.height(6.dp))
                            Box(Modifier.width(1.dp).height(70.dp).background(Mn.Highest))
                        }
                        Column(Modifier.width(250.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            ChoiceButton(
                                label = "Usar correo y contraseña",
                                icon = MnIcon.Lock,
                                onClick = { switchMode(LoginMode.SignIn) },
                            )
                            Spacer(Modifier.height(14.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                MnText("¿No tienes cuenta?", color = Mn.Variant, size = 9.sp)
                                Spacer(Modifier.width(4.dp))
                                MnLink("Crear cuenta", onClick = { switchMode(LoginMode.SignUp) })
                            }
                            Spacer(Modifier.height(4.dp))
                            MnText("También puedes registrarte en $host", color = Mn.Outline, size = 8.sp)
                        }
                    }
                }
                LoginMode.SignIn -> FormPanel(
                    eyebrow = "CON TU CUENTA",
                    title = "Correo y contraseña",
                    subtitle = "Pulsa OK en un campo para escribir con el teclado de la TV.",
                ) {
                    MnInputField(
                        label = "Correo electrónico", icon = MnIcon.Mail, value = email, onValueChange = { email = it },
                        placeholder = "tu@correo.com", keyboardType = KeyboardType.Email, focusRequester = firstField,
                    )
                    Spacer(Modifier.height(10.dp))
                    MnInputField(
                        label = "Contraseña", icon = MnIcon.Lock, value = password, onValueChange = { password = it },
                        placeholder = "••••••••", isPassword = true, keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done, onImeAction = { submitSignIn() },
                    )
                    FormError(error)
                    Spacer(Modifier.height(14.dp))
                    MnPrimaryButton(if (busy) "ENTRANDO…" else "INICIAR SESIÓN", onClick = {
                        uiSounds.playClick()
                        submitSignIn()
                    })
                    Spacer(Modifier.height(12.dp))
                    MnPanelFooter {
                        MnLink("← Usar el celular", onClick = { switchMode(LoginMode.Choose) })
                        Spacer(Modifier.weight(1f))
                        MnLink("Crear cuenta →", onClick = { switchMode(LoginMode.SignUp) })
                    }
                }
                LoginMode.SignUp -> FormPanel(
                    eyebrow = "NUEVA CUENTA",
                    title = "Crear cuenta",
                    subtitle = "La contraseña debe tener al menos 8 caracteres.",
                ) {
                    MnInputField(
                        label = "Nombre", icon = MnIcon.Remote, value = name, onValueChange = { name = it },
                        placeholder = "Tu nombre", focusRequester = firstField,
                    )
                    Spacer(Modifier.height(6.dp))
                    MnInputField(
                        label = "Correo electrónico", icon = MnIcon.Mail, value = email, onValueChange = { email = it },
                        placeholder = "tu@correo.com", keyboardType = KeyboardType.Email,
                    )
                    Spacer(Modifier.height(6.dp))
                    MnInputField(
                        label = "Contraseña", icon = MnIcon.Lock, value = password, onValueChange = { password = it },
                        placeholder = "••••••••", isPassword = true, keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done, onImeAction = { submitSignUp() },
                    )
                    FormError(error)
                    Spacer(Modifier.height(10.dp))
                    MnPrimaryButton(if (busy) "CREANDO…" else "CREAR CUENTA", onClick = {
                        uiSounds.playClick()
                        submitSignUp()
                    })
                    Spacer(Modifier.height(10.dp))
                    MnPanelFooter {
                        MnLink("← Volver", onClick = { switchMode(LoginMode.Choose) })
                        Spacer(Modifier.weight(1f))
                        MnLink("Ya tengo cuenta →", onClick = { switchMode(LoginMode.SignIn) })
                    }
                }
                LoginMode.VerifyOtp -> FormPanel(
                    eyebrow = "VERIFICACIÓN",
                    title = "Verifica tu correo",
                    subtitle = "Enviamos un código de 6 dígitos a $email. Al verificar, entras automáticamente.",
                ) {
                    MnInputField(
                        label = "Código de 6 dígitos", icon = MnIcon.Lock, value = otp,
                        onValueChange = { otp = it.filter { ch -> ch.isDigit() }.take(6) },
                        placeholder = "000000", keyboardType = KeyboardType.Number, imeAction = ImeAction.Done,
                        onImeAction = { submitOtp() }, focusRequester = firstField,
                    )
                    if (error.isNotBlank()) FormError(error) else if (otpStatus.isNotBlank()) {
                        Spacer(Modifier.height(8.dp))
                        MnStatusLine(otpStatus, isError = false)
                    }
                    Spacer(Modifier.height(14.dp))
                    MnPrimaryButton(if (busy) "VERIFICANDO…" else "VERIFICAR", onClick = {
                        uiSounds.playClick()
                        submitOtp()
                    })
                    Spacer(Modifier.height(10.dp))
                    MnOutlineButton(
                        label = if (resendCooldown > 0) "REENVIAR (${resendCooldown}s)" else "REENVIAR CÓDIGO",
                        icon = MnIcon.Refresh,
                        onClick = {
                            uiSounds.playClick()
                            resendOtp()
                        },
                    )
                    Spacer(Modifier.height(10.dp))
                    MnPanelFooter {
                        MnLink("← Volver a iniciar sesión", onClick = { switchMode(LoginMode.SignIn) })
                    }
                }
            }
        }
    }
}

/** Mensajes de better-auth en inglés → español. */
private fun friendlyAuthError(msg: String?): String? = when {
    msg == null -> null
    msg.contains("Invalid email or password", true) -> "Correo o contraseña incorrectos"
    msg.contains("Email not verified", true) -> "Verifica tu correo antes de iniciar sesión"
    else -> msg
}

@Composable
private fun FormError(error: String) {
    if (error.isBlank()) return
    Spacer(Modifier.height(8.dp))
    MnStatusLine(error, isError = true)
}

private fun decodeQrPng(bytes: ByteArray?): Bitmap? {
    if (bytes == null || bytes.size < 32) return null
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
}

@Composable
private fun SignedInPanel(onGoLive: () -> Unit, onSignOut: () -> Unit) {
    Column(
        modifier = Modifier
            .widthIn(max = 560.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaisonNoir.Elevated)
            .padding(28.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("SESIÓN", color = MaisonNoir.Ash, fontSize = 12.sp)
        Text("Activa en este televisor", color = MaisonNoir.Gold, fontSize = 28.sp, fontFamily = FontFamily.Serif)
        Text("Puedes cerrar sesión o volver a los canales en vivo.", color = MaisonNoir.Silver)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TvFocusButton(label = "Ir a canales", onClick = onGoLive)
            TvFocusButton(
                label = "Cerrar sesión",
                onClick = onSignOut,
                focusedContainer = MaisonNoir.Danger,
                focusedContent = MaisonNoir.Chalk,
            )
        }
    }
}
