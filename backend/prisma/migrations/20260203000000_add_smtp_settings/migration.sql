-- CreateTable
CREATE TABLE "SmtpSettings" (
    "id" TEXT NOT NULL DEFAULT 'smtp',
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "user" TEXT,
    "pass" TEXT,
    "fromName" TEXT NOT NULL DEFAULT 'Guincoin Rewards',
    "fromEmail" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpSettings_pkey" PRIMARY KEY ("id")
);
