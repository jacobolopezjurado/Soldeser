const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Middleware de autenticación JWT
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autenticación requerido',
        code: 'AUTH_REQUIRED' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verificar que el usuario existe y está activo
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
          code: 'USER_NOT_FOUND' 
        });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ 
          error: 'Cuenta desactivada. Contacta con administración.',
          code: 'ACCOUNT_DISABLED' 
        });
      }
      
      req.user = user;
      req.token = token;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED' 
        });
      }
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN' 
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
