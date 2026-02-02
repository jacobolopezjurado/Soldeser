const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken } = require('../utils/jwt');

const prisma = new PrismaClient();

/**
 * Intenta verificar el token como JWT de Supabase
 * @returns {Object|null} Usuario si es token Supabase válido, null si no
 */
const verifySupabaseToken = async (token) => {
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!supabaseJwtSecret) return null;

  try {
    const decoded = jwt.verify(token, supabaseJwtSecret, {
      algorithms: ['HS256'],
    });
    const email = decoded.email;
    if (!email) return null;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        gdprConsent: true,
        locationConsent: true,
      },
    });
    return user;
  } catch {
    return null;
  }
};

/**
 * Middleware de autenticación JWT (Soldeser o Supabase)
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticación requerido',
        code: 'AUTH_REQUIRED',
      });
    }

    const token = authHeader.split(' ')[1];

    // 1. Intentar como token Supabase
    const supabaseUser = await verifySupabaseToken(token);
    if (supabaseUser) {
      if (!supabaseUser.isActive) {
        return res.status(403).json({
          error: 'Cuenta desactivada. Contacta con administración.',
          code: 'ACCOUNT_DISABLED',
        });
      }
      req.user = supabaseUser;
      req.token = token;
      return next();
    }

    // 2. Intentar como token Soldeser (JWT propio)
    try {
      const decoded = verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          gdprConsent: true,
          locationConsent: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          error: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND',
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          error: 'Cuenta desactivada. Contacta con administración.',
          code: 'ACCOUNT_DISABLED',
        });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        error: 'Token inválido',
        code: 'INVALID_TOKEN',
      });
    }
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ error: 'Error de autenticación' });
  }
};

/**
 * Middleware para verificar roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'No tienes permiso para esta acción',
        code: 'FORBIDDEN' 
      });
    }
    
    next();
  };
};

/**
 * Middleware para verificar consentimiento RGPD
 */
const requireGdprConsent = (req, res, next) => {
  if (!req.user.gdprConsent) {
    return res.status(403).json({
      error: 'Debes aceptar los términos RGPD para continuar',
      code: 'GDPR_CONSENT_REQUIRED',
    });
  }
  next();
};

/**
 * Middleware para verificar consentimiento de localización
 */
const requireLocationConsent = (req, res, next) => {
  if (!req.user.locationConsent) {
    return res.status(403).json({
      error: 'Debes aceptar el uso de localización para fichar',
      code: 'LOCATION_CONSENT_REQUIRED',
    });
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  requireGdprConsent,
  requireLocationConsent,
};
