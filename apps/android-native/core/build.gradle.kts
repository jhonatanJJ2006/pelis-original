plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "pro.verpelis.core"
    compileSdk = 35
    defaultConfig {
        minSdk = 24
        buildConfigField("String", "BASE_URL", "\"https://verpelis.pro\"")
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    testOptions { unitTests.isReturnDefaultValues = true }
}

dependencies {
    val bom = platform("androidx.compose:compose-bom:2024.12.01")
    api(bom)
    api("androidx.core:core-ktx:1.15.0")
    api("androidx.activity:activity-compose:1.9.3")
    api("androidx.compose.ui:ui")
    api("androidx.compose.foundation:foundation")
    api("androidx.compose.material3:material3")
    api("androidx.compose.material:material-icons-extended")
    api("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    api("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    api("androidx.navigation:navigation-compose:2.8.5")
    api("com.squareup.okhttp3:okhttp:4.12.0")
    api("io.coil-kt:coil-compose:2.7.0")
    api("androidx.media3:media3-exoplayer:1.5.1")
    api("androidx.media3:media3-exoplayer-hls:1.5.1")
    api("androidx.media3:media3-datasource-okhttp:1.5.1")
    api("androidx.media3:media3-ui:1.5.1")
    api("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20231013")
}
