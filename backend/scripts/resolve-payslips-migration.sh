#!/bin/sh
# Ejecutar UNA VEZ para resolver P3018 cuando payslips ya existe
# Uso: desde backend/ con DATABASE_URL en .env
#   sh scripts/resolve-payslips-migration.sh

set -e
echo "Marcando migración payslips como aplicada..."
npx prisma migrate resolve --applied "20260208120000_add_payslips"
echo "✓ Hecho. Ahora 'prisma migrate deploy' funcionará."
