import 'dotenv/config';

export default {
  expo: {
    name: "SOLDESER",
    slug: "soldeser-fichaje",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    icon: "./assets/logo.png",
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#0F1729"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.soldeser.fichaje",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Necesitamos tu ubicación para verificar que estás en la obra al fichar.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Necesitamos tu ubicación para verificar que estás en la obra al fichar.",
        NSCameraUsageDescription: "Necesitamos la cámara para subir fotos de nóminas.",
        NSPhotoLibraryUsageDescription: "Necesitamos acceder a tus fotos para subir nóminas."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/logo.png",
        backgroundColor: "#0F1729"
      },
      package: "com.soldeser.fichaje",
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "CAMERA", "READ_MEDIA_IMAGES"]
    },
    web: {
      bundler: "metro"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0F1729",
          image: "./assets/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          ios: { backgroundColor: "#0F1729" },
          android: { backgroundColor: "#0F1729" }
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Soldeser necesita acceder a tu ubicación para verificar tu presencia en la obra."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Permite a Soldeser acceder a tus fotos para subir nóminas.",
          cameraPermission: "Permite a Soldeser usar la cámara para fotografiar nóminas."
        }
      ],
      "expo-asset",
      "expo-secure-store",
      "@react-native-community/datetimepicker"
    ],
    extra: {
      apiUrlDev: process.env.API_URL_DEV || "http://localhost:3001/api",
      apiUrlProd: process.env.API_URL_PROD || "https://soldeser-production.up.railway.app/api",
      eas: {
        projectId: "077f3d3d-4d17-4aba-9b8d-a74c84d3e24c"
      }
    }
  }
};
