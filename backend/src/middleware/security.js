/**
 * Middleware de seguridad adicional
 */

/**
 * Sanitiza strings para prevenir XSS básico
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Eliminar < y >
    .trim();
};

/**
 * Middleware para sanitizar body de requests
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(req.body);
  }
  next();
};

/**
 * Middleware para verificar Content-Type en POST/PUT/PATCH
 */
const requireJsonContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      // Permitir requests sin body (logout, etc)
      if (Object.keys(req.body || {}).length > 0) {
        return res.status(415).json({ 
          error: 'Content-Type debe ser application/json' 
        });
      }
    }
  }
  next();
};

/**
 * Middleware para añadir headers de seguridad adicionales
 */
const securityHeaders = (req, res, next) => {
  // Prevenir que el navegador detecte MIME types incorrectamente
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Habilitar XSS filter del navegador
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // No incluir referrer en requests a otros dominios
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Eliminar header que revela tecnología usada
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Validar que coordenadas son razonables para España
 * Latitud España: ~36 a ~44
 * Longitud España: ~-10 a ~5
 */
const validateSpainCoordinates = (lat, lng) => {
  const SPAIN_BOUNDS = {
    minLat: 27.0, // Incluye Canarias
    maxLat: 44.0,
    minLng: -18.5, // Incluye Canarias
    maxLng: 5.0,
  };
  
  return (
    lat >= SPAIN_BOUNDS.minLat &&
    lat <= SPAIN_BOUNDS.maxLat &&
    lng >= SPAIN_BOUNDS.minLng &&
    lng <= SPAIN_BOUNDS.maxLng
  );
};

/**
 * Detectar posibles intentos de inyección SQL (aunque Prisma ya protege)
 */
const detectSqlInjection = (str) => {
  if (typeof str !== 'string') return false;
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  ];
  return sqlPatterns.some(pattern => pattern.test(str));
};

/**
 * Middleware para detectar ataques básicos
 */
const detectAttacks = (req, res, next) => {
  const checkValue = (value, path) => {
    if (typeof value === 'string') {
      if (detectSqlInjection(value)) {
        console.warn(`⚠️ Posible SQL injection detectado en ${path}: ${value.substring(0, 50)}`);
        // No bloquear, solo loguear (Prisma ya protege)
      }
    }
  };
  
  // Revisar body
  const checkObject = (obj, prefix = 'body') => {
    for (const key in obj) {
      const value = obj[key];
      const path = `${prefix}.${key}`;
      if (typeof value === 'object' && value !== null) {
        checkObject(value, path);
      } else {
        checkValue(value, path);
      }
    }
  };
  
  if (req.body) checkObject(req.body);
  
  next();
};

module.exports = {
  sanitizeBody,
  requireJsonContentType,
  securityHeaders,
  validateSpainCoordinates,
  detectSqlInjection,
  detectAttacks,
};
