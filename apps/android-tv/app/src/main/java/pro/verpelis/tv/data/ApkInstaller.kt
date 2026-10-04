package pro.verpelis.tv.data

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException

/**
 * Downloads the published APK and hands it to the system package installer.
 * Never installs silently: the user confirms on the system screen.
 */
class ApkInstaller(
    private val context: Context,
    private val http: OkHttpClient,
) {
    fun canRequestInstall(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        return context.packageManager.canRequestPackageInstalls()
    }

    fun unknownSourcesIntent(): Intent =
        Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:${context.packageName}"),
        )

    suspend fun download(url: String): File = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(url).header("User-Agent", USER_AGENT).build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IOException("No se pudo descargar la actualización (${response.code}).")
            }
            val body = response.body ?: throw IOException("No se pudo descargar la actualización.")
            val dir = File(context.cacheDir, "apk-update").apply { mkdirs() }
            val out = File(dir, "pelis-tv.apk")
            val tmp = File(dir, "pelis-tv.apk.part")
            try {
                body.byteStream().use { input ->
                    tmp.outputStream().use { output -> input.copyTo(output) }
                }
            } catch (ex: IOException) {
                tmp.delete()
                throw IOException("No se pudo descargar la actualización. Revisa la conexión.", ex)
            }
            if (tmp.length() < MIN_APK_BYTES) {
                tmp.delete()
                throw IOException("La descarga quedó incompleta. Inténtalo de nuevo.")
            }
            if (out.exists() && !out.delete()) {
                tmp.delete()
                throw IOException("No se pudo preparar el archivo de actualización.")
            }
            if (!tmp.renameTo(out)) {
                tmp.copyTo(out, overwrite = true)
                tmp.delete()
            }
            out
        }
    }

    fun handOffToInstaller(apk: File) {
        val authority = "${context.packageName}.apkupdate"
        val uri = FileProvider.getUriForFile(context, authority, apk)
        val view = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, APK_MIME)
            clipData = ClipData.newRawUri("pelis-tv.apk", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val matches = context.packageManager.queryIntentActivities(
            view,
            PackageManager.MATCH_DEFAULT_ONLY,
        )
        if (matches.isEmpty()) {
            throw IOException("Este dispositivo no tiene un instalador de paquetes.")
        }
        for (info in matches) {
            context.grantUriPermission(
                info.activityInfo.packageName,
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION,
            )
        }
        context.startActivity(view)
    }

    companion object {
        const val APK_MIME = "application/vnd.android.package-archive"
        private const val USER_AGENT = "PelisTV-Updater"
        private const val MIN_APK_BYTES = 1024L
    }
}
