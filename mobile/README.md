# Soldeser Mobile App

App de fichaje para trabajadores de construcción.

## Inicio rápido

```bash
# Instalar dependencias
npm install

# Configurar URL del backend
# Editar src/config/api.js con tu IP local

# Iniciar Expo
npm start
```

## Ejecutar en dispositivo

1. Instala **Expo Go** desde App Store / Play Store
2. Escanea el código QR de la terminal
3. ¡Listo!

## Estructura

```
src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js      # Login email/PIN
│   │   └── ConsentScreen.js    # Consentimientos RGPD
│   └── main/
│       ├── HomeScreen.js       # Fichaje entrada/salida
│       ├── HistoryScreen.js    # Historial
│       └── ProfileScreen.js    # Perfil y ajustes
├── contexts/
│   ├── AuthContext.js          # Estado de autenticación
│   └── OfflineContext.js       # Modo offline
├── navigation/
│   ├── RootNavigator.js
│   └── MainTabs.js
└── config/
    ├── api.js                  # Axios config
    ├── theme.js                # Colores y estilos
    └── firebase.js             # (Opcional)
```

## Builds

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Configurar proyecto
eas build:configure

# Build Android
eas build --platform android

# Build iOS
eas build --platform ios
```

## Assets necesarios

Crear en `/assets`:
- `icon.png` (1024x1024) - Icono de la app
- `splash.png` (1284x2778) - Pantalla de carga
- `adaptive-icon.png` (1024x1024) - Icono Android
- `favicon.png` (48x48) - Web
