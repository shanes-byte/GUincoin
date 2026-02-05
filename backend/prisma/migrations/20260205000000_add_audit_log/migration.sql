-- Add prediction transaction types to TransactionType enum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'prediction_bet' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
        ALTER TYPE "TransactionType" ADD VALUE 'prediction_bet';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'prediction_win' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')) THEN
        ALTER TYPE "TransactionType" ADD VALUE 'prediction_win';
    END IF;
END
$$;

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
    'transaction_created',
    'transaction_posted',
    'transaction_rejected',
    'balance_adjustment',
    'allotment_deposit',
    'purchase_created',
    'purchase_fulfilled',
    'purchase_cancelled',
    'refund_issued',
    'role_changed',
    'user_created',
    'user_deactivated',
    'settings_changed',
    'store_product_created',
    'store_product_updated',
    'store_product_deleted',
    'wellness_task_created',
    'wellness_task_updated',
    'wellness_submission_approved',
    'wellness_submission_rejected',
    'bulk_import_started',
    'bulk_import_completed',
    'admin_login',
    'permission_denied',
    'suspicious_activity'
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
