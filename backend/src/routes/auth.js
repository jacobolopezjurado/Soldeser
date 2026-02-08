const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { generateUserToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit, AuditActions } = require('../middleware/audit');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/auth/login
 * Login con email y contraseña
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      await logAudit({
        action: AuditActions.LOGIN_FAILED,
        details: { email, reason: 'user_not_found' },
        req,
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.isActive === false) {
      await logAudit({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        details: { reason: 'account_disabled' },
        req,
      });
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      await logAudit({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        details: { reason: 'invalid_password' },
        req,
      });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const { token, expiresAt } = generateUserToken(user);

    await logAudit({
      userId: user.id,
      action: AuditActions.LOGIN,
      details: { method: 'email_password' },
      req,
    });

    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gdprConsent: user.gdprConsent,
        locationConsent: user.locationConsent,
      },
    });
  })
);

/**
 * POST /api/auth/login-pin
 * Login rápido con PIN (para fichaje en obra)
 */
router.post(
  '/login-pin',
  [
    body('dni').notEmpty().withMessage('DNI requerido'),
    body('pin').isLength({ min: 4, max: 6 }).withMessage('PIN de 4-6 dígitos'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dni, pin } = req.body;

    const user = await prisma.user.findUnique({
      where: { dni: dni.toUpperCase() },
    });

    if (!user || user.pin !== pin) {
      await logAudit({
        action: AuditActions.LOGIN_FAILED,
        details: { dni, reason: 'invalid_pin' },
        req,
      });
      return res.status(401).json({ error: 'DNI o PIN inválido' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    const { token, expiresAt } = generateUserToken(user);

    await logAudit({
      userId: user.id,
      action: AuditActions.LOGIN,
      details: { method: 'pin' },
      req,
    });

    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gdprConsent: user.gdprConsent,
        locationConsent: user.locationConsent,
      },
    });
  })
);

/**
 * POST /api/auth/supabase
 * Login/registro con Supabase Auth (verifica JWT de Supabase)
 */
router.post(
  '/supabase',
  [
    body('accessToken').notEmpty().withMessage('Token de Supabase requerido'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { accessToken, userData } = req.body;
    const supabaseUid = userData?.id || userData?.sub;
    const email = userData?.email;

    if (!email) {
      return res.status(400).json({ error: 'Email requerido de Supabase' });
    }

    // TODO: Verificar accessToken con Supabase (createClient().auth.getUser(accessToken))
    // Por ahora confiamos en los datos enviados desde el cliente autenticado

    let user = null;
    if (supabaseUid) {
      user = await prisma.user.findUnique({
        where: { supabaseUid },
      });
    }
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email },
      });
      if (user && supabaseUid) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { supabaseUid },
        });
      }
    }

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no registrado. Contacta con administración.',
        code: 'USER_NOT_REGISTERED',
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    const { token, expiresAt } = generateUserToken(user);

    await logAudit({
      userId: user.id,
      action: AuditActions.LOGIN,
      details: { method: 'supabase' },
      req,
    });

    res.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        gdprConsent: user.gdprConsent,
        locationConsent: user.locationConsent,
      },
    });
  })
);

/**
 * GET /api/auth/me
 * Obtener usuario actual
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      dni: true,
      phone: true,
      role: true,
      gdprConsent: true,
      gdprConsentDate: true,
      locationConsent: true,
      createdAt: true,
    },
  });

  res.json({ user });
}));

/**
 * POST /api/auth/consent
 * Actualizar consentimientos RGPD
 */
router.post(
  '/consent',
  authenticate,
  [
    body('gdprConsent').optional().isBoolean(),
    body('locationConsent').optional().isBoolean(),
  ],
  asyncHandler(async (req, res) => {
    const { gdprConsent, locationConsent } = req.body;
    
    const updateData = {};
    
    if (typeof gdprConsent === 'boolean') {
      updateData.gdprConsent = gdprConsent;
      if (gdprConsent) {
        updateData.gdprConsentDate = new Date();
      }
    }
    
    if (typeof locationConsent === 'boolean') {
      updateData.locationConsent = locationConsent;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        gdprConsent: true,
        gdprConsentDate: true,
        locationConsent: true,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.CONSENT_UPDATE,
      details: { gdprConsent, locationConsent },
      req,
    });

    res.json({ 
      message: 'Consentimientos actualizados',
      user,
    });
  })
);

/**
 * POST /api/auth/change-password
 * Cambiar contraseña
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Nueva contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('La contraseña debe contener mayúsculas, minúsculas y números'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user.passwordHash) {
      return res.status(400).json({ 
        error: 'Usuario sin contraseña configurada (usa Supabase)' 
      });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.PASSWORD_CHANGE,
      req,
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  })
);

/**
 * POST /api/auth/logout
 * Logout (principalmente para auditoría)
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await logAudit({
    userId: req.user.id,
    action: AuditActions.LOGOUT,
    req,
  });

  res.json({ message: 'Sesión cerrada' });
}));

module.exports = router;
