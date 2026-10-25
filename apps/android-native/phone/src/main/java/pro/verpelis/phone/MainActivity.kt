package pro.verpelis.phone

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Entrada del ícono (sin UI). La app real es [HomeActivity] (singleTask, por el login con Google).
 * Si el ícono abriera directamente una actividad singleTask, Android cerraría todo lo que hay
 * encima (p. ej. el reproductor) al volver desde Inicio. Con esta entrada estándar, volver desde el
 * ícono solo trae la tarea al frente y el reproductor sigue donde estaba.
 */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (isTaskRoot) {
            startActivity(Intent(this, HomeActivity::class.java).apply { intent.extras?.let { putExtras(it) } })
        }
        finish()
    }
}
