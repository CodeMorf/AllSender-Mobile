import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const bundleId = "com.codemorf.allsendermobile";
const deepLinkScheme = "allsender";

const config: ExpoConfig = {
  name: "AllSender Mobile",
  slug: "allsender-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/allsender-logo-original.png",
  scheme: deepLinkScheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: bundleId,
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: bundleId,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#123047",
      foregroundImage: "./assets/images/allsender-logo-original.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        data: [{ scheme: deepLinkScheme }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  extra: {
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined },
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    [
      "expo-audio",
      { microphonePermission: "Permite a AllSender Mobile usar el micrófono para enviar notas de voz." },
    ],
    [
      "expo-image-picker",
      { photosPermission: "Permite a AllSender Mobile seleccionar imágenes y videos para enviarlos al chat." },
    ],
    [
      "expo-location",
      { locationWhenInUsePermission: "Permite a AllSender Mobile compartir tu ubicación en una conversación." },
    ],
    [
      "expo-local-authentication",
      { faceIDPermission: "Permite a AllSender Mobile proteger tu sesión con Face ID o huella." },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/allsender-logo-original.png",
        imageWidth: 180,
        resizeMode: "contain",
        backgroundColor: "#F8FAFC",
        dark: { backgroundColor: "#0D1821" },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
        // Include x86_64 so the internal APK can run on Android emulators as
        // well as the ARM devices used in production QA.
        buildArchs: ["armeabi-v7a", "arm64-v8a", "x86_64"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
