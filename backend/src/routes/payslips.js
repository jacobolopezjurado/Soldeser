const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Configurar multer para subir nóminas
const uploadDir = path.join(__dirname, '../../uploads/payslips');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP, HEIC)'), false);
    }
  },
});

/**
 * POST /api/payslips/upload
 * Subir foto de nómina (cualquier usuario autenticado)
 */
router.post(
  '/upload',
  authenticate,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'La imagen es demasiado grande (máx. 10MB)', code: 'FILE_TOO_LARGE' });
        }
        if (err.message?.includes('Solo se permiten')) {
          return res.status(400).json({ error: err.message, code: 'INVALID_FILE_TYPE' });
        }
        return next(err);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'Debes subir una imagen',
        code: 'NO_FILE',
      });
    }

    const assignedToUserId = req.body?.assignedToUserId || req.body?.userId;
    const isAdmin = ['ADMIN', 'SUPERVISOR'].includes(req.user.role);

    let userId = req.user.id;
    if (assignedToUserId) {
      if (!isAdmin) {
        return res.status(403).json({ error: 'Solo administradores pueden asignar nóminas a otras personas', code: 'FORBIDDEN' });
      }
      const targetUser = await prisma.user.findUnique({ where: { id: assignedToUserId, isActive: true } });
      if (!targetUser) {
        return res.status(400).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' });
      }
      userId = assignedToUserId;
    }

    const baseUrl = process.env.API_BASE_URL || `${req.protocol || 'https'}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/api/payslips/files/${req.file.filename}`;

    const payslip = await prisma.payslip.create({
      data: {
        userId,
        uploadedById: req.user.id,
        fileName: req.file.originalname || req.file.filename,
        fileUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json({
      id: payslip.id,
      fileName: payslip.fileName,
      fileUrl: payslip.fileUrl,
      createdAt: payslip.createdAt,
      user: payslip.user,
      uploadedBy: payslip.uploadedBy,
    });
  })
);

/**
 * GET /api/payslips
 * Listar nóminas: trabajadores ven las suyas, admin ve todas
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const isAdmin = ['ADMIN', 'SUPERVISOR'].includes(req.user.role);

    const where = isAdmin ? {} : { userId: req.user.id };

    const payslips = await prisma.payslip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json({ payslips, total: payslips.length });
  })
);

/**
 * GET /api/payslips/files/:filename
 * Servir archivo de nómina
 */
router.get('/files/:filename', (req, res) => {
  const fs = require('fs');
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  res.sendFile(path.resolve(filePath));
});

module.exports = router;
