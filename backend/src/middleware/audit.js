const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Registra una acción en el log de auditoría
 * Cumplimiento RGPD - Trazabilidad de acciones
 */
const logAudit = async ({
  userId,
  action,
  resource,
  resourceId,
  details,
  req,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress: req?.ip || req?.connection?.remoteAddress || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (error) {
    // No queremos que un error de auditoría rompa la aplicación
    console.error('Error al registrar auditoría:', error);
  }
};

/**
 * Middleware que registra automáticamente ciertas acciones
 */
const auditMiddleware = (action, resource) => {
  return async (req, res, next) => {
    // Guardar referencia a la función original de res.json
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
      // Solo registrar si la respuesta fue exitosa (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAudit({
          userId: req.user?.id,
          action,
          resource,
          resourceId: req.params?.id || data?.id,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
          req,
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

// Acciones de auditoría predefinidas
const AuditActions = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // Fichaje
  CLOCK_IN: 'CLOCK_IN',
  CLOCK_OUT: 'CLOCK_OUT',
  CLOCK_MANUAL: 'CLOCK_MANUAL',
  
  // Usuarios
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_VIEW: 'USER_VIEW',
  
  // Datos personales (RGPD)
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_DELETE: 'DATA_DELETE',
  CONSENT_UPDATE: 'CONSENT_UPDATE',
  
  // Obras
  WORKSITE_CREATE: 'WORKSITE_CREATE',
  WORKSITE_UPDATE: 'WORKSITE_UPDATE',
  WORKSITE_DELETE: 'WORKSITE_DELETE',
};

module.exports = {
  logAudit,
  auditMiddleware,
  AuditActions,
};
