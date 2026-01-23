const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Opciones de seguridad para JWT
const JWT_OPTIONS = {
  issuer: 'soldeser-api',
  audience: 'soldeser-app',
  algorithm: 'HS256',
};

/**
 * Genera un ID único para el token
 */
const generateTokenId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Genera un token JWT
 * @param {Object} payload - Datos a incluir en el token
 * @returns {string} Token JWT
 */
const generateToken = (payload) => {
  return jwt.sign(
    {
      ...payload,
      jti: generateTokenId(), // ID único del token
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: JWT_OPTIONS.issuer,
      audience: JWT_OPTIONS.audience,
      algorithm: JWT_OPTIONS.algorithm,
    }
  );
};

/**
 * Genera un token de acceso para un usuario
 * @param {Object} user - Usuario de la base de datos
 * @returns {Object} { token, expiresAt }
 */
const generateUserToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    // No incluir datos sensibles en el token
  };

  const token = generateToken(payload);
  
  // Calcular fecha de expiración
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  return { token, expiresAt };
};

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token a verificar
 * @returns {Object} Payload decodificado
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: JWT_OPTIONS.issuer,
    audience: JWT_OPTIONS.audience,
    algorithms: [JWT_OPTIONS.algorithm],
  });
};

/**
 * Decodifica un token sin verificar (útil para tokens expirados)
 * @param {string} token - Token a decodificar
 * @returns {Object} Payload decodificado
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  generateUserToken,
  verifyToken,
  decodeToken,
};
