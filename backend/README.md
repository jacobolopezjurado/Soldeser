# Soldeser Backend API

API REST para el sistema de fichaje de Soldeser.

## Inicio rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus valores

# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# (Opcional) Cargar datos de prueba
npm run prisma:seed

# Iniciar en desarrollo
npm run dev
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor con hot-reload (nodemon) |
| `npm start` | Inicia servidor en producción |
| `npm run prisma:generate` | Genera cliente Prisma |
| `npm run prisma:migrate` | Ejecuta migraciones de BD |
| `npm run prisma:studio` | Abre Prisma Studio (GUI de BD) |
| `npm run prisma:seed` | Puebla BD con datos de prueba |

## Variables de entorno

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="tu-secreto-jwt"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
```

## Estructura

```
src/
├── index.js           # Entry point
├── routes/            # Endpoints API
│   ├── auth.js        # Autenticación
│   ├── clock.js       # Fichajes
│   ├── users.js       # Gestión usuarios
│   ├── worksites.js   # Obras
│   └── sync.js        # Sincronización offline
├── middleware/
│   ├── auth.js        # JWT y roles
│   ├── audit.js       # Logs RGPD
│   └── errorHandler.js
└── utils/
    ├── geo.js         # Geolocalización
    └── jwt.js         # Tokens
```
