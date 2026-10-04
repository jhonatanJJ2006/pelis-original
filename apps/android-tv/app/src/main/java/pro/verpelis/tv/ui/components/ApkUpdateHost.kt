package pro.verpelis.tv.ui.components

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import pro.verpelis.tv.BuildConfig
import pro.verpelis.tv.LocalApiClient
import pro.verpelis.tv.LocalUpdateStore
import pro.verpelis.tv.data.ApkInstaller
import pro.verpelis.tv.data.ApkUpdatePolicy

/**
 * Overlay on every screen (login included) so an old install notices a newer
 * published APK before the user has to reach home.
 */
@Composable
fun ApkUpdateHost(content: @Composable () -> Unit) {
    val api = LocalApiClient.current
    val store = LocalUpdateStore.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val activity = context as? Activity
    val installer = remember(api, context) { ApkInstaller(context, api.okHttp) }

    var offer by remember { mutableStateOf(false) }
    var remoteCode by remember { mutableStateOf(0) }
    var versionName by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var downloadJob by remember { mutableStateOf<Job?>(null) }

    fun startDownload() {
        if (downloadJob?.isActive == true) return
        busy = true
        status = "Descargando actualización…"
        downloadJob = scope.launch {
            try {
                val file = installer.download(api.apkDownloadUrl())
                ensureActive()
                installer.handOffToInstaller(file)
                status = "Confirma la instalación en la pantalla del sistema. Si la cancelas, puedes reintentar."
            } catch (ex: CancellationException) {
                throw ex
            } catch (ex: Exception) {
                status = ex.message?.takeIf { it.isNotBlank() }
                    ?: "No se pudo preparar la actualización."
            } finally {
                busy = false
            }
        }
    }

    val settingsLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) {
        if (installer.canRequestInstall()) {
            startDownload()
        } else {
            busy = false
            status = "Sin permiso para instalar aplicaciones. Puedes seguir con esta versión."
        }
    }

    LaunchedEffect(Unit) {
        try {
            val availability = api.apkAvailability()
            val remote = availability.tvApkVersionCode
            versionName = availability.tvApkVersionName
            remoteCode = remote ?: 0
            offer = ApkUpdatePolicy.shouldOffer(
                installedCode = BuildConfig.VERSION_CODE,
                remoteCode = remote,
                dismissedCode = store.dismissedCode(),
                apkAvailable = availability.tvApkAvailable,
            )
        } catch (_: Exception) {
            offer = false
        }
    }

    Box(Modifier.fillMaxSize()) {
        content()
        if (offer && remoteCode > 0) {
            UpdateModal(
                versionName = versionName,
                status = status,
                busy = busy,
                onUpdate = {
                    if (busy) return@UpdateModal
                    if (!installer.canRequestInstall()) {
                        status = "Para instalar, permite que Pelis TV instale aplicaciones. Android pedirá confirmación; no se instala sola."
                        val intent = installer.unknownSourcesIntent()
                        if (activity != null) {
                            settingsLauncher.launch(intent)
                        } else {
                            status = "No se pudo pedir el permiso de instalación."
                        }
                        return@UpdateModal
                    }
                    startDownload()
                },
                onLater = {
                    downloadJob?.cancel()
                    store.dismiss(remoteCode)
                    offer = false
                },
            )
        }
    }
}
