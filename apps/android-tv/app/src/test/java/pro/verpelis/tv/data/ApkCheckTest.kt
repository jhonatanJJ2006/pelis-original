package pro.verpelis.tv.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ApkCheckTest {
    private val release = ApkCheck.RELEASE_CERT_SHA1
    private val debug = "60:95:A6:C9:39:95:93:47:00:3F:F6:3F:48:A8:7B:3B:25:8D:34:E7"
    private val pkg = "pro.verpelis.tv"

    @Test
    fun releaseOverReleaseIsOk() {
        assertEquals(
            ApkCheck.Verdict.Ok,
            ApkCheck.verdict(pkg, 8, listOf(release), pkg, 9, listOf(release.lowercase().replace(":", ""))),
        )
    }

    @Test
    fun debugInstallCannotTakeReleaseUpdate() {
        val v = ApkCheck.verdict(pkg, 5, listOf(debug), pkg, 9, listOf(release))
        assertTrue(v is ApkCheck.Verdict.SignatureMismatch)
        assertTrue(ApkCheck.installedNeedsReinstall(listOf(debug)))
        assertFalse(ApkCheck.installedNeedsReinstall(listOf(release)))
        assertFalse(ApkCheck.installedNeedsReinstall(emptyList()))
    }

    @Test
    fun rejectsOlderWrongOrUnreadable() {
        assertTrue(ApkCheck.verdict(pkg, 9, listOf(release), pkg, 9, listOf(release)) is ApkCheck.Verdict.NotNewer)
        assertTrue(ApkCheck.verdict(pkg, 8, listOf(release), "x.y", 9, listOf(release)) is ApkCheck.Verdict.WrongPackage)
        assertEquals(ApkCheck.Verdict.Unreadable, ApkCheck.verdict(pkg, 8, listOf(release), null, null, emptyList()))
    }

    @Test
    fun unknownArchiveSignerDefersToInstaller() {
        assertEquals(ApkCheck.Verdict.Ok, ApkCheck.verdict(pkg, 8, listOf(release), pkg, 9, emptyList()))
    }

    @Test
    fun publishedSizeAndHash() {
        assertTrue(ApkCheck.matchesPublished(10, "ABC", 10, "abc"))
        assertTrue(ApkCheck.matchesPublished(10, "abc", null, null))
        assertFalse(ApkCheck.matchesPublished(9, "abc", 10, "abc"))
        assertFalse(ApkCheck.matchesPublished(10, "abd", 10, "abc"))
    }

    @Test
    fun sha1FormatAndInstallerMessages() {
        assertEquals(59, ApkCheck.sha1Fingerprint(byteArrayOf(1, 2, 3)).length)
        assertTrue(ApkCheck.looksLikeSignatureFailure("INSTALL_FAILED_UPDATE_INCOMPATIBLE: signatures do not match"))
        assertFalse(ApkCheck.looksLikeSignatureFailure("INSTALL_FAILED_INSUFFICIENT_STORAGE"))
    }
}
