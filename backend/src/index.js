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

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (necesario para Render/Railway)
app.set('trust proxy', 1);

// Seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-dominio.com'] 
    : '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde' },
});
app.use('/api/', limiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
