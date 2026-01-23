const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT
 * @param {Object} payload - Datos a incluir en el token
 * @returns {string} Token JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
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
  return jwt.verify(token, process.env.JWT_SECRET);
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
