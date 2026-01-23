const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@soldeser.com' },
    update: {},
    create: {
      email: 'admin@soldeser.com',
      passwordHash: adminPassword,
      pin: '1234',
      firstName: 'Admin',
      lastName: 'Soldeser',
      dni: '00000000A',
      phone: '+34600000000',
      role: 'ADMIN',
      gdprConsent: true,
      gdprConsentDate: new Date(),
      locationConsent: true,
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // Crear supervisor de ejemplo
  const supervisorPassword = await bcrypt.hash('super123', 10);
  const supervisor = await prisma.user.upsert({
    where: { email: 'encargado@soldeser.com' },
    update: {},
    create: {
      email: 'encargado@soldeser.com',
      passwordHash: supervisorPassword,
      pin: '5678',
      firstName: 'Juan',
      lastName: 'García',
      dni: '12345678B',
      phone: '+34611111111',
      role: 'SUPERVISOR',
      gdprConsent: true,
      gdprConsentDate: new Date(),
      locationConsent: true,
    },
  });
  console.log('✅ Supervisor creado:', supervisor.email);

  // Crear trabajadores de ejemplo
  const workerPassword = await bcrypt.hash('worker123', 10);
  const workers = [
    { email: 'pedro@soldeser.com', firstName: 'Pedro', lastName: 'Martínez', dni: '23456789C', pin: '1111' },
    { email: 'maria@soldeser.com', firstName: 'María', lastName: 'López', dni: '34567890D', pin: '2222' },
    { email: 'carlos@soldeser.com', firstName: 'Carlos', lastName: 'Sánchez', dni: '45678901E', pin: '3333' },
  ];

  for (const w of workers) {
    const worker = await prisma.user.upsert({
      where: { email: w.email },
      update: {},
      create: {
        email: w.email,
        passwordHash: workerPassword,
        pin: w.pin,
        firstName: w.firstName,
        lastName: w.lastName,
        dni: w.dni,
        role: 'WORKER',
        gdprConsent: true,
        gdprConsentDate: new Date(),
        locationConsent: true,
      },
    });
    console.log('✅ Trabajador creado:', worker.email);
  }

  // Crear obras de ejemplo
  const worksites = [
    {
      name: 'Edificio Residencial Plaza Mayor',
      address: 'Calle Mayor 123',
      city: 'Madrid',
      latitude: 40.4168,
      longitude: -3.7038,
      radiusMeters: 150,
    },
    {
      name: 'Centro Comercial Norte',
      address: 'Avenida del Norte 456',
      city: 'Madrid',
      latitude: 40.4500,
      longitude: -3.6900,
      radiusMeters: 200,
    },
    {
      name: 'Reforma Oficinas Castellana',
      address: 'Paseo de la Castellana 789',
      city: 'Madrid',
      latitude: 40.4400,
      longitude: -3.6900,
      radiusMeters: 100,
    },
  ];

  for (const ws of worksites) {
    const worksite = await prisma.worksite.upsert({
      where: { id: ws.name.toLowerCase().replace(/\s/g, '-') },
      update: {},
      create: {
        ...ws,
        startDate: new Date(),
      },
    });
    console.log('✅ Obra creada:', worksite.name);
  }

  console.log('');
  console.log('🎉 Seed completado!');
  console.log('');
  console.log('📋 Credenciales de prueba:');
  console.log('   Admin:      admin@soldeser.com / admin123 (PIN: 1234)');
  console.log('   Supervisor: encargado@soldeser.com / super123 (PIN: 5678)');
  console.log('   Trabajador: pedro@soldeser.com / worker123 (PIN: 1111)');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
