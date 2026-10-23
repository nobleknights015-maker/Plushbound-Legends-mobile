plugins {
    id("com.android.application")
}

android {
    namespace = "com.plushbound.legends"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.plushbound.legends"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0-editor-rc"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
