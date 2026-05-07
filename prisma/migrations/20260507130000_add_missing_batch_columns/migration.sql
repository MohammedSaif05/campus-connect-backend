-- Fix: add current_semester which was missing from the initial migration SQL
-- and is_passed_out which may or may not have been applied already.
-- Using IF NOT EXISTS so this is safe to run regardless of DB state.
ALTER TABLE "batches"
  ADD COLUMN IF NOT EXISTS "current_semester" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "is_passed_out" BOOLEAN NOT NULL DEFAULT false;
