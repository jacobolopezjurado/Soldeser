import 'dotenv/config';

export default {
  expo: {
    name: "Soldeser Fichaje",
    slug: "soldeser-fichaje",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.soldeser.fichaje",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Necesitamos tu ubicación para verificar que estás en la obra al fichar.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Necesitamos tu ubicación para verificar que estás en la obra al fichar."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#1a1a2e"
      },
      package: "com.soldeser.fichaje",
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
    },
    web: {
      bundler: "metro"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Soldeser necesita acceder a tu ubicación para verificar tu presencia en la obra."
        }
      ],
      "expo-asset",
      "expo-secure-store"
    ],
    extra: {
      apiUrlDev: process.env.API_URL_DEV || "http://localhost:3001/api",
      apiUrlProd: process.env.API_URL_PROD || "https://tu-backend.railway.app/api",
      eas: {
        projectId: "077f3d3d-4d17-4aba-9b8d-a74c84d3e24c"
      }
    }
  }
};
