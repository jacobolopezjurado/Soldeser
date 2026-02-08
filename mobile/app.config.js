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
        NSLocationAlwaysAndWhenInUseUsageDescription: "Necesitamos tu ubicación para verificar que estás en la obra al fichar."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/logo.png",
        backgroundColor: "#0F1729"
      },
      package: "com.soldeser.fichaje",
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
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
      "expo-asset",
      "expo-secure-store"
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
