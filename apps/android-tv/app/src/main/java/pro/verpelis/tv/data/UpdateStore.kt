package pro.verpelis.tv.data

import android.content.Context

class UpdateStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun storedVersion(): String? = prefs.getString(KEY_STORED, null)?.takeIf { it.isNotBlank() }

    fun dismissedVersion(): String? = prefs.getString(KEY_DISMISSED, null)?.takeIf { it.isNotBlank() }

    fun rememberInstalled(versionKey: String) {
        if (storedVersion() == null) {
            prefs.edit().putString(KEY_STORED, versionKey).apply()
        }
    }

    fun markCurrent(versionKey: String) {
        prefs.edit().putString(KEY_STORED, versionKey).apply()
    }

    fun dismiss(versionKey: String) {
        prefs.edit().putString(KEY_DISMISSED, versionKey).apply()
    }

    companion object {
        private const val PREFS = "pelis_tv_apk_update"
        private const val KEY_STORED = "stored_version"
        private const val KEY_DISMISSED = "dismissed_version"

        fun versionKey(code: Int, name: String?): String = "code:$code"

        fun shouldOffer(
            storedVersion: String?,
            latestVersion: String?,
            dismissedVersion: String?,
            apkAvailable: Boolean,
        ): Boolean {
            if (!apkAvailable) return false
            val latest = latestVersion?.trim()?.takeIf { it.isNotEmpty() } ?: return false
            if (dismissedVersion == latest) return false
            val stored = storedVersion?.trim()?.takeIf { it.isNotEmpty() } ?: return false
            return stored != latest
        }
    }
}
