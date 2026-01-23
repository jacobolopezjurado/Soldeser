const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireGdprConsent } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { isWithinGeofence } = require('../utils/geo');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/sync/clock-records
 * Sincronizar fichajes almacenados offline
 */
router.post(
  '/clock-records',
  authenticate,
  requireGdprConsent,
  [
    body('records').isArray({ min: 1 }),
    body('records.*.deviceRecordId').notEmpty(),
    body('records.*.type').isIn(['CLOCK_IN', 'CLOCK_OUT']),
    body('records.*.timestamp').isISO8601(),
    body('records.*.latitude').isFloat({ min: -90, max: 90 }),
    body('records.*.longitude').isFloat({ min: -180, max: 180 }),
    body('records.*.accuracy').optional().isFloat({ min: 0 }),
    body('records.*.deviceInfo').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { records } = req.body;
    const results = {
      synced: [],
      duplicates: [],
      errors: [],
    };

    // Obtener obras asignadas al usuario
    const assignments = await prisma.worksiteAssignment.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      include: { worksite: true },
    });
    const worksites = assignments.map(a => a.worksite).filter(w => w.isActive);

    for (const record of records) {
      try {
        // Verificar si ya existe (evitar duplicados)
        const existing = await prisma.clockRecord.findUnique({
          where: { deviceRecordId: record.deviceRecordId },
        });

        if (existing) {
          results.duplicates.push({
            deviceRecordId: record.deviceRecordId,
            existingId: existing.id,
          });
          continue;
        }

        // Encontrar obra más cercana
        let nearestWorksite = null;
        let geofenceResult = null;

        if (worksites.length > 0) {
          let minDistance = Infinity;
          for (const ws of worksites) {
            const check = isWithinGeofence(
              { latitude: record.latitude, longitude: record.longitude },
              ws
            );
            if (check.distance < minDistance) {
              minDistance = check.distance;
              nearestWorksite = ws;
              geofenceResult = check;
            }
          }
        }

        // Crear registro
        const created = await prisma.clockRecord.create({
          data: {
            userId: req.user.id,
            worksiteId: nearestWorksite?.id,
            deviceRecordId: record.deviceRecordId,
            type: record.type,
            timestamp: new Date(record.timestamp),
            latitude: record.latitude,
            longitude: record.longitude,
            accuracy: record.accuracy,
            isWithinGeofence: geofenceResult?.isWithin ?? null,
            distanceFromSite: geofenceResult?.distance ?? null,
            deviceInfo: record.deviceInfo,
            syncStatus: 'SYNCED',
            syncedAt: new Date(),
          },
        });

        results.synced.push({
          deviceRecordId: record.deviceRecordId,
          serverId: created.id,
          worksiteId: nearestWorksite?.id,
          worksiteName: nearestWorksite?.name,
        });

      } catch (error) {
        results.errors.push({
          deviceRecordId: record.deviceRecordId,
          error: error.message,
        });
      }
    }

    res.json({
      message: `Sincronización completada: ${results.synced.length} nuevos, ${results.duplicates.length} duplicados, ${results.errors.length} errores`,
      results,
    });
  })
);

/**
 * GET /api/sync/status
 * Obtener estado de sincronización y últimos datos
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  // Último fichaje del usuario
  const lastRecord = await prisma.clockRecord.findFirst({
    where: { userId: req.user.id },
    orderBy: { timestamp: 'desc' },
    include: {
      worksite: {
        select: { id: true, name: true },
      },
    },
  });

  // Obras asignadas
  const assignments = await prisma.worksiteAssignment.findMany({
    where: {
      userId: req.user.id,
      isActive: true,
    },
    include: {
      worksite: true,
    },
  });

  const worksites = assignments
    .map(a => a.worksite)
    .filter(w => w.isActive)
    .map(w => ({
      id: w.id,
      name: w.name,
      address: w.address,
      city: w.city,
      latitude: w.latitude,
      longitude: w.longitude,
      radiusMeters: w.radiusMeters,
    }));

  // Fichajes pendientes de sincronizar (si los hubiera en el servidor)
  const pendingCount = await prisma.clockRecord.count({
    where: {
      userId: req.user.id,
      syncStatus: 'PENDING',
    },
  });

  res.json({
    serverTime: new Date().toISOString(),
    lastRecord,
    worksites,
    pendingSyncCount: pendingCount,
    user: {
      id: req.user.id,
      role: req.user.role,
      gdprConsent: req.user.gdprConsent,
      locationConsent: req.user.locationConsent,
    },
  });
}));

/**
 * GET /api/sync/worksites
 * Descargar obras para modo offline
 */
router.get('/worksites', authenticate, asyncHandler(async (req, res) => {
  let worksites;

  if (req.user.role === 'WORKER') {
    // Solo obras asignadas
    const assignments = await prisma.worksiteAssignment.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      include: { worksite: true },
    });
    worksites = assignments.map(a => a.worksite).filter(w => w.isActive);
  } else {
    // Admin/Supervisor: todas las obras activas
    worksites = await prisma.worksite.findMany({
      where: { isActive: true },
    });
  }

  res.json({
    worksites: worksites.map(w => ({
      id: w.id,
      name: w.name,
      address: w.address,
      city: w.city,
      latitude: w.latitude,
      longitude: w.longitude,
      radiusMeters: w.radiusMeters,
    })),
    syncedAt: new Date().toISOString(),
  });
}));

module.exports = router;
