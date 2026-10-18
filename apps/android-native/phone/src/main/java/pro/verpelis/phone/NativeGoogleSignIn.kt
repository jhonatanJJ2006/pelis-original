package pro.verpelis.phone

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException

/**
 * "Continuar con Google" nativo: hoja de cuentas del sistema (Credential Manager +
 * Google Identity) dentro de la app, sin Custom Tab ni barra de direcciones.
 *
 * Pide un ID token con serverClientId = cliente OAuth WEB de verpelis.pro y el
 * nonce de un solo uso que emite el servidor. Si no hay proveedor de
 * credenciales (sin Google Play services), no hay cuentas o la consola de
 * Google no tiene el cliente Android, devuelve [Result.Fallback] y la app usa
 * el flujo web (Custom Tab) como respaldo automático.
 */
object NativeGoogleSignIn {
    private const val TAG = "PelisGoogle"

    sealed interface Result {
        data class Token(val idToken: String, val email: String?) : Result
        /** El usuario cerró la hoja: no hacer nada. */
        data object Cancelled : Result
        /** Credential Manager no puede dar el token aquí: usar el flujo web. */
        data class Fallback(val reason: String) : Result
    }

    suspend fun request(activity: Context, serverClientId: String, nonce: String): Result {
        val cm = CredentialManager.create(activity)
        // 1) Hoja inferior con las cuentas de Google del dispositivo.
        val picker = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(serverClientId)
            .setNonce(nonce)
            .setAutoSelectEnabled(false)
            .build()
        when (val r = get(cm, activity, GetCredentialRequest.Builder().addCredentialOption(picker).build())) {
            is Outcome.Ok -> return parse(r.response)
            is Outcome.Cancelled -> return Result.Cancelled
            is Outcome.NoCredentials -> Log.i(TAG, "Sin cuentas de Google en la hoja; probando Sign in with Google: ${r.message}")
            is Outcome.Failed -> return Result.Fallback(r.message)
        }
        // 2) Sin cuentas: diálogo "Acceder con Google" (permite añadir una cuenta).
        val button = GetSignInWithGoogleOption.Builder(serverClientId).setNonce(nonce).build()
        return when (val r = get(cm, activity, GetCredentialRequest.Builder().addCredentialOption(button).build())) {
            is Outcome.Ok -> parse(r.response)
            is Outcome.Cancelled -> Result.Cancelled
            is Outcome.NoCredentials -> Result.Fallback(r.message)
            is Outcome.Failed -> Result.Fallback(r.message)
        }
    }

    private sealed interface Outcome {
        data class Ok(val response: GetCredentialResponse) : Outcome
        data object Cancelled : Outcome
        data class NoCredentials(val message: String) : Outcome
        data class Failed(val message: String) : Outcome
    }

    private suspend fun get(cm: CredentialManager, activity: Context, req: GetCredentialRequest): Outcome = try {
        Outcome.Ok(cm.getCredential(activity, req))
    } catch (e: GetCredentialCancellationException) {
        Outcome.Cancelled
    } catch (e: NoCredentialException) {
        Outcome.NoCredentials("${e.type}: ${e.errorMessage}")
    } catch (e: GetCredentialInterruptedException) {
        Outcome.Failed("${e.type}: ${e.errorMessage}")
    } catch (e: GetCredentialException) {
        // Sin proveedor (GetCredentialProviderConfigurationException), no soportado,
        // o error de configuración de Google (p. ej. falta el cliente OAuth Android).
        Log.w(TAG, "Credential Manager falló (${e.javaClass.simpleName}): ${e.type} ${e.errorMessage}")
        Outcome.Failed("${e.javaClass.simpleName}: ${e.errorMessage}")
    } catch (e: Exception) {
        Log.w(TAG, "Credential Manager no disponible", e)
        Outcome.Failed(e.javaClass.simpleName)
    }

    private fun parse(response: GetCredentialResponse): Result {
        val c = response.credential
        if (c is CustomCredential && c.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            return try {
                val g = GoogleIdTokenCredential.createFrom(c.data)
                Result.Token(g.idToken, g.id)
            } catch (e: GoogleIdTokenParsingException) {
                Result.Fallback("Respuesta de Google inválida")
            }
        }
        return Result.Fallback("Credencial inesperada: ${c.type}")
    }
}
