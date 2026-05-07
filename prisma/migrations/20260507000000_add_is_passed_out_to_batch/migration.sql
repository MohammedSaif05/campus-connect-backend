-- AlterTable: add current_semester (was in schema but missing from init migration SQL)
-- and is_passed_out (new field for batch lifecycle tracking)
ALTER TABLE "batches"
  ADD COLUMN IF NOT EXISTS "current_semester" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "is_passed_out" BOOLEAN NOT NULL DEFAULT false;
