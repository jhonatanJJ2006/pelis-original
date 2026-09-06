package pro.verpelis.tv.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

private val Context.soundDataStore by preferencesDataStore(name = "pelis_tv_settings")

class SoundPreferences(private val context: Context) {
    private val keyEnabled = booleanPreferencesKey("sounds_enabled")

    val soundsEnabledFlow: Flow<Boolean> = context.soundDataStore.data.map { prefs ->
        prefs[keyEnabled] ?: true
    }

    var soundsEnabled: Boolean
        get() = runBlocking { soundsEnabledFlow.first() }
        set(value) {
            runBlocking { setEnabled(value) }
        }

    suspend fun setEnabled(value: Boolean) {
        context.soundDataStore.edit { it[keyEnabled] = value }
    }
}
