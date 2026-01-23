/**
 * Middleware centralizado de manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Error de Prisma - Registro no encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro no encontrado',
      code: 'NOT_FOUND',
    });
  }

  // Error de Prisma - Violación de constraint único
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'campo';
    return res.status(409).json({
      error: `El ${field} ya existe`,
      code: 'DUPLICATE_ENTRY',
      field,
    });
  }

  // Error de Prisma - Violación de clave foránea
  if (err.code === 'P2003') {
    return res.status(400).json({
      error: 'Referencia inválida a otro registro',
      code: 'INVALID_REFERENCE',
    });
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
  }

  // Error de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      code: 'INVALID_JSON',
    });
  }

  // Error genérico
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * Wrapper para manejar errores async automáticamente
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
};
