package pro.verpelis.tv.ui.screens

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalSessionStore
import pro.verpelis.tv.LocalUiSounds
import pro.verpelis.tv.data.api.PairingCreateResponse
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.data.qr.PairingVerifyUrl
import pro.verpelis.tv.data.qr.QrBitmap
import pro.verpelis.tv.ui.components.TvFocusButton
import pro.verpelis.tv.ui.theme.MaisonNoir

private enum class LoginMode { Qr, SignIn, SignUp, VerifyOtp }

@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    onBack: () -> Unit,
) {
    val session = LocalSessionStore.current
    val api = LocalApiClient.current
    val uiSounds = LocalUiSounds.current
    val scope = rememberCoroutineScope()

    var mode by remember { mutableStateOf(LoginMode.Qr) }
    var pairing by remember { mutableStateOf<PairingCreateResponse?>(null) }
    var qr by remember { mutableStateOf<Bitmap?>(null) }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
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
            busy = true
            error = ""
            statusText = "Generando código…"
            try {
                val created = api.createPairing(session.deviceId)
                if (created.code.isBlank() || created.error != null) {
                    error = created.error ?: created.message ?: "No se pudo crear el código"
                    pairing = null
                    qr = null
                    return@launch
                }
                session.deviceId = created.deviceId.ifBlank { session.deviceId }
                pairing = created
                qr = QrBitmap.encode(PairingVerifyUrl.resolve(created.verifyUrl, created.code, BuildConfig.API_BASE_URL))
                statusText = "Esperando confirmación en el celular…"
            } catch (ex: Exception) {
                error = ex.message ?: "Error de conexión. Reintenta."
                pairing = null
                qr = null
            } finally {
                busy = false
            }
        }
    }

    fun switchMode(next: LoginMode) {
        uiSounds.playClick()
        mode = next
        error = ""
        if (next == LoginMode.Qr && !signedIn && pairing == null) {
            requestPairing()
        }
    }

    LaunchedEffect(Unit) {
        if (!session.hasSession()) requestPairing()
    }

    LaunchedEffect(resendCooldown) {
        if (resendCooldown <= 0) return@LaunchedEffect
        delay(1_000)
        resendCooldown = (resendCooldown - 1).coerceAtLeast(0)
    }

    LaunchedEffect(pairing?.code, mode) {
        if (mode != LoginMode.Qr) return@LaunchedEffect
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
                    error = result.error ?: "No se pudo iniciar sesión"
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
                    statusText = "Revisa tu correo e ingresa el código"
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
                    statusText = "Código reenviado"
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
                Text(
                    when (mode) {
                        LoginMode.Qr -> "Vincular tele"
                        LoginMode.SignIn -> "Iniciar sesión"
                        LoginMode.SignUp -> "Registrarse"
                        LoginMode.VerifyOtp -> "Verificar email"
                    },
                    color = MaisonNoir.Chalk,
                    fontSize = 36.sp,
                )
                Text(
                    "Escanea el QR, inicia sesión o crea una cuenta. Luego confirma en verpelis.pro/link-tv si usas el código.",
                    color = MaisonNoir.Silver,
                    modifier = Modifier.padding(top = 16.dp),
                )
                Spacer(Modifier.height(28.dp))
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    TvFocusButton(
                        label = "Código QR",
                        onClick = { switchMode(LoginMode.Qr) },
                        focusedContainer = if (mode == LoginMode.Qr) MaisonNoir.Gold else MaisonNoir.Elevated,
                        focusedContent = if (mode == LoginMode.Qr) MaisonNoir.Background else MaisonNoir.Chalk,
                        container = if (mode == LoginMode.Qr) MaisonNoir.GoldSoft else MaisonNoir.Elevated,
                    )
                    TvFocusButton(
                        label = "Iniciar sesión",
                        onClick = { switchMode(LoginMode.SignIn) },
                        focusedContainer = if (mode == LoginMode.SignIn) MaisonNoir.Gold else MaisonNoir.Elevated,
                        focusedContent = if (mode == LoginMode.SignIn) MaisonNoir.Background else MaisonNoir.Chalk,
                        container = if (mode == LoginMode.SignIn) MaisonNoir.GoldSoft else MaisonNoir.Elevated,
                    )
                    TvFocusButton(
                        label = "Registrarse",
                        onClick = { switchMode(LoginMode.SignUp) },
                        focusedContainer = if (mode == LoginMode.SignUp) MaisonNoir.Gold else MaisonNoir.Elevated,
                        focusedContent = if (mode == LoginMode.SignUp) MaisonNoir.Background else MaisonNoir.Chalk,
                        container = if (mode == LoginMode.SignUp) MaisonNoir.GoldSoft else MaisonNoir.Elevated,
                    )
                }
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
            when {
                signedIn -> SignedInPanel(
                    onGoLive = {
                        uiSounds.playClick()
                        onSignedIn()
                    },
                    onSignOut = {
                        uiSounds.playClick()
                        session.clear()
                        signedIn = false
                        mode = LoginMode.Qr
                        requestPairing()
                    },
                )
                mode == LoginMode.Qr -> QrPanel(
                    qr = qr,
                    pairing = pairing,
                    busy = busy,
                    error = error,
                    statusText = statusText,
                    onRetry = {
                        uiSounds.playClick()
                        requestPairing()
                    },
                )
                mode == LoginMode.SignIn -> AuthFormPanel(
                    title = "Tu cuenta Pelis",
                    subtitle = "Correo y contraseña",
                    showName = false,
                    name = name,
                    onName = { name = it },
                    email = email,
                    onEmail = { email = it },
                    password = password,
                    onPassword = { password = it },
                    busy = busy,
                    error = error,
                    primaryLabel = if (busy) "Entrando…" else "Entrar",
                    onSubmit = {
                        uiSounds.playClick()
                        submitSignIn()
                    },
                )
                mode == LoginMode.SignUp -> AuthFormPanel(
                    title = "Crear cuenta",
                    subtitle = "Mínimo 8 caracteres en la contraseña",
                    showName = true,
                    name = name,
                    onName = { name = it },
                    email = email,
                    onEmail = { email = it },
                    password = password,
                    onPassword = { password = it },
                    busy = busy,
                    error = error,
                    primaryLabel = if (busy) "Creando…" else "Registrarse",
                    onSubmit = {
                        uiSounds.playClick()
                        submitSignUp()
                    },
                )
                mode == LoginMode.VerifyOtp -> OtpPanel(
                    email = email,
                    otp = otp,
                    onOtp = { otp = it.filter { ch -> ch.isDigit() }.take(6) },
                    busy = busy,
                    error = error,
                    statusText = statusText,
                    resendCooldown = resendCooldown,
                    onSubmit = {
                        uiSounds.playClick()
                        submitOtp()
                    },
                    onResend = {
                        uiSounds.playClick()
                        resendOtp()
                    },
                    onBackToSignIn = { switchMode(LoginMode.SignIn) },
                )
            }
        }
    }
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
        Text("Activa en este televisor", color = MaisonNoir.Gold, fontSize = 28.sp)
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

