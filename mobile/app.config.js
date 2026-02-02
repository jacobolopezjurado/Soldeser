import 'dotenv/config';

export default {
  expo: {
    name: "SOLDESER",
    slug: "soldeser-fichaje",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1E3A5F"
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
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#1E3A5F"
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
      apiUrlProd: process.env.API_URL_PROD || "https://soldeser-production.up.railway.app/api",
      eas: {
        projectId: "077f3d3d-4d17-4aba-9b8d-a74c84d3e24c"
      }
    }
  }
};
