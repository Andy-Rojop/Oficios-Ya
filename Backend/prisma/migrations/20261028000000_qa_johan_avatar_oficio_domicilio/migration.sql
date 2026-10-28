-- QA Johan: avatar approval, category requests, home service zones
CREATE TYPE "AvatarStatus" AS ENUM ('NOT_SET', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "CategoryRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarPath" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarStatus" "AvatarStatus" NOT NULL DEFAULT 'NOT_SET';

ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "baseZoneId" TEXT;
ALTER TABLE "WorkerProfile" ADD COLUMN IF NOT EXISTS "offersHomeService" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "WorkerProfile" ADD CONSTRAINT "WorkerProfile_baseZoneId_fkey"
    FOREIGN KEY ("baseZoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CategoryRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "status" "CategoryRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdCategoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  CONSTRAINT "CategoryRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CategoryRequest_status_createdAt_idx" ON "CategoryRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "CategoryRequest_requestedByUserId_status_idx" ON "CategoryRequest"("requestedByUserId", "status");

DO $$ BEGIN
  ALTER TABLE "CategoryRequest" ADD CONSTRAINT "CategoryRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CategoryRequest" ADD CONSTRAINT "CategoryRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CategoryRequest" ADD CONSTRAINT "CategoryRequest_createdCategoryId_fkey"
    FOREIGN KEY ("createdCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
