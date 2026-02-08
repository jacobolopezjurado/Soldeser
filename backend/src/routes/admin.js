const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/active-workers
 * Obtener trabajadores actualmente fichados (en jornada) con su ubicación
 */
router.get(
  '/active-workers',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  asyncHandler(async (req, res) => {
    // Obtener el último fichaje de cada usuario
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'WORKER',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
        email: true,
        phone: true,
      },
    });

    const activeWorkers = [];

    for (const user of users) {
      const lastClock = await prisma.clockRecord.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
        include: {
          worksite: {
            select: { id: true, name: true, address: true },
          },
        },
      });

      // Solo incluir si está "fichado" (último registro es CLOCK_IN)
      if (lastClock && lastClock.type === 'CLOCK_IN') {
        const hoursWorked = (Date.now() - new Date(lastClock.timestamp).getTime()) / (1000 * 60 * 60);
        
        activeWorkers.push({
          user,
          clockedInAt: lastClock.timestamp,
          hoursWorked: hoursWorked.toFixed(2),
          location: {
            latitude: lastClock.latitude,
            longitude: lastClock.longitude,
            accuracy: lastClock.accuracy,
          },
          worksite: lastClock.worksite,
          isWithinGeofence: lastClock.isWithinGeofence,
          distanceFromSite: lastClock.distanceFromSite,
        });
      }
    }

    res.json({
      count: activeWorkers.length,
      workers: activeWorkers,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/admin/dashboard
 * Estadísticas generales para el dashboard del admin
 */
router.get(
  '/dashboard',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Conteos generales
    const [
      totalUsers,
      totalWorkers,
      totalWorksites,
      todayClocks,
      weekClocks,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true, role: 'WORKER' } }),
      prisma.worksite.count({ where: { isActive: true } }),
      prisma.clockRecord.count({
        where: { timestamp: { gte: today, lt: tomorrow } },
      }),
      prisma.clockRecord.count({
        where: { timestamp: { gte: weekAgo } },
      }),
    ]);

    // Trabajadores activos ahora
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'WORKER' },
      select: { id: true },
    });

    let activeNow = 0;
    for (const user of users) {
      const lastClock = await prisma.clockRecord.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });
      if (lastClock && lastClock.type === 'CLOCK_IN') {
        activeNow++;
      }
    }

    // Fichajes fuera de zona hoy
    const outsideGeofenceToday = await prisma.clockRecord.count({
      where: {
        timestamp: { gte: today, lt: tomorrow },
        isWithinGeofence: false,
      },
    });

    // Últimos fichajes
    const recentClocks = await prisma.clockRecord.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
        worksite: { select: { name: true } },
      },
    });

    res.json({
      stats: {
        totalUsers,
        totalWorkers,
        totalWorksites,
        activeNow,
        todayClocks,
        weekClocks,
        outsideGeofenceToday,
      },
      recentActivity: recentClocks.map(c => ({
        id: c.id,
        type: c.type,
        timestamp: c.timestamp,
        worker: `${c.user.firstName} ${c.user.lastName}`,
        worksite: c.worksite?.name || 'Sin asignar',
        isWithinGeofence: c.isWithinGeofence,
      })),
      generatedAt: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/admin/worker-locations
 * Ubicación actual de todos los trabajadores activos (para mapa)
 */
router.get(
  '/worker-locations',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: 'WORKER' },
      select: { id: true, firstName: true, lastName: true },
    });

    const locations = [];

    for (const user of users) {
      const lastClock = await prisma.clockRecord.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
        include: {
          worksite: { select: { name: true, latitude: true, longitude: true, radiusMeters: true } },
        },
      });

      // Solo si está fichado (CLOCK_IN) y tiene ubicación
      if (lastClock && lastClock.type === 'CLOCK_IN' && lastClock.latitude && lastClock.longitude) {
        locations.push({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          latitude: lastClock.latitude,
          longitude: lastClock.longitude,
          clockedInAt: lastClock.timestamp,
          worksite: lastClock.worksite,
          isWithinGeofence: lastClock.isWithinGeofence,
        });
      }
    }

    res.json({ locations });
  })
);

/**
 * GET /api/admin/attendance-report
 * Reporte de asistencia por fecha
 */
router.get(
  '/attendance-report',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    query('date').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Todos los trabajadores activos
    const workers = await prisma.user.findMany({
      where: { isActive: true, role: 'WORKER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dni: true,
      },
    });

    const attendance = [];

    for (const worker of workers) {
      const dayRecords = await prisma.clockRecord.findMany({
        where: {
          userId: worker.id,
          timestamp: { gte: date, lt: nextDay },
        },
        orderBy: { timestamp: 'asc' },
        include: {
          worksite: { select: { name: true } },
        },
      });

      // Calcular horas trabajadas
      let totalMinutes = 0;
      for (let i = 0; i < dayRecords.length; i++) {
        if (dayRecords[i].type === 'CLOCK_IN') {
          const clockOut = dayRecords.find((r, idx) => idx > i && r.type === 'CLOCK_OUT');
          if (clockOut) {
            totalMinutes += (new Date(clockOut.timestamp) - new Date(dayRecords[i].timestamp)) / (1000 * 60);
          }
        }
      }

      const firstIn = dayRecords.find(r => r.type === 'CLOCK_IN');
      const lastOut = [...dayRecords].reverse().find(r => r.type === 'CLOCK_OUT');

      attendance.push({
        worker,
        present: dayRecords.length > 0,
        firstEntry: firstIn?.timestamp || null,
        lastExit: lastOut?.timestamp || null,
        hoursWorked: (totalMinutes / 60).toFixed(2),
        records: dayRecords.length,
        worksite: firstIn?.worksite?.name || null,
      });
    }

    res.json({
      date: date.toISOString().split('T')[0],
      totalWorkers: workers.length,
      presentCount: attendance.filter(a => a.present).length,
      absentCount: attendance.filter(a => !a.present).length,
      attendance,
    });
  })
);

/**
 * GET /api/admin/payslips
 * Listar todas las nóminas subidas (solo admin)
 */
router.get(
  '/payslips',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  asyncHandler(async (req, res) => {
    const payslips = await prisma.payslip.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dni: true,
          },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({
      payslips,
      total: payslips.length,
    });
  })
);

module.exports = router;
