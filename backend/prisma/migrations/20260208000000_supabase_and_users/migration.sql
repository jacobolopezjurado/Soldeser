-- Migración: Firebase -> Supabase y columnas faltantes en users
-- Tu tabla ya tiene supabase_uid. Añadimos password_hash e is_active si no existen.

-- Añadir password_hash si no existe
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

-- Añadir is_active si no existe (default true para usuarios existentes)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Renombrar columna firebase_uid a supabase_uid si aún existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'firebase_uid'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "firebase_uid" TO "supabase_uid";
  END IF;
END $$;

-- Renombrar índice si existe (users_firebase_uid_key -> users_supabase_uid_key)
DROP INDEX IF EXISTS "users_firebase_uid_key";
CREATE UNIQUE INDEX IF NOT EXISTS "users_supabase_uid_key" ON "users"("supabase_uid");
