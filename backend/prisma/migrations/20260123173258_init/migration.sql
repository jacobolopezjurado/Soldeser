-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'WORKER');

-- CreateEnum
CREATE TYPE "ClockType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'PENDING', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "pin" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "gdpr_consent" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_consent_date" TIMESTAMP(3),
    "location_consent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worksites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksite_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "worksite_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksite_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clock_records" (
    "id" TEXT NOT NULL,
    "device_record_id" TEXT,
    "user_id" TEXT NOT NULL,
    "worksite_id" TEXT,
    "type" "ClockType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "is_within_geofence" BOOLEAN,
    "distance_from_site" DOUBLE PRECISION,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "synced_at" TIMESTAMP(3),
    "device_info" TEXT,
    "notes" TEXT,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "manual_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clock_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_dni_key" ON "users"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "worksite_assignments_user_id_worksite_id_start_date_key" ON "worksite_assignments"("user_id", "worksite_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "clock_records_device_record_id_key" ON "clock_records"("device_record_id");

-- CreateIndex
CREATE INDEX "clock_records_user_id_timestamp_idx" ON "clock_records"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "clock_records_worksite_id_timestamp_idx" ON "clock_records"("worksite_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "worksite_assignments" ADD CONSTRAINT "worksite_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksite_assignments" ADD CONSTRAINT "worksite_assignments_worksite_id_fkey" FOREIGN KEY ("worksite_id") REFERENCES "worksites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_records" ADD CONSTRAINT "clock_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clock_records" ADD CONSTRAINT "clock_records_worksite_id_fkey" FOREIGN KEY ("worksite_id") REFERENCES "worksites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
