const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireGdprConsent, requireLocationConsent } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit, AuditActions } = require('../middleware/audit');
const { isWithinGeofence, findNearestWorksite, isValidCoordinates } = require('../utils/geo');
const { validateSpainCoordinates } = require('../middleware/security');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/clock/in
 * Fichar entrada
 */
router.post(
  '/in',
  authenticate,
  requireGdprConsent,
  requireLocationConsent,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    body('accuracy').optional().isFloat({ min: 0 }),
    body('worksiteId').optional().isUUID(),
    body('deviceRecordId').optional().isString(), // Para sincronización offline
    body('timestamp').optional().isISO8601(), // Para registros offline
    body('deviceInfo').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      latitude, 
      longitude, 
      accuracy, 
      worksiteId, 
      deviceRecordId, 
      timestamp,
      deviceInfo 
    } = req.body;

    // Validar que las coordenadas son razonables (España + Canarias)
    if (!validateSpainCoordinates(latitude, longitude)) {
      console.warn(`⚠️ Coordenadas sospechosas: ${latitude}, ${longitude} - Usuario: ${req.user.id}`);
      // No bloquear, solo advertir (podría haber casos legítimos)
    }

    // Verificar si ya hay un fichaje de entrada sin salida
    const lastClock = await prisma.clockRecord.findFirst({
      where: { userId: req.user.id },
      orderBy: { timestamp: 'desc' },
    });

    if (lastClock && lastClock.type === 'CLOCK_IN') {
      return res.status(400).json({ 
        error: 'Ya has fichado entrada. Debes fichar salida primero.',
        code: 'ALREADY_CLOCKED_IN',
        lastClock,
      });
    }

    // Buscar obra asignada o la más cercana
    let worksite = null;
    let geofenceCheck = null;

    if (worksiteId) {
      worksite = await prisma.worksite.findUnique({
        where: { id: worksiteId, isActive: true },
      });
    }

    if (!worksite) {
      // Buscar obras asignadas al usuario
      const assignments = await prisma.worksiteAssignment.findMany({
        where: {
          userId: req.user.id,
          isActive: true,
        },
        include: { worksite: true },
      });

      const activeWorksites = assignments
        .map(a => a.worksite)
        .filter(w => w.isActive);

      if (activeWorksites.length > 0) {
        const nearest = findNearestWorksite(
          { latitude, longitude },
          activeWorksites
        );
        worksite = nearest;
      }
    }

    // Verificar geofence si hay obra
    if (worksite) {
      geofenceCheck = isWithinGeofence(
        { latitude, longitude },
        worksite
      );
    }

    // Crear registro de fichaje
    const clockRecord = await prisma.clockRecord.create({
      data: {
        userId: req.user.id,
        worksiteId: worksite?.id,
        type: 'CLOCK_IN',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        latitude,
        longitude,
        accuracy,
        isWithinGeofence: geofenceCheck?.isWithin ?? null,
        distanceFromSite: geofenceCheck?.distance ?? null,
        deviceRecordId,
        deviceInfo,
        syncStatus: deviceRecordId ? 'SYNCED' : 'SYNCED',
        syncedAt: new Date(),
      },
      include: {
        worksite: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.CLOCK_IN,
      resource: 'clock_record',
      resourceId: clockRecord.id,
      details: {
        worksiteId: worksite?.id,
        worksiteName: worksite?.name,
        isWithinGeofence: geofenceCheck?.isWithin,
        distance: geofenceCheck?.distance,
        latitude,
        longitude,
      },
      req,
    });

    res.status(201).json({
      message: 'Entrada fichada correctamente',
      clockRecord,
      warnings: geofenceCheck && !geofenceCheck.isWithin ? [
        `Estás a ${geofenceCheck.distance}m de la obra (máximo permitido: ${worksite.radiusMeters}m)`,
      ] : [],
    });
  })
);

/**
 * POST /api/clock/out
 * Fichar salida
 */
