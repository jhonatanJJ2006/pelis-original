plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Firma de release: lee la keystore de variables de entorno (nunca se commitea).
// Sin PELIS_STORE_FILE (p. ej. en CI) el release se firma con la clave debug.
val pelisStoreFile: String? = System.getenv("PELIS_STORE_FILE")?.takeIf { it.isNotBlank() }

val apiBase: String = (findProperty("pelisApiBase") as String?)
    ?.trim()
    ?.let { if (it.endsWith("/")) it else "$it/" }
    ?: "https://verpelis.pro/"

android {
    namespace = "pro.verpelis.tv"
    compileSdk = 35

    defaultConfig {
        applicationId = "pro.verpelis.tv"
        minSdk = 21
        targetSdk = 35
        versionCode = 6
        versionName = "1.5.0"
        buildConfigField("String", "API_BASE_URL", "\"$apiBase\"")
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
    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.tv:tv-foundation:1.0.0-alpha11")
    implementation("androidx.tv:tv-material:1.0.0")
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    implementation("io.coil-kt:coil-compose:2.7.0")

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.2")

    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")
    implementation("androidx.media3:media3-datasource-okhttp:1.5.1")

    implementation("com.google.zxing:core:3.5.3")

    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}
