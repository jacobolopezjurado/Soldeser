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
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP)'), false);
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

    const baseUrl = process.env.API_BASE_URL || `${req.protocol || 'https'}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/api/payslips/files/${req.file.filename}`;

    const payslip = await prisma.payslip.create({
      data: {
        userId: req.user.id,
        fileName: req.file.originalname || req.file.filename,
        fileUrl,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.status(201).json({
      id: payslip.id,
      fileName: payslip.fileName,
      fileUrl: payslip.fileUrl,
      createdAt: payslip.createdAt,
      user: payslip.user,
    });
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