router.post(
  '/out',
  authenticate,
  requireGdprConsent,
  requireLocationConsent,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    body('accuracy').optional().isFloat({ min: 0 }),
    body('deviceRecordId').optional().isString(),
    body('timestamp').optional().isISO8601(),
    body('deviceInfo').optional().isString(),
    body('notes').optional().isString().isLength({ max: 500 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      latitude, 
      longitude, 
      accuracy, 
      deviceRecordId, 
      timestamp,
      deviceInfo,
      notes 
    } = req.body;

    // Verificar si hay un fichaje de entrada pendiente
    const lastClock = await prisma.clockRecord.findFirst({
      where: { userId: req.user.id },
      orderBy: { timestamp: 'desc' },
      include: { worksite: true },
    });

    if (!lastClock || lastClock.type === 'CLOCK_OUT') {
      return res.status(400).json({ 
        error: 'No hay entrada fichada. Debes fichar entrada primero.',
        code: 'NOT_CLOCKED_IN',
      });
    }

    // Usar la misma obra que la entrada
    const worksite = lastClock.worksite;
    let geofenceCheck = null;

    if (worksite) {
      geofenceCheck = isWithinGeofence(
        { latitude, longitude },
        worksite
      );
    }

    // Crear registro de fichaje de salida
    const clockRecord = await prisma.clockRecord.create({
      data: {
        userId: req.user.id,
        worksiteId: worksite?.id,
        type: 'CLOCK_OUT',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        latitude,
        longitude,
        accuracy,
        isWithinGeofence: geofenceCheck?.isWithin ?? null,
        distanceFromSite: geofenceCheck?.distance ?? null,
        deviceRecordId,
        deviceInfo,
        notes,
        syncStatus: 'SYNCED',
        syncedAt: new Date(),
      },
      include: {
        worksite: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    // Calcular horas trabajadas
    const entryTime = new Date(lastClock.timestamp);
    const exitTime = new Date(clockRecord.timestamp);
    const hoursWorked = (exitTime - entryTime) / (1000 * 60 * 60);

    await logAudit({
      userId: req.user.id,
      action: AuditActions.CLOCK_OUT,
      resource: 'clock_record',
      resourceId: clockRecord.id,
      details: {
        worksiteId: worksite?.id,
        worksiteName: worksite?.name,
        hoursWorked: hoursWorked.toFixed(2),
        entryRecordId: lastClock.id,
      },
      req,
    });

    res.status(201).json({
      message: 'Salida fichada correctamente',
      clockRecord,
      summary: {
        entryTime: lastClock.timestamp,
        exitTime: clockRecord.timestamp,
        hoursWorked: hoursWorked.toFixed(2),
        worksite: worksite?.name,
      },
    });
  })
);

/**
 * GET /api/clock/status
 * Estado actual del fichaje del usuario
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const lastClock = await prisma.clockRecord.findFirst({
    where: { userId: req.user.id },
    orderBy: { timestamp: 'desc' },
    include: {
      worksite: {
        select: { id: true, name: true, address: true },
      },
    },
  });

  const isClockedIn = lastClock?.type === 'CLOCK_IN';
  
  let currentSession = null;
  if (isClockedIn) {
    const now = new Date();
    const hoursWorked = (now - new Date(lastClock.timestamp)) / (1000 * 60 * 60);
    currentSession = {
      entryTime: lastClock.timestamp,
      hoursWorked: hoursWorked.toFixed(2),
      worksite: lastClock.worksite,
    };
  }

  res.json({
    isClockedIn,
    lastRecord: lastClock,
    currentSession,
  });
}));

/**
 * GET /api/clock/history
 * Historial de fichajes del usuario
 */
router.get(
  '/history',
  authenticate,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.clockRecord.findMany({
        where,
        include: {
          worksite: {
            select: { id: true, name: true, address: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.clockRecord.count({ where }),
    ]);

    // Calcular resumen de horas
    const summary = calculateHoursSummary(records);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      summary,
    });
  })
);

/**
 * GET /api/clock/today
 * Fichajes del día actual
 */
router.get('/today', authenticate, asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await prisma.clockRecord.findMany({
    where: {
      userId: req.user.id,
      timestamp: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      worksite: {
        select: { id: true, name: true },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  const summary = calculateHoursSummary(records);

  res.json({ 
    date: today.toISOString().split('T')[0],
    records, 
    summary,
  });
}));

/**
 * Calcula resumen de horas trabajadas
 */
function calculateHoursSummary(records) {
  let totalHours = 0;
  let sessions = [];
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    if (record.type === 'CLOCK_IN') {
      // Buscar el siguiente CLOCK_OUT
      const clockOut = records.find(
        (r, idx) => idx > i && r.type === 'CLOCK_OUT'
      );
      
      if (clockOut) {
        const hours = (new Date(clockOut.timestamp) - new Date(record.timestamp)) / (1000 * 60 * 60);
        totalHours += hours;
        sessions.push({
          entry: record.timestamp,
          exit: clockOut.timestamp,
          hours: hours.toFixed(2),
          worksite: record.worksite?.name,
        });
      }
    }
  }

  return {
    totalHours: totalHours.toFixed(2),
    sessionsCount: sessions.length,
    sessions,
  };
}

module.exports = router;
