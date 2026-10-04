package pro.verpelis.tv.data

import android.content.Context

class UpdateStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun dismissedCode(): Int? =
        prefs.getString(KEY_DISMISSED, null)
            ?.removePrefix(CODE_PREFIX)
            ?.toIntOrNull()

    fun dismiss(remoteCode: Int) {
        prefs.edit().putString(KEY_DISMISSED, "$CODE_PREFIX$remoteCode").apply()
    }

    companion object {
        private const val PREFS = "pelis_tv_apk_update"
        private const val KEY_DISMISSED = "dismissed_version"
        private const val CODE_PREFIX = "code:"
    }
}
