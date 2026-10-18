package pro.verpelis.tv.data

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import java.security.MessageDigest
import kotlin.coroutines.coroutineContext
import kotlin.coroutines.resume

/** Descarga verificada lista para instalar. */
class VerifiedApk(val file: File)

/** El APK es válido pero no aplica (ya actualizado, otro paquete): no reintentar. */
class UpdateRejectedException(message: String) : IOException(message)

/** Fallo que la UI debe tratar distinto: la firma no coincide (hay que desinstalar). */
class SignatureMismatchException : IOException(
    "Esta versión de Pelis TV está firmada con otra clave y Android no deja actualizarla encima.",
)

sealed interface InstallOutcome {
    /** El sistema muestra su pantalla de confirmación (o ya instaló y nos reinicia). */
    data object Handed : InstallOutcome
    data object Cancelled : InstallOutcome
    data object SignatureMismatch : InstallOutcome
    data class Failed(val message: String) : InstallOutcome
}

/**
 * Descarga el APK publicado, lo verifica y se lo pasa al instalador del sistema.
 * Nunca instala en silencio: el usuario confirma en la pantalla de Android.
 */
class ApkInstaller(
    private val context: Context,
    private val http: OkHttpClient,
) {
    private val app: Context = context.applicationContext
    private val pm: PackageManager get() = context.packageManager
    private val dir: File get() = File(context.cacheDir, "apk-update").apply { mkdirs() }

    fun canRequestInstall(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        return pm.canRequestPackageInstalls()
    }

    fun unknownSourcesIntent(): Intent =
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))

    /** Pantalla del sistema para desinstalar esta app (paso único al cambiar de firma). */
    fun uninstallIntent(): Intent =
        Intent(Intent.ACTION_DELETE, Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    fun appDetailsIntent(): Intent =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    // ---- Firmas ------------------------------------------------------------------

    @Suppress("DEPRECATION")
    private fun signersOf(info: PackageInfo?): List<String> {
        if (info == null) return emptyList()
        val certs = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signing = info.signingInfo ?: return legacySigners(info)
            if (signing.hasMultipleSigners()) signing.apkContentsSigners else signing.signingCertificateHistory
        } else {
            info.signatures
        }
        return certs.orEmpty().map { ApkCheck.sha1Fingerprint(it.toByteArray()) }.distinct()
    }

    @Suppress("DEPRECATION")
    private fun legacySigners(info: PackageInfo): List<String> =
        info.signatures.orEmpty().map { ApkCheck.sha1Fingerprint(it.toByteArray()) }

    private val signatureFlags: Int
        @Suppress("DEPRECATION")
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            PackageManager.GET_SIGNATURES
        }

    fun installedSigners(): List<String> = runCatching {
        signersOf(pm.getPackageInfo(context.packageName, signatureFlags))
    }.getOrDefault(emptyList())

    @Suppress("DEPRECATION")
    private fun installedVersionCode(): Long = runCatching {
        val info = pm.getPackageInfo(context.packageName, 0)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else info.versionCode.toLong()
    }.getOrDefault(0L)

    /** Firma instalada distinta de la de release (1.4.0 o antes, o un build debug). */
    fun installedNeedsReinstall(): Boolean = ApkCheck.installedNeedsReinstall(installedSigners())

    @Suppress("DEPRECATION")
    private fun inspect(file: File): ApkCheck.Verdict {
        val path = file.absolutePath
        val info = pm.getPackageArchiveInfo(path, signatureFlags)
            ?: pm.getPackageArchiveInfo(path, 0)
        info?.applicationInfo?.let { it.sourceDir = path; it.publicSourceDir = path }
        val code = info?.let { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) it.longVersionCode else it.versionCode.toLong() }
        return ApkCheck.verdict(
            ownPackage = context.packageName,
            installedCode = installedVersionCode(),
            installedSigners = installedSigners(),
            archivePackage = info?.packageName,
            archiveCode = code,
            archiveSigners = signersOf(info),
        )
    }

    // ---- Descarga ----------------------------------------------------------------

    private fun clearStale() {
        dir.listFiles()?.forEach { it.delete() }
    }

    /**
     * Descarga siempre desde cero (nunca reutiliza un .apk o .part de un intento
     * anterior), comprueba Content-Length, tamaño y SHA-256 publicados y que el
     * APK sea de este paquete, más nuevo y con la misma firma. Reintenta los
     * fallos de red hasta [MAX_ATTEMPTS] veces.
     */
    suspend fun downloadVerified(
        url: String,
        expectedSize: Long?,
        expectedSha256: String?,
        onProgress: (Int) -> Unit = {},
    ): VerifiedApk = withContext(Dispatchers.IO) {
        var last: IOException? = null
        for (attempt in 1..MAX_ATTEMPTS) {
            clearStale()
            try {
                val file = downloadOnce(url, expectedSize, expectedSha256, onProgress)
                when (val v = inspect(file)) {
                    ApkCheck.Verdict.Ok -> return@withContext VerifiedApk(file)
                    is ApkCheck.Verdict.SignatureMismatch -> { file.delete(); throw SignatureMismatchException() }
                    is ApkCheck.Verdict.NotNewer -> { file.delete(); throw UpdateRejectedException("Ya tienes la versión más reciente.") }
                    is ApkCheck.Verdict.WrongPackage -> { file.delete(); throw UpdateRejectedException("El archivo descargado no es Pelis TV.") }
                    ApkCheck.Verdict.Unreadable -> {
                        file.delete()
                        last = IOException("La descarga llegó dañada. Reintentando…")
                    }
                }
            } catch (e: SignatureMismatchException) {
                throw e
            } catch (e: UpdateRejectedException) {
                throw e
            } catch (e: IOException) {
                last = e
            }
            coroutineContext.ensureActive()
            if (attempt < MAX_ATTEMPTS) delay(1_500L * attempt)
        }
        clearStale()
        throw IOException(
            "No se pudo descargar la actualización completa. Revisa la conexión e inténtalo de nuevo.",
            last,
        )
    }

    private suspend fun downloadOnce(
        url: String,
        expectedSize: Long?,
        expectedSha256: String?,
        onProgress: (Int) -> Unit,
    ): File {
        val tmp = File(dir, "pelis-tv.apk.part")
        val out = File(dir, "pelis-tv.apk")
        val request = Request.Builder().url(url).header("User-Agent", USER_AGENT).header("Cache-Control", "no-cache").build()
        val call = http.newCall(request)
        try {
            call.execute().use { response ->
                if (!response.isSuccessful) throw IOException("No se pudo descargar la actualización (${response.code}).")
                val body = response.body ?: throw IOException("No se pudo descargar la actualización.")
                val declared = body.contentLength().takeIf { it > 0 }
                val total = expectedSize?.takeIf { it > 0 } ?: declared
                val digest = MessageDigest.getInstance("SHA-256")
                var written = 0L
                var lastPct = -1
                body.byteStream().use { input ->
                    tmp.outputStream().use { output ->
                        val buf = ByteArray(64 * 1024)
                        while (true) {
                            coroutineContext.ensureActive()
                            val n = input.read(buf)
                            if (n < 0) break
                            output.write(buf, 0, n)
                            digest.update(buf, 0, n)
                            written += n
                            if (total != null) {
                                val pct = ((written * 100) / total).toInt().coerceIn(0, 100)
                                if (pct != lastPct) { lastPct = pct; onProgress(pct) }
                            }
                        }
                    }
                }
                if (written < MIN_APK_BYTES || (declared != null && written != declared)) {
                    throw IOException("La descarga quedó incompleta.")
                }
                val sha = digest.digest().joinToString("") { "%02x".format(it) }
                if (!ApkCheck.matchesPublished(written, sha, expectedSize, expectedSha256)) {
                    throw IOException("La descarga no coincide con la versión publicada.")
                }
            }
            if (!tmp.renameTo(out)) {
                tmp.copyTo(out, overwrite = true)
            }
            return out
        } catch (e: Exception) {
            call.cancel()
            tmp.delete()
            out.delete()
            throw e
        } finally {
            tmp.delete()
        }
    }

    // ---- Instalación ---------------------------------------------------------------

    /**
     * Instala con PackageInstaller para conocer el resultado (firma distinta,
     * cancelado, sin espacio…). Si el dispositivo no lo soporta, cae al intent
     * clásico ACTION_VIEW del FileProvider (sin resultado).
     */
    suspend fun install(apk: VerifiedApk): InstallOutcome =
        runCatching { installWithSession(apk.file) }.getOrElse {
            runCatching { handOffToInstaller(apk.file) }
                .fold({ InstallOutcome.Handed }, { e -> InstallOutcome.Failed(e.message ?: "No se pudo abrir el instalador.") })
        }

    private suspend fun installWithSession(apk: File): InstallOutcome {
        val installer = pm.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            setSize(apk.length())
        }
        val sessionId = installer.createSession(params)
        withContext(Dispatchers.IO) {
            installer.openSession(sessionId).use { session ->
                session.openWrite("pelis-tv.apk", 0, apk.length()).use { out ->
                    apk.inputStream().use { it.copyTo(out, 64 * 1024) }
                    session.fsync(out)
                }
            }
        }
        val action = "${context.packageName}.APK_INSTALL_STATUS.$sessionId"
        return suspendCancellableCoroutine { cont ->
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context, intent: Intent) {
                    val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
                    val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                    if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
                        @Suppress("DEPRECATION")
                        val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                        if (confirm != null) {
                            confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            runCatching { context.startActivity(confirm) }
                            return
                        }
                    }
                    runCatching { app.unregisterReceiver(this) }
                    val outcome = when {
                        status == PackageInstaller.STATUS_SUCCESS -> InstallOutcome.Handed
                        status == PackageInstaller.STATUS_FAILURE_ABORTED -> InstallOutcome.Cancelled
                        ApkCheck.looksLikeSignatureFailure(message) ||
                            ((status == PackageInstaller.STATUS_FAILURE_CONFLICT ||
                                status == PackageInstaller.STATUS_FAILURE_INCOMPATIBLE) && installedNeedsReinstall()) ->
                            InstallOutcome.SignatureMismatch
                        status == PackageInstaller.STATUS_FAILURE_STORAGE ->
                            InstallOutcome.Failed("No hay espacio suficiente para instalar la actualización.")
                        else -> InstallOutcome.Failed("Android no pudo instalar la actualización (código $status).")
                    }
                    if (cont.isActive) cont.resume(outcome)
                }
            }
            ContextCompat.registerReceiver(app, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
            val pending = PendingIntent.getBroadcast(
                app,
                sessionId,
                Intent(action).setPackage(context.packageName),
                flags,
            )
            cont.invokeOnCancellation {
                runCatching { app.unregisterReceiver(receiver) }
                runCatching { installer.abandonSession(sessionId) }
            }
            try {
                installer.openSession(sessionId).use { it.commit(pending.intentSender) }
            } catch (e: Exception) {
                runCatching { app.unregisterReceiver(receiver) }
                runCatching { installer.abandonSession(sessionId) }
                if (cont.isActive) cont.resume(InstallOutcome.Failed(e.message ?: "No se pudo iniciar la instalación."))
            }
        }
    }

    fun handOffToInstaller(apk: File) {
        val authority = "${context.packageName}.apkupdate"
        val uri = FileProvider.getUriForFile(context, authority, apk)
        val view = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, APK_MIME)
            clipData = ClipData.newRawUri("pelis-tv.apk", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val matches = pm.queryIntentActivities(view, PackageManager.MATCH_DEFAULT_ONLY)
        if (matches.isEmpty()) throw IOException("Este dispositivo no tiene un instalador de paquetes.")
        for (info in matches) {
            context.grantUriPermission(info.activityInfo.packageName, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(view)
    }

    companion object {
        const val APK_MIME = "application/vnd.android.package-archive"
        private const val USER_AGENT = "PelisTV-Updater"
        private const val MIN_APK_BYTES = 1024L * 1024L
        private const val MAX_ATTEMPTS = 3
    }
}
