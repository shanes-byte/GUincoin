-- CreateEnum
CREATE TYPE "ChatGameType" AS ENUM ('encrypted_office', 'skill_shot');

-- CreateEnum
CREATE TYPE "ChatGameStatus" AS ENUM ('waiting', 'active', 'completed', 'cancelled', 'expired');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "isGameMaster" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ChatGame" (
    "id" TEXT NOT NULL,
    "type" "ChatGameType" NOT NULL,
    "status" "ChatGameStatus" NOT NULL DEFAULT 'waiting',
    "spaceName" TEXT,
    "threadName" TEXT,
    "createdById" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ChatGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatGameParticipant" (
    "id" TEXT NOT NULL,
    "chatGameId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "progress" JSONB NOT NULL DEFAULT '{}',
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActionAt" TIMESTAMP(3),

    CONSTRAINT "ChatGameParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatGame_status_idx" ON "ChatGame"("status");

-- CreateIndex
CREATE INDEX "ChatGame_spaceName_idx" ON "ChatGame"("spaceName");

-- CreateIndex
CREATE INDEX "ChatGame_createdById_idx" ON "ChatGame"("createdById");

-- CreateIndex
CREATE INDEX "ChatGame_expiresAt_idx" ON "ChatGame"("expiresAt");

-- CreateIndex
CREATE INDEX "ChatGameParticipant_employeeId_idx" ON "ChatGameParticipant"("employeeId");

-- CreateIndex
CREATE INDEX "ChatGameParticipant_chatGameId_idx" ON "ChatGameParticipant"("chatGameId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatGameParticipant_chatGameId_employeeId_key" ON "ChatGameParticipant"("chatGameId", "employeeId");

-- AddForeignKey
ALTER TABLE "ChatGame" ADD CONSTRAINT "ChatGame_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatGameParticipant" ADD CONSTRAINT "ChatGameParticipant_chatGameId_fkey" FOREIGN KEY ("chatGameId") REFERENCES "ChatGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatGameParticipant" ADD CONSTRAINT "ChatGameParticipant_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
