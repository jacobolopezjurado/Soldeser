#!/bin/sh
# Deploy script that handles Prisma migration issues
# Run from backend directory with DATABASE_URL set

set -e

echo "Running Prisma migrations..."
set +e
DEPLOY_OUTPUT=$(npx prisma migrate deploy 2>&1)
DEPLOY_EXIT=$?
set -e

if [ $DEPLOY_EXIT -ne 0 ]; then
  if echo "$DEPLOY_OUTPUT" | grep -q "P3005"; then
    echo "Database already has schema (P3005). Baselining..."
    npx prisma migrate resolve --applied "20260123173258_init"
    echo "Baseline complete. Running migrate deploy..."
    npx prisma migrate deploy
  elif echo "$DEPLOY_OUTPUT" | grep -q "P3018" && echo "$DEPLOY_OUTPUT" | grep -q "payslips"; then
    echo "Table payslips already exists (P3018). Marking migration as applied..."
    npx prisma migrate resolve --applied "20260208120000_add_payslips"
    echo "Resolved. Running migrate deploy..."
    npx prisma migrate deploy
  else
    echo "$DEPLOY_OUTPUT"
    exit $DEPLOY_EXIT
  fi
else
  echo "$DEPLOY_OUTPUT"
fi
