-- Add bulk_import to TransactionType enum
ALTER TYPE "TransactionType" ADD VALUE 'bulk_import';

-- CreateEnum
CREATE TYPE "BulkImportStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PendingImportBalanceStatus" AS ENUM ('pending', 'claimed', 'expired');

-- CreateTable
CREATE TABLE "BulkImportJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BulkImportStatus" NOT NULL DEFAULT 'pending',
    "createdById" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "columnMapping" JSONB NOT NULL,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingImportBalance" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PendingImportBalanceStatus" NOT NULL DEFAULT 'pending',
    "transactionId" TEXT,
    "inviteSentAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingImportBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkImportJob_status_idx" ON "BulkImportJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PendingImportBalance_transactionId_key" ON "PendingImportBalance"("transactionId");

-- CreateIndex
CREATE INDEX "PendingImportBalance_recipientEmail_status_idx" ON "PendingImportBalance"("recipientEmail", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PendingImportBalance_importJobId_recipientEmail_key" ON "PendingImportBalance"("importJobId", "recipientEmail");

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingImportBalance" ADD CONSTRAINT "PendingImportBalance_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "BulkImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingImportBalance" ADD CONSTRAINT "PendingImportBalance_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
