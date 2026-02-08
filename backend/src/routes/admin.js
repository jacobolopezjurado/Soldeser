const express = require('express');
const { query, param, validationResult } = require('express-validator');
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
 * GET /api/admin/charts-data
 * Datos agregados para gráficas (últimos 7 días)
 */
router.get(
  '/charts-data',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const clocksByDay = [];
    const hoursByWorksite = {};
    let outsideGeofenceCount = 0;

    for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayClocks = await prisma.clockRecord.findMany({
        where: { timestamp: { gte: dayStart, lt: dayEnd } },
        include: { worksite: { select: { name: true } } },
      });

      let dayHours = 0;
      const inRecords = dayClocks.filter(r => r.type === 'CLOCK_IN');
      for (const inR of inRecords) {
        const outR = dayClocks.find(r => r.type === 'CLOCK_OUT' && r.userId === inR.userId && new Date(r.timestamp) > new Date(inR.timestamp));
        if (outR) {
          dayHours += (new Date(outR.timestamp) - new Date(inR.timestamp)) / (1000 * 60 * 60);
          const wsName = inR.worksite?.name || 'Sin obra';
          hoursByWorksite[wsName] = (hoursByWorksite[wsName] || 0) + (new Date(outR.timestamp) - new Date(inR.timestamp)) / (1000 * 60 * 60);
        }
      }

      const outside = dayClocks.filter(r => r.isWithinGeofence === false).length;
      outsideGeofenceCount += outside;

      clocksByDay.push({
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        clockCount: dayClocks.length,
        hours: Math.round(dayHours * 10) / 10,
      });
    }

    const worksiteData = Object.entries(hoursByWorksite).map(([name, hours]) => ({
      label: name,
      value: Math.round(hours * 10) / 10,
    })).sort((a, b) => b.value - a.value);

    const workers = await prisma.user.findMany({
      where: { isActive: true, role: 'WORKER' },
      select: { id: true, firstName: true, lastName: true },
    });

    const workerHours = [];
    const weekStart = new Date(sevenDaysAgo);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 1);

    for (const w of workers) {
      const records = await prisma.clockRecord.findMany({
        where: {
          userId: w.id,
          timestamp: { gte: weekStart, lt: weekEnd },
        },
        orderBy: { timestamp: 'asc' },
      });
      let totalMinutes = 0;
      for (let i = 0; i < records.length; i++) {
        if (records[i].type === 'CLOCK_IN') {
          const out = records.find((r, j) => j > i && r.type === 'CLOCK_OUT');
          if (out) totalMinutes += (new Date(out.timestamp) - new Date(records[i].timestamp)) / (1000 * 60);
        }
      }
      workerHours.push({
        label: `${w.firstName} ${w.lastName?.charAt(0) || ''}.`,
        value: Math.round((totalMinutes / 60) * 10) / 10,
      });
    }
    workerHours.sort((a, b) => b.value - a.value);

    res.json({
      clocksByDay,
      hoursByWorksite: worksiteData,
      workerHours,
      outsideGeofenceCount,
    });
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

/**
 * DELETE /api/admin/payslips/:id
 * Eliminar nómina (solo admin/supervisor)
 */
router.delete(
  '/payslips/:id',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payslip = await prisma.payslip.findUnique({ where: { id } });
    if (!payslip) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }
    await prisma.payslip.delete({ where: { id } });
    res.json({ message: 'Nómina eliminada' });
  })
);

module.exports = router;
