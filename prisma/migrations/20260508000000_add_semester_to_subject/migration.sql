-- AlterTable: add semester column to subjects
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "semester" INTEGER NOT NULL DEFAULT 1;
