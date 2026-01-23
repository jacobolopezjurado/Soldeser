require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const clockRoutes = require('./routes/clock');
const worksitesRoutes = require('./routes/worksites');
const syncRoutes = require('./routes/sync');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');
const { sanitizeBody, securityHeaders, detectAttacks } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (necesario para Render/Railway)
app.set('trust proxy', 1);

// Seguridad - Headers HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
  },
}));

// CORS - Apps móviles pueden conectar desde cualquier origen
app.use(cors({
  origin: '*', // Las apps móviles no tienen origen fijo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por ventana
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limiting estricto para login (prevenir fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos de login
  message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar logins exitosos
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/login-pin', loginLimiter);

// Parsing
app.use(express.json({ limit: '1mb' })); // Reducido para prevenir DoS
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Seguridad adicional
app.use(securityHeaders);
app.use(sanitizeBody);
app.use(detectAttacks);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Soldeser API',
    version: '1.0.0'
  });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clock', clockRoutes);
app.use('/api/worksites', worksitesRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.json({
    message: '🏗️ Soldeser API - Sistema de Fichaje para Construcción',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health',
  });
});

// Manejo de errores
app.use(errorHandler);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏗️  SOLDESER API - Sistema de Fichaje                   ║
║                                                           ║
║   Servidor corriendo en: http://localhost:${PORT}            ║
║   Entorno: ${process.env.NODE_ENV || 'development'}                               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
