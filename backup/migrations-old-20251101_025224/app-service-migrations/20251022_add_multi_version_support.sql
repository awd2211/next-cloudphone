-- Migration: Add Multi-Version Support for Applications
-- Created: 2025-10-22
-- Description:
--   - Remove unique constraint on packageName (allow multiple versions)
--   - Add isLatest boolean field to track the latest version
--   - Add versionCode index for efficient version queries
--   - Add composite unique index on (packageName, versionCode)

-- Step 1: Remove the unique constraint on packageName
ALTER TABLE "public"."applications"
  DROP CONSTRAINT "UQ_68c0f27277a0e9cd25f8f0343ca";

-- Step 2: Add isLatest column with default false
ALTER TABLE "public"."applications"
  ADD COLUMN "isLatest" boolean NOT NULL DEFAULT false;

-- Step 3: Add index on versionCode for efficient version sorting
CREATE INDEX "IDX_applications_versionCode"
  ON "public"."applications" ("versionCode");

-- Step 4: Add index on isLatest for efficient latest version queries
CREATE INDEX "IDX_applications_isLatest"
  ON "public"."applications" ("isLatest");

-- Step 5: Add composite unique index on (packageName, versionCode)
-- This ensures each version of an app is unique
CREATE UNIQUE INDEX "IDX_applications_packageName_versionCode"
  ON "public"."applications" ("packageName", "versionCode");

-- Step 6: Update existing applications to mark them as latest
-- For each packageName, find the highest versionCode and mark it as latest
WITH latest_versions AS (
  SELECT DISTINCT ON ("packageName")
    "id",
    "packageName",
    "versionCode"
  FROM "public"."applications"
  WHERE "status" = 'available'
  ORDER BY "packageName", "versionCode" DESC
)
UPDATE "public"."applications"
SET "isLatest" = true
WHERE "id" IN (SELECT "id" FROM latest_versions);

-- Migration Notes:
-- 1. This migration allows multiple versions of the same app (identified by packageName)
-- 2. Each (packageName, versionCode) combination must be unique
-- 3. The isLatest field automatically tracks which version is the most recent
-- 4. Existing applications will be marked as latest based on highest versionCode
-- 5. New uploads will automatically update the isLatest flag via application logic
