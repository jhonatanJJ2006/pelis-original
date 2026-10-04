package pro.verpelis.tv.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ApkUpdatePolicyTest {
    @Test
    fun offersOnlyWhenServerCodeIsGreater() {
        assertTrue(ApkUpdatePolicy.shouldOffer(installedCode = 3, remoteCode = 4, dismissedCode = null, apkAvailable = true))
        assertFalse(ApkUpdatePolicy.shouldOffer(installedCode = 4, remoteCode = 4, dismissedCode = null, apkAvailable = true))
        assertFalse(ApkUpdatePolicy.shouldOffer(installedCode = 5, remoteCode = 4, dismissedCode = null, apkAvailable = true))
    }

    @Test
    fun hidesWhenApkMissingRemoteMissingOrDismissed() {
        assertFalse(ApkUpdatePolicy.shouldOffer(3, 4, null, apkAvailable = false))
        assertFalse(ApkUpdatePolicy.shouldOffer(3, null, null, apkAvailable = true))
        assertFalse(ApkUpdatePolicy.shouldOffer(3, 4, dismissedCode = 4, apkAvailable = true))
        assertTrue(ApkUpdatePolicy.shouldOffer(3, 5, dismissedCode = 4, apkAvailable = true))
    }
}
