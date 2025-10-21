-- Add new schema named "public"
CREATE SCHEMA IF NOT EXISTS "public";
-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'standard public schema';
-- Create enum type "notification_type_enum"
CREATE TYPE "public"."notification_type_enum" AS ENUM ('info', 'warning', 'error', 'success', 'announcement');
