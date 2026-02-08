const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit, AuditActions } = require('../middleware/audit');
const { isValidCoordinates } = require('../utils/geo');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/worksites
 * Listar obras
 */
router.get(
  '/',
  authenticate,
  [
    query('isActive').optional().isBoolean(),
    query('city').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const { isActive, city } = req.query;

    const where = {};
    if (typeof isActive !== 'undefined') where.isActive = isActive === 'true';
    if (city) where.city = { contains: city, mode: 'insensitive' };

    // Si es trabajador, solo mostrar obras asignadas
    if (req.user.role === 'WORKER') {
      const assignments = await prisma.worksiteAssignment.findMany({
        where: {
          userId: req.user.id,
          isActive: true,
        },
        select: { worksiteId: true },
      });
      where.id = { in: assignments.map(a => a.worksiteId) };
    }

    const worksites = await prisma.worksite.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ worksites });
  })
);

/**
 * GET /api/worksites/:id
 * Obtener obra por ID
 */
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const worksite = await prisma.worksite.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: { clockRecords: true },
        },
      },
    });

    if (!worksite) {
      return res.status(404).json({ error: 'Obra no encontrada' });
    }

    res.json({ worksite });
  })
);

/**
 * POST /api/worksites
 * Crear nueva obra (solo admin)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').notEmpty().trim(),
    body('address').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('radiusMeters').optional().isInt({ min: 10, max: 1000 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, city, latitude, longitude, radiusMeters, startDate, endDate } = req.body;

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ error: 'Coordenadas inválidas' });
    }

    const worksite = await prisma.worksite.create({
      data: {
        name,
        address,
        city,
        latitude,
        longitude,
        radiusMeters: radiusMeters || 100,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.WORKSITE_CREATE,
      resource: 'worksite',
      resourceId: worksite.id,
      details: { name, city },
      req,
    });

    res.status(201).json({
      message: 'Obra creada correctamente',
      worksite,
    });
  })
);

/**
 * PUT /api/worksites/:id
 * Actualizar obra
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  [
    param('id').isUUID(),
    body('name').optional().notEmpty().trim(),
    body('address').optional().notEmpty().trim(),
    body('city').optional().notEmpty().trim(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('radiusMeters').optional().isInt({ min: 10, max: 1000 }),
    body('isActive').optional().isBoolean(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = { ...req.body };
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const worksite = await prisma.worksite.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.WORKSITE_UPDATE,
      resource: 'worksite',
      resourceId: worksite.id,
      details: { updatedFields: Object.keys(req.body) },
      req,
    });

    res.json({
      message: 'Obra actualizada',
      worksite,
    });
  })
);

/**
 * DELETE /api/worksites/:id
 * Eliminar obra permanentemente
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    // Las asignaciones y fichajes se eliminan por cascade
    try {
      await prisma.worksite.delete({
        where: { id: req.params.id },
      });
    } catch (prismaErr) {
      console.error('Error borrando obra:', prismaErr.code, prismaErr.message);
      if (prismaErr.code === 'P2003') {
        return res.status(400).json({ error: 'No se puede eliminar: tiene registros vinculados.' });
      }
      throw prismaErr;
    }

    await logAudit({
      userId: req.user.id,
      action: AuditActions.WORKSITE_DELETE,
      resource: 'worksite',
      resourceId: req.params.id,
      req,
    });

    res.json({ message: 'Obra eliminada' });
  })
);

/**
 * GET /api/worksites/:id/workers
 * Obtener trabajadores asignados a una obra
 */
router.get(
  '/:id/workers',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const assignments = await prisma.worksiteAssignment.findMany({
      where: {
        worksiteId: req.params.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    res.json({
      workers: assignments.map(a => ({
        ...a.user,
        assignedAt: a.startDate,
      })),
    });
  })
);

/**
 * GET /api/worksites/:id/clock-records
 * Fichajes de una obra (hoy por defecto)
 */
router.get(
  '/:id/clock-records',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    param('id').isUUID(),
    query('date').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const records = await prisma.clockRecord.findMany({
      where: {
        worksiteId: req.params.id,
        timestamp: {
          gte: date,
          lt: nextDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    res.json({
      date: date.toISOString().split('T')[0],
      records,
    });
  })
);

module.exports = router;
