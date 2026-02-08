const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit, AuditActions } = require('../middleware/audit');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/users
 * Listar usuarios (solo admin/supervisor)
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    query('role').optional().isIn(['ADMIN', 'SUPERVISOR', 'WORKER']),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const { role, isActive, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    
    if (role) where.role = role;
    if (typeof isActive !== 'undefined') where.isActive = isActive === 'true';
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { dni: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Supervisores solo ven trabajadores
    if (req.user.role === 'SUPERVISOR') {
      where.role = 'WORKER';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          dni: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { lastName: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

/**
 * GET /api/users/:id
 * Obtener usuario por ID
 */
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dni: true,
        phone: true,
        role: true,
        isActive: true,
        gdprConsent: true,
        gdprConsentDate: true,
        locationConsent: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          where: { isActive: true },
          include: {
            worksite: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Supervisores solo pueden ver trabajadores
    if (req.user.role === 'SUPERVISOR' && user.role !== 'WORKER') {
      return res.status(403).json({ error: 'Sin permiso para ver este usuario' });
    }

    await logAudit({
      userId: req.user.id,
      action: AuditActions.USER_VIEW,
      resource: 'user',
      resourceId: user.id,
      req,
    });

    res.json({ user });
  })
);

/**
 * POST /api/users
 * Crear nuevo usuario (solo admin)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 8 }),
    body('pin').optional().isLength({ min: 4, max: 6 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('dni').notEmpty().trim().toUpperCase(),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('es-ES'),
    body('role').optional().isIn(['ADMIN', 'SUPERVISOR', 'WORKER']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, pin, firstName, lastName, dni, phone, role = 'WORKER' } = req.body;

    // Hash de contraseña si se proporciona
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        pin: pin || null,
        firstName,
        lastName,
        dni: dni.toUpperCase(),
        phone: phone || null,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dni: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.USER_CREATE,
      resource: 'user',
      resourceId: user.id,
      details: { email, role },
      req,
    });

    res.status(201).json({ 
      message: 'Usuario creado correctamente',
      user,
    });
  })
);

/**
 * PUT /api/users/:id
 * Actualizar usuario
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  [
    param('id').isUUID(),
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 8 }),
    body('pin').optional().isLength({ min: 4, max: 6 }),
    body('firstName').optional().notEmpty().trim(),
    body('lastName').optional().notEmpty().trim(),
    body('phone').optional(),
    body('role').optional().isIn(['ADMIN', 'SUPERVISOR', 'WORKER']),
    body('isActive').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password, ...updateData } = req.body;

    // No permitir modificar DNI
    delete updateData.dni;

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        dni: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.USER_UPDATE,
      resource: 'user',
      resourceId: user.id,
      details: { updatedFields: Object.keys(req.body) },
      req,
    });

    res.json({ 
      message: 'Usuario actualizado',
      user,
    });
  })
);

/**
 * DELETE /api/users/:id
 * Eliminar usuario permanentemente
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    // No permitir auto-eliminación
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    try {
      await prisma.user.delete({
        where: { id: req.params.id },
      });
    } catch (prismaErr) {
      console.error('Error borrando usuario:', prismaErr.code, prismaErr.message);
      if (prismaErr.code === 'P2003') {
        return res.status(400).json({ error: 'No se puede eliminar: tiene registros vinculados. Contacta con soporte.' });
      }
      throw prismaErr;
    }

    await logAudit({
      userId: req.user.id,
      action: AuditActions.USER_DELETE,
      resource: 'user',
      resourceId: req.params.id,
      req,
    });

    res.json({ message: 'Usuario eliminado' });
  })
);

/**
 * GET /api/users/:id/clock-records
 * Historial de fichajes de un usuario (admin/supervisor)
 */
router.get(
  '/:id/clock-records',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    param('id').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    const where = { userId: req.params.id };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const records = await prisma.clockRecord.findMany({
      where,
      include: {
        worksite: {
          select: { id: true, name: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.DATA_ACCESS,
      resource: 'clock_records',
      resourceId: req.params.id,
      details: { targetUserId: req.params.id },
      req,
    });

    res.json({ records });
  })
);

/**
 * POST /api/users/:id/assign-worksite
 * Asignar trabajador a obra
 */
router.post(
  '/:id/assign-worksite',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    param('id').isUUID(),
    body('worksiteId').isUUID(),
    body('startDate').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { worksiteId, startDate } = req.body;

    const assignment = await prisma.worksiteAssignment.create({
      data: {
        userId: req.params.id,
        worksiteId,
        startDate: startDate ? new Date(startDate) : new Date(),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        worksite: { select: { name: true } },
      },
    });

    res.status(201).json({
      message: `${assignment.user.firstName} asignado a ${assignment.worksite.name}`,
      assignment,
    });
  })
);

module.exports = router;
