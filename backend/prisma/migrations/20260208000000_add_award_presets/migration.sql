-- CreateTable
CREATE TABLE "AwardPreset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardPreset_pkey" PRIMARY KEY ("id")
);

-- Seed default presets
INSERT INTO "AwardPreset" ("id", "title", "amount", "displayOrder", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'Quick Thanks', 10, 1, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Great Work', 25, 2, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Above & Beyond', 50, 3, true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Outstanding Achievement', 100, 4, true, NOW(), NOW());
