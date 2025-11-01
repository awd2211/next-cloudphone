-- Migration: Add Application Audit Workflow
-- Created: 2025-10-22
-- Description:
--   - Add audit-related statuses to applications_status_enum
--   - Create app_audit_records table to track audit history
--   - Add necessary indexes for audit queries

-- Step 1: Add new status values to applications_status_enum
ALTER TYPE "public"."applications_status_enum"
  ADD VALUE IF NOT EXISTS 'pending_review';

ALTER TYPE "public"."applications_status_enum"
  ADD VALUE IF NOT EXISTS 'approved';

ALTER TYPE "public"."applications_status_enum"
  ADD VALUE IF NOT EXISTS 'rejected';

-- Step 2: Create audit action enum
CREATE TYPE "public"."audit_action_enum" AS ENUM (
  'submit',
  'approve',
  'reject',
  'request_changes'
);

-- Step 3: Create audit status enum
CREATE TYPE "public"."audit_status_enum" AS ENUM (
  'pending',
  'approved',
  'rejected',
  'changes_requested'
);

-- Step 4: Create app_audit_records table
CREATE TABLE "public"."app_audit_records" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "applicationId" uuid NOT NULL,
  "action" "public"."audit_action_enum" NOT NULL,
  "status" "public"."audit_status_enum" NOT NULL,
  "reviewerId" character varying NULL,
  "reviewerName" character varying NULL,
  "comment" text NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_app_audit_records" PRIMARY KEY ("id")
);

-- Step 5: Add foreign key constraint
ALTER TABLE "public"."app_audit_records"
  ADD CONSTRAINT "FK_audit_applicationId"
  FOREIGN KEY ("applicationId")
  REFERENCES "public"."applications" ("id")
  ON DELETE CASCADE;

-- Step 6: Create indexes for efficient queries
-- Index on applicationId for querying specific app's audit history
CREATE INDEX "IDX_audit_records_applicationId"
  ON "public"."app_audit_records" ("applicationId");

-- Index on reviewerId for querying specific reviewer's actions
CREATE INDEX "IDX_audit_records_reviewerId"
  ON "public"."app_audit_records" ("reviewerId");

-- Composite index on (applicationId, createdAt) for chronological queries
CREATE INDEX "IDX_audit_records_applicationId_createdAt"
  ON "public"."app_audit_records" ("applicationId", "createdAt" DESC);

-- Index on createdAt for time-based queries
CREATE INDEX "IDX_audit_records_createdAt"
  ON "public"."app_audit_records" ("createdAt" DESC);

-- Index on action for filtering by audit action type
CREATE INDEX "IDX_audit_records_action"
  ON "public"."app_audit_records" ("action");

-- Index on status for filtering by audit status
CREATE INDEX "IDX_audit_records_status"
  ON "public"."app_audit_records" ("status");

-- Migration Notes:
-- 1. New application statuses:
--    - pending_review: Application is waiting for review
--    - approved: Application has been approved by reviewer
--    - rejected: Application has been rejected by reviewer
--
-- 2. Audit workflow:
--    - Developer uploads app (status: uploading → pending_review)
--    - Reviewer can: approve, reject, or request changes
--    - Each action creates a record in app_audit_records
--    - Approved apps can be made available for installation
--
-- 3. Audit records track:
--    - Who performed the action (reviewerId, reviewerName)
--    - What action was performed (approve, reject, request_changes)
--    - When it was performed (createdAt)
--    - Why (comment field for reviewer feedback)
--
-- 4. Indexes optimize:
--    - Fetching audit history for specific applications
--    - Filtering by reviewer, action type, or status
--    - Chronological ordering of audit events
--
-- 5. Foreign key constraint ensures:
--    - Audit records are automatically deleted when application is deleted
--    - Data integrity between applications and audit records
