-- Ban temporal: SUSPENDED + bannedUntil. Permanente: SUSPENDED + bannedUntil NULL.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedUntil" TIMESTAMP(3);
