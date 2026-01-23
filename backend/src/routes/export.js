const express = require('express');
const { query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit, AuditActions } = require('../middleware/audit');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/export/clock-records/csv
 * Exportar fichajes a CSV (solo admin/supervisor)
 */
router.get(
  '/clock-records/csv',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('userId').optional().isUUID(),
    query('worksiteId').optional().isUUID(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, userId, worksiteId } = req.query;

    // Construir filtros
    const where = {};
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    
    if (userId) where.userId = userId;
    if (worksiteId) where.worksiteId = worksiteId;

    // Si es supervisor, solo puede ver trabajadores asignados a sus obras
    if (req.user.role === 'SUPERVISOR') {
      // Por ahora, supervisores ven todo - se puede restringir más
    }

    const records = await prisma.clockRecord.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            dni: true,
            email: true,
          },
        },
        worksite: {
          select: {
            name: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Generar CSV
    const csvHeaders = [
      'Fecha',
      'Hora',
      'Tipo',
      'Trabajador',
      'DNI',
      'Email',
      'Obra',
      'Dirección',
      'Ciudad',
      'Latitud',
      'Longitud',
      'En Zona',
      'Distancia (m)',
      'Manual',
      'Notas',
    ].join(';');

    const csvRows = records.map(record => {
      const date = new Date(record.timestamp);
      return [
        date.toLocaleDateString('es-ES'),
        date.toLocaleTimeString('es-ES'),
        record.type === 'CLOCK_IN' ? 'Entrada' : 'Salida',
        `${record.user.firstName} ${record.user.lastName}`,
        record.user.dni,
        record.user.email,
        record.worksite?.name || 'Sin asignar',
        record.worksite?.address || '',
        record.worksite?.city || '',
        record.latitude || '',
        record.longitude || '',
        record.isWithinGeofence === true ? 'Sí' : record.isWithinGeofence === false ? 'No' : '',
        record.distanceFromSite || '',
        record.isManual ? 'Sí' : 'No',
        record.notes || '',
      ].join(';');
    });

    const csv = [csvHeaders, ...csvRows].join('\n');

    // Añadir BOM para que Excel interprete bien los acentos
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    await logAudit({
      userId: req.user.id,
      action: AuditActions.DATA_EXPORT,
      resource: 'clock_records',
      details: { 
        recordCount: records.length,
        filters: { startDate, endDate, userId, worksiteId },
      },
      req,
    });

    // Nombre del archivo
    const filename = `fichajes_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvWithBom);
  })
);

/**
 * GET /api/export/clock-records/json
 * Exportar fichajes a JSON (para integraciones)
 */
router.get(
  '/clock-records/json',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('userId').optional().isUUID(),
    query('worksiteId').optional().isUUID(),
  ],
  asyncHandler(async (req, res) => {
    const { startDate, endDate, userId, worksiteId } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    if (userId) where.userId = userId;
    if (worksiteId) where.worksiteId = worksiteId;

    const records = await prisma.clockRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            email: true,
          },
        },
        worksite: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    await logAudit({
      userId: req.user.id,
      action: AuditActions.DATA_EXPORT,
      resource: 'clock_records',
      details: { format: 'json', recordCount: records.length },
      req,
    });

    res.json({
      exportDate: new Date().toISOString(),
      recordCount: records.length,
      records,
    });
  })
);

/**
 * POST /api/export/clock-records/file
 * Guardar CSV en una ruta del servidor (solo admin)
 */
router.post(
  '/clock-records/file',
  authenticate,
  authorize('ADMIN'),
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const { filePath } = req.body;
    const { startDate, endDate } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath es requerido' });
    }

    const where = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const records = await prisma.clockRecord.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, dni: true, email: true },
        },
        worksite: {
          select: { name: true, address: true, city: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Generar CSV
    const csvHeaders = [
      'Fecha', 'Hora', 'Tipo', 'Trabajador', 'DNI', 'Email',
      'Obra', 'Dirección', 'Ciudad', 'Latitud', 'Longitud',
      'En Zona', 'Distancia (m)', 'Manual', 'Notas',
    ].join(';');

    const csvRows = records.map(record => {
      const date = new Date(record.timestamp);
      return [
        date.toLocaleDateString('es-ES'),
        date.toLocaleTimeString('es-ES'),
        record.type === 'CLOCK_IN' ? 'Entrada' : 'Salida',
        `${record.user.firstName} ${record.user.lastName}`,
        record.user.dni,
        record.user.email,
        record.worksite?.name || '',
        record.worksite?.address || '',
        record.worksite?.city || '',
        record.latitude || '',
        record.longitude || '',
        record.isWithinGeofence === true ? 'Sí' : record.isWithinGeofence === false ? 'No' : '',
        record.distanceFromSite || '',
        record.isManual ? 'Sí' : 'No',
        record.notes || '',
      ].join(';');
    });

    const csv = '\uFEFF' + [csvHeaders, ...csvRows].join('\n');

    try {
      fs.writeFileSync(filePath, csv, 'utf8');
      
      await logAudit({
        userId: req.user.id,
        action: AuditActions.DATA_EXPORT,
        resource: 'clock_records',
        details: { filePath, recordCount: records.length },
        req,
      });

      res.json({
        message: 'Archivo exportado correctamente',
        filePath,
        recordCount: records.length,
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Error al guardar el archivo',
        details: error.message,
      });
    }
  })
);

/**
 * GET /api/export/hours-summary/csv
 * Resumen de horas por trabajador
 */
router.get(
  '/hours-summary/csv',
  authenticate,
  authorize('ADMIN', 'SUPERVISOR'),
  [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate } = req.query;

    // Obtener todos los fichajes en el rango
    const records = await prisma.clockRecord.findMany({
      where: {
        timestamp: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, dni: true, email: true },
        },
      },
      orderBy: [{ userId: 'asc' }, { timestamp: 'asc' }],
    });

    // Calcular horas por usuario
    const userHours = {};
    
    for (const record of records) {
      const uid = record.userId;
      if (!userHours[uid]) {
        userHours[uid] = {
          user: record.user,
          totalMinutes: 0,
          sessions: 0,
          days: new Set(),
        };
      }
      
      if (record.type === 'CLOCK_IN') {
        // Buscar el CLOCK_OUT correspondiente
        const clockOut = records.find(
          r => r.userId === uid && 
               r.type === 'CLOCK_OUT' && 
               new Date(r.timestamp) > new Date(record.timestamp)
        );
        
        if (clockOut) {
          const minutes = (new Date(clockOut.timestamp) - new Date(record.timestamp)) / (1000 * 60);
          userHours[uid].totalMinutes += minutes;
          userHours[uid].sessions++;
          userHours[uid].days.add(new Date(record.timestamp).toDateString());
        }
      }
    }

    // Generar CSV
    const csvHeaders = [
      'Trabajador',
      'DNI',
      'Email',
      'Horas Totales',
      'Jornadas',
      'Días Trabajados',
      'Media Horas/Día',
    ].join(';');

    const csvRows = Object.values(userHours).map(data => {
      const hours = (data.totalMinutes / 60).toFixed(2);
      const daysCount = data.days.size;
      const avgHours = daysCount > 0 ? (data.totalMinutes / 60 / daysCount).toFixed(2) : '0';
      
      return [
        `${data.user.firstName} ${data.user.lastName}`,
        data.user.dni,
        data.user.email,
        hours,
        data.sessions,
        daysCount,
        avgHours,
      ].join(';');
    });

    const csv = '\uFEFF' + [csvHeaders, ...csvRows].join('\n');
    const filename = `resumen_horas_${startDate.split('T')[0]}_${endDate.split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  })
);

module.exports = router;
