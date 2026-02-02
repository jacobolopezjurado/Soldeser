# Configuración de Supabase para Soldeser

Esta guía explica cómo conectar Soldeser con Supabase para **autenticación** y **base de datos**.

## Resumen rápido (si no hay tablas ni usuarios)

1. **Crear proyecto** en [supabase.com](https://supabase.com)
2. **Ejecutar SQL**: Supabase Dashboard > SQL Editor > pegar `backend/prisma/supabase-schema.sql` > Run
3. **DATABASE_URL**: Project Settings > Database > Connection string > copiar y pegar en `backend/.env`
4. **Seed**: `cd backend && npm run prisma:generate && npm run prisma:seed`
5. **Crear usuarios en Auth**: Authentication > Users > Add user (mismo email/contraseña que el seed: admin@soldeser.com / admin123)

---

## Arquitectura

- **Login email/contraseña**: Supabase Auth
- **Login PIN**: Backend propio (sin cambios)
- **Base de datos**: PostgreSQL de Supabase (o tu propio PostgreSQL)
- **API**: El backend valida tanto JWT de Supabase como JWT propio

---

## Paso 1: Crear tablas en Supabase

### Opción A: Usar Supabase como base de datos

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** > **New query**
3. Copia y pega el contenido de `backend/prisma/supabase-schema.sql`
4. Ejecuta el script (Run)
5. Verifica en **Table Editor** que existen: `users`, `worksites`, `clock_records`, `audit_logs`, `worksite_assignments`

### Opción B: Usar Prisma Migrate (PostgreSQL propio o Supabase)

Si prefieres usar Prisma para las migraciones:

```bash
cd backend
# Configura DATABASE_URL en .env (ver abajo)
npm run prisma:generate
npm run prisma:migrate dev
```

---

## Paso 2: Configurar DATABASE_URL

El backend necesita conectarse a PostgreSQL. En Supabase:

1. Ve a **Project Settings** > **Database**
2. Copia la **Connection string** (modo URI)
3. Sustituye `[YOUR-PASSWORD]` por la contraseña de la base de datos
4. Para Prisma, usa la conexión **directa** (puerto 5432), no la pooler (6543)

Ejemplo:
```
postgresql://postgres.[project-ref]:[TU_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

O la conexión directa (recomendada para migraciones):
```
postgresql://postgres:[TU_PASSWORD]@db.[project-ref].supabase.co:5432/postgres
```

Añade a `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

---

## Paso 3: Crear usuarios iniciales (seed)

```bash
cd backend
npm run prisma:generate
npm run prisma:seed
```

Esto crea: admin@soldeser.com, encargado@soldeser.com, pedro@soldeser.com, etc.

---

## Paso 4: Variables de entorno del backend

En `backend/.env` necesitas al menos:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres"
JWT_SECRET="genera-un-secreto-seguro-para-jwt"
JWT_EXPIRES_IN="7d"
PORT=3000

# Supabase Auth (para login con email)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=tu-jwt-secret
```

---

## Paso 5: Variables de entorno Auth (Mobile)

En `mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Paso 6: Usuarios en Supabase Auth

Los usuarios creados **después** de configurar Supabase se crean automáticamente en Supabase cuando el admin los da de alta con contraseña.

Para **usuarios ya existentes** en la base de datos (ej. del seed), tienes dos opciones:

### Opción A: Invitar manualmente desde Supabase Dashboard

1. Ve a Authentication > Users en Supabase
2. Add user > Create new user
3. Introduce el mismo email y contraseña que en tu BD

### Opción B: Script de migración

```bash
cd backend
node scripts/migrate-users-to-supabase.js
```

## Comportamiento sin Supabase

Si **no** configuras las variables de Supabase:

- **Mobile**: Usa el login por backend (email/contraseña vía API)
- **Backend**: Solo acepta JWT propio
- Todo funciona como antes de la integración

## Flujo de autenticación

```
[Login Email]                    [Login PIN]
     |                               |
     v                               v
Supabase Auth                    Backend API
     |                               |
     v                               v
access_token                    JWT propio
     |                               |
     v                               v
     +---------> API Backend <--------+
                    |
                    v
         Valida token (Supabase o propio)
                    |
                    v
         Busca usuario en BD (por email o userId)
                    |
                    v
              req.user
```

## Crear usuario nuevo (Admin)

Cuando un admin crea un usuario con contraseña:

1. Se crea en la BD (Prisma)
2. Se crea en Supabase Auth (si está configurado)
3. El usuario puede hacer login con email/contraseña en la app

## EAS Build (producción)

Para builds de producción, configura las variables en EAS:

```bash
cd mobile
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

O en `eas.json` dentro de `build.env`.
