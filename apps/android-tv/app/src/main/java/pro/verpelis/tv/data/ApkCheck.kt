package pro.verpelis.tv.data

import java.security.MessageDigest
import java.util.Locale

/**
 * Reglas puras (sin Android) para decidir si un APK descargado se puede instalar
 * encima del actual.
 *
 * "App no instalada" en Android casi siempre es una de estas tres cosas:
 *  - firma distinta: hasta la 1.4.0 (versionCode 5) el APK publicado iba firmado
 *    con la clave *debug*; desde la 1.5.0 va con la clave de release. Android no
 *    deja actualizar entre firmas distintas: hay que desinstalar una vez.
 *  - descarga incompleta o corrupta (el parser del instalador falla).
 *  - versionCode igual o menor.
 */
object ApkCheck {
    /** SHA-1 del certificado de release (apps/android/android.keystore, alias android). */
    const val RELEASE_CERT_SHA1 = "9E:35:19:22:F5:E3:B5:6B:36:46:DE:B7:35:14:D7:94:C9:1D:35:B0"

    sealed interface Verdict {
        data object Ok : Verdict
        /** Firma del APK instalado ≠ firma del nuevo: solo se arregla desinstalando. */
        data class SignatureMismatch(val installed: String?, val archive: String?) : Verdict
        data class NotNewer(val installedCode: Long, val archiveCode: Long) : Verdict
        data class WrongPackage(val archivePackage: String?) : Verdict
        data object Unreadable : Verdict
    }

    fun sha1Fingerprint(certDer: ByteArray): String =
        MessageDigest.getInstance("SHA-1").digest(certDer).joinToString(":") { "%02X".format(it) }

    fun normalize(fingerprint: String?): String? =
        fingerprint?.uppercase(Locale.ROOT)?.filter { it.isLetterOrDigit() }?.takeIf { it.isNotEmpty() }

    fun sameCert(a: String?, b: String?): Boolean {
        val x = normalize(a) ?: return false
        return x == normalize(b)
    }

    /** El APK instalado no está firmado con la clave de release (p. ej. 1.4.0 o antes, debug). */
    fun installedNeedsReinstall(installedSigners: Collection<String>): Boolean =
        installedSigners.isNotEmpty() && installedSigners.none { sameCert(it, RELEASE_CERT_SHA1) }

    fun verdict(
        ownPackage: String,
        installedCode: Long,
        installedSigners: Collection<String>,
        archivePackage: String?,
        archiveCode: Long?,
        archiveSigners: Collection<String>,
    ): Verdict {
        if (archivePackage == null || archiveCode == null) return Verdict.Unreadable
        if (archivePackage != ownPackage) return Verdict.WrongPackage(archivePackage)
        if (archiveCode <= installedCode) return Verdict.NotNewer(installedCode, archiveCode)
        // Si alguna de las dos firmas no se pudo leer, que decida el instalador.
        if (installedSigners.isNotEmpty() && archiveSigners.isNotEmpty() &&
            installedSigners.none { i -> archiveSigners.any { a -> sameCert(i, a) } }
        ) {
            return Verdict.SignatureMismatch(installedSigners.firstOrNull(), archiveSigners.firstOrNull())
        }
        return Verdict.Ok
    }

    /** Tamaño y hash publicados por /api/app/availability (si el servidor los da). */
    fun matchesPublished(
        sizeBytes: Long,
        sha256Hex: String,
        expectedSize: Long?,
        expectedSha256: String?,
    ): Boolean {
        if (expectedSize != null && expectedSize > 0 && sizeBytes != expectedSize) return false
        if (!expectedSha256.isNullOrBlank() && !sha256Hex.equals(expectedSha256.trim(), ignoreCase = true)) return false
        return true
    }

    /** Mensaje del instalador del sistema que indica firma incompatible. */
    fun looksLikeSignatureFailure(statusMessage: String?): Boolean {
        val m = statusMessage?.uppercase(Locale.ROOT) ?: return false
        return "UPDATE_INCOMPATIBLE" in m || "SIGNATURE" in m || "INCONSISTENT_CERTIFICATES" in m
    }
}
