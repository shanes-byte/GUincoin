-- AlterTable
ALTER TABLE "GameConfig" ADD COLUMN "houseEdgePercent" DECIMAL(5,2) NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "GameBankAccount" (
    "id" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameBankAccount_pkey" PRIMARY KEY ("id")
);