@Composable
private fun QrPanel(
    qr: Bitmap?,
    pairing: PairingCreateResponse?,
    busy: Boolean,
    error: String,
    statusText: String,
    onRetry: () -> Unit,
) {
    Row(
        modifier = Modifier
            .widthIn(max = 820.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaisonNoir.Elevated)
            .padding(28.dp),
        horizontalArrangement = Arrangement.spacedBy(32.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(280.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(MaisonNoir.Chalk),
            contentAlignment = Alignment.Center,
        ) {
            if (qr != null) {
                Image(
                    bitmap = qr.asImageBitmap(),
                    contentDescription = "Código QR para vincular la tele",
                    modifier = Modifier.size(260.dp),
                )
            } else {
                Text(if (busy) "…" else "QR", color = MaisonNoir.Ash, fontSize = 28.sp)
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("TU CÓDIGO", color = MaisonNoir.Ash, fontSize = 14.sp)
            Text(
                text = pairing?.displayCode ?: pairing?.code ?: "······",
                color = MaisonNoir.Chalk,
                fontSize = 56.sp,
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
            TvFocusButton(
                label = if (busy) "Generando…" else "Reintentar",
                onClick = onRetry,
            )
        }
    }
}

@Composable
private fun AuthFormPanel(
    title: String,
    subtitle: String,
    showName: Boolean,
    name: String,
    onName: (String) -> Unit,
    email: String,
    onEmail: (String) -> Unit,
    password: String,
    onPassword: (String) -> Unit,
    busy: Boolean,
    error: String,
    primaryLabel: String,
    onSubmit: () -> Unit,
) {
    Column(
        modifier = Modifier
            .widthIn(max = 560.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaisonNoir.Elevated)
            .padding(28.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(title, color = MaisonNoir.Chalk, fontSize = 28.sp)
        Text(subtitle, color = MaisonNoir.Silver)
        if (showName) {
            TvTextField(label = "Nombre", value = name, onValueChange = onName)
        }
        TvTextField(
            label = "Correo",
            value = email,
            onValueChange = onEmail,
            keyboardType = KeyboardType.Email,
        )
        TvTextField(
            label = "Contraseña",
            value = password,
            onValueChange = onPassword,
            keyboardType = KeyboardType.Password,
            isPassword = true,
        )
        if (error.isNotBlank()) {
            Text(error, color = MaisonNoir.Danger)
        }
        TvFocusButton(label = primaryLabel, onClick = onSubmit)
    }
}

@Composable
private fun OtpPanel(
    email: String,
    otp: String,
    onOtp: (String) -> Unit,
    busy: Boolean,
    error: String,
    statusText: String,
    resendCooldown: Int,
    onSubmit: () -> Unit,
    onResend: () -> Unit,
    onBackToSignIn: () -> Unit,
) {
    Column(
        modifier = Modifier
            .widthIn(max = 560.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaisonNoir.Elevated)
            .padding(28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("Verifica tu email", color = MaisonNoir.Chalk, fontSize = 28.sp)
        Text(
            "Enviamos un código de 6 dígitos a $email. Tras verificar, iniciamos sesión automáticamente.",
            color = MaisonNoir.Silver,
        )
        TvTextField(
            label = "Código OTP",
            value = otp,
            onValueChange = onOtp,
            keyboardType = KeyboardType.Number,
        )
        if (error.isNotBlank()) {
            Text(error, color = MaisonNoir.Danger)
        } else if (statusText.isNotBlank()) {
            Text(statusText, color = MaisonNoir.Silver)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            TvFocusButton(
                label = if (busy) "Verificando…" else "Verificar",
                onClick = onSubmit,
            )
            TvFocusButton(
                label = if (resendCooldown > 0) "Reenviar (${resendCooldown}s)" else "Reenviar código",
                onClick = onResend,
            )
        }
        TvFocusButton(label = "Volver a iniciar sesión", onClick = onBackToSignIn)
    }
}

@Composable
private fun TvTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    isPassword: Boolean = false,
) {
    val uiSounds = LocalUiSounds.current
    var focused by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, color = MaisonNoir.Ash, fontSize = 12.sp)
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = TextStyle(color = MaisonNoir.Chalk, fontSize = 18.sp),
            cursorBrush = SolidColor(MaisonNoir.Gold),
            visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { state ->
                    val next = state.isFocused
                    if (next && !focused) uiSounds.playFocus()
                    focused = next
                }
                .clip(RoundedCornerShape(10.dp))
                .background(MaisonNoir.Surface)
                .border(
                    width = if (focused) 2.dp else 1.dp,
                    color = if (focused) MaisonNoir.Gold else MaisonNoir.Border,
                    shape = RoundedCornerShape(10.dp),
                )
                .padding(horizontal = 16.dp, vertical = 14.dp),
            decorationBox = { inner ->
                if (value.isEmpty()) {
                    Text(label, color = MaisonNoir.Ash, fontSize = 18.sp)
                }
                inner()
            },
        )
    }
}
