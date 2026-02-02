# Despliegue en Railway

## Variables de entorno obligatorias

En Railway Dashboard > tu servicio > Variables:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | **Con SSL**: `postgresql://postgres:PASSWORD@db.ulxtbtzzsjykbayezxum.supabase.co:5432/postgres?sslmode=require` |
| `JWT_SECRET` | Secreto para JWT |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | https://ulxtbtzzsjykbayezxum.supabase.co |
| `SUPABASE_JWT_SECRET` | Desde Supabase Dashboard > API > JWT Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Para crear usuarios |

## Configuración del servicio (Settings)

**IMPORTANTE**: Borra o deja vacío el "Build Command" y "Start Command" en Railway.
El `nixpacks.toml` en la raíz del repo ya los define correctamente.

Si usas comandos manuales:
- **Build**: `cd backend && npm ci && npx prisma generate` (SIN migrate)
- **Start**: `cd backend && npx prisma migrate deploy && node src/index.js`

**Root Directory**: Déjalo vacío (raíz). El nixpacks.toml en raíz construye el backend.

## DATABASE_URL con Supabase

Añade `?sslmode=require` al final para que la conexión funcione.
