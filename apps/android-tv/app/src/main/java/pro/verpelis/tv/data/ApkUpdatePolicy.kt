package pro.verpelis.tv.data

/**
 * Show the update prompt only when a published APK on the server has a
 * versionCode strictly greater than the one installed, and the user has not
 * dismissed that exact server code.
 */
object ApkUpdatePolicy {
    fun shouldOffer(
        installedCode: Int,
        remoteCode: Int?,
        dismissedCode: Int?,
        apkAvailable: Boolean,
    ): Boolean {
        if (!apkAvailable) return false
        val remote = remoteCode ?: return false
        if (remote <= installedCode) return false
        if (dismissedCode != null && dismissedCode == remote) return false
        return true
    }
}
