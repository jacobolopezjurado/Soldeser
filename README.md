# 🏗️ Soldeser - Sistema de Fichaje para Construcción

App de control horario para empresas de construcción con verificación de geolocalización, modo offline y cumplimiento RGPD.

## 📱 Características

- ✅ **Fichaje con geolocalización** - Verifica presencia en la obra
- ✅ **Modo offline** - Guarda fichajes sin conexión y sincroniza después
- ✅ **Login múltiple** - Email/contraseña, PIN rápido o Firebase Auth
- ✅ **Historial completo** - Consulta horas trabajadas por día/semana/mes
- ✅ **Gestión de obras** - Asigna trabajadores a diferentes obras
- ✅ **Cumplimiento RGPD** - Consentimientos, auditoría y derechos del usuario
- ✅ **Roles de usuario** - Admin, Supervisor, Trabajador

## 🛠️ Stack Tecnológico

### Backend
- **Node.js + Express** - API REST
- **PostgreSQL** - Base de datos
- **Prisma** - ORM
- **JWT** - Autenticación
- **Supabase** - Auth email/contraseña (opcional)
- **Firebase Admin** - Auth adicional
- **Railway** - Deploy recomendado

### Mobile
- **React Native + Expo** - App multiplataforma
- **expo-location** - Geolocalización
- **expo-secure-store** - Almacenamiento seguro de tokens
- **AsyncStorage** - Cache offline
- **Supabase Auth** - Login email/contraseña (opcional)
- **Firebase Auth** - Autenticación (legacy)

## 🚀 Instalación

### Requisitos previos
- Node.js 18+
- PostgreSQL (local o remoto)
- Expo CLI (`npm install -g expo-cli`)
- Cuenta en Firebase (opcional)

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/soldeser.git
cd soldeser
```

### 2. Configurar el Backend

```bash
cd backend
npm install

# Copiar variables de entorno
cp env.example .env
```

Editar `.env` con tus credenciales:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/soldeser"
JWT_SECRET="genera-un-secreto-seguro"
JWT_EXPIRES_IN="7d"
PORT=3000

# Supabase (opcional - para login con email)
# SUPABASE_URL=https://tu-proyecto.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
# SUPABASE_JWT_SECRET=tu-jwt-secret
```

Ver [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) para la configuración completa de Supabase.

Inicializar la base de datos:
```bash
# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# (Opcional) Poblar con datos de prueba
npm run prisma:seed
```

Iniciar el servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

### 3. Configurar la App Móvil

```bash
cd mobile
npm install
```

Editar la URL del backend en `src/config/api.js`:
```javascript
const API_URL = __DEV__ 
  ? 'http://TU_IP_LOCAL:3000/api'  // Tu IP de red local
  : 'https://tu-backend.railway.app/api';
```

Iniciar Expo:
```bash
npm start
# o
expo start
```

## 📲 Ejecutar en dispositivo

1. Instala **Expo Go** en tu dispositivo (iOS/Android)
2. Escanea el QR que aparece en la terminal
3. La app se cargará automáticamente

## 🔐 Credenciales de prueba

Si ejecutaste el seed, puedes usar:

| Rol | Email | Contraseña | PIN |
|-----|-------|------------|-----|
| Admin | admin@soldeser.com | admin123 | 1234 |
| Supervisor | encargado@soldeser.com | super123 | 5678 |
| Trabajador | pedro@soldeser.com | worker123 | 1111 |

## 🌐 Deploy en Railway

### Backend

1. Crea un proyecto en [Railway](https://railway.app)
2. Añade un servicio PostgreSQL
3. Añade un servicio desde GitHub (carpeta `backend`)
4. Configura las variables de entorno:
   - `DATABASE_URL` (provista por Railway)
   - `JWT_SECRET`
   - `NODE_ENV=production`
5. Railway desplegará automáticamente

### Mobile (Build)

```bash
cd mobile

# Build para Android
eas build --platform android

# Build para iOS (requiere cuenta de Apple Developer)
eas build --platform ios
```

## 📁 Estructura del proyecto

```
soldeser/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Esquema de BD
│   │   └── seed.js          # Datos iniciales
│   └── src/
│       ├── routes/          # Endpoints API
│       ├── middleware/      # Auth, errores, auditoría
│       ├── utils/           # Helpers (geo, jwt)
│       └── index.js         # Entry point
│
├── mobile/
│   ├── src/
│   │   ├── screens/         # Pantallas
│   │   │   ├── auth/        # Login, Consent
│   │   │   └── main/        # Home, History, Profile
│   │   ├── contexts/        # Auth, Offline
│   │   ├── navigation/      # React Navigation
│   │   └── config/          # API, theme, Firebase
│   ├── App.js
│   └── app.json             # Configuración Expo
│
└── README.md
```

## 🔒 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login con email/contraseña
- `POST /api/auth/login-pin` - Login rápido con DNI/PIN
- `POST /api/auth/firebase` - Login con Firebase
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/consent` - Actualizar consentimientos RGPD
- `POST /api/auth/logout` - Cerrar sesión

### Fichajes
- `POST /api/clock/in` - Fichar entrada
- `POST /api/clock/out` - Fichar salida
- `GET /api/clock/status` - Estado actual
- `GET /api/clock/history` - Historial
- `GET /api/clock/today` - Fichajes de hoy

### Usuarios (Admin)
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Desactivar usuario
- `POST /api/users/:id/assign-worksite` - Asignar a obra

### Obras
- `GET /api/worksites` - Listar obras
- `POST /api/worksites` - Crear obra (Admin)
- `PUT /api/worksites/:id` - Actualizar obra
- `GET /api/worksites/:id/workers` - Trabajadores de una obra
- `GET /api/worksites/:id/clock-records` - Fichajes de una obra

### Sincronización
- `POST /api/sync/clock-records` - Sincronizar fichajes offline
- `GET /api/sync/status` - Estado de sincronización
- `GET /api/sync/worksites` - Descargar obras para offline

## ⚖️ Cumplimiento Legal (RGPD)

La aplicación implementa:

- ✅ **Consentimiento explícito** - Para tratamiento de datos y geolocalización
- ✅ **Logs de auditoría** - Registro de todas las acciones
- ✅ **Derecho de acceso** - El usuario puede solicitar sus datos
- ✅ **Aviso de privacidad** - Información clara sobre uso de datos
- ✅ **Revocación** - El usuario puede retirar consentimientos
- ✅ **Geolocalización puntual** - Solo al fichar, sin tracking continuo

## 📝 Licencia

MIT © 2024 Soldeser Construcción

---

¿Preguntas? Abre un issue o contacta en desarrollo@soldeser.com
