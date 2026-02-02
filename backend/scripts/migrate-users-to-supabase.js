/**
 * Script para listar usuarios que necesitan ser creados en Supabase
 * Ejecutar: node scripts/migrate-users-to-supabase.js
 *
 * Los usuarios con contraseña ya existentes no pueden migrarse automáticamente
 * (el hash bcrypt no es reversible). Este script lista los usuarios y las opciones.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { getSupabaseAdmin } = require('../src/utils/supabase');

const prisma = new PrismaClient();

async function migrate() {
  const users = await prisma.user.findMany({
    where: { passwordHash: { not: null } },
    select: { email: true, firstName: true, lastName: true },
  });

  console.log(`\n📋 Usuarios con contraseña en la BD: ${users.length}\n`);

  if (users.length === 0) {
    console.log('No hay usuarios para migrar.');
    await prisma.$disconnect();
    return;
  }

  const supabase = getSupabaseAdmin();
  const existingEmails = new Set();

  if (supabase) {
    const { data } = await supabase.auth.admin.listUsers();
    data.users.forEach((u) => existingEmails.add(u.email?.toLowerCase()));
  }

  for (const user of users) {
    const exists = existingEmails.has(user.email?.toLowerCase());
    const status = exists ? '✅ Ya en Supabase' : '⚠️  Falta en Supabase';
    console.log(`${status} - ${user.email} (${user.firstName} ${user.lastName})`);
  }

  console.log(`
💡 Para usuarios que faltan en Supabase:
   1. Crear manualmente en Supabase Dashboard (Authentication > Users) con la misma contraseña
   2. O usar "Invite user" para enviar email de configuración de contraseña

   Los usuarios NUEVOS creados por admin se añaden a Supabase automáticamente.
`);
  await prisma.$disconnect();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
