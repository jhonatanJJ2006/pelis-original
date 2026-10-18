plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Firma de release: lee la keystore de variables de entorno (nunca se commitea).
// Sin PELIS_STORE_FILE (p. ej. en CI) el release se firma con la clave debug.
val pelisStoreFile: String? = System.getenv("PELIS_STORE_FILE")?.takeIf { it.isNotBlank() }

android {
    namespace = "pro.verpelis.tv"
    compileSdk = 35
    defaultConfig {
        applicationId = "pro.verpelis.tv.native"
        minSdk = 24
        targetSdk = 35
        versionCode = 4
        versionName = "1.2.1"
    }
    signingConfigs {
        if (pelisStoreFile != null) {
            create("pelis") {
                storeFile = file(pelisStoreFile)
                storePassword = System.getenv("PELIS_STORE_PASS")
                keyAlias = System.getenv("PELIS_KEY_ALIAS")?.takeIf { it.isNotBlank() } ?: "android"
                keyPassword = System.getenv("PELIS_KEY_PASS")?.takeIf { it.isNotBlank() } ?: System.getenv("PELIS_STORE_PASS")
            }
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName(if (pelisStoreFile != null) "pelis" else "debug")
        }
    }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(project(":core"))
    implementation("androidx.tv:tv-material:1.0.0")
}
