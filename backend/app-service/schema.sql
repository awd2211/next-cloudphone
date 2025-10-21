-- Add new schema named "public"
CREATE SCHEMA IF NOT EXISTS "public";
-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'standard public schema';
-- Create enum type "applications_status_enum"
CREATE TYPE "public"."applications_status_enum" AS ENUM ('uploading', 'available', 'unavailable', 'deleted');
-- Create enum type "applications_category_enum"
CREATE TYPE "public"."applications_category_enum" AS ENUM ('social', 'game', 'tool', 'entertainment', 'productivity', 'business', 'education', 'other');
-- Create enum type "device_applications_status_enum"
CREATE TYPE "public"."device_applications_status_enum" AS ENUM ('pending', 'installing', 'installed', 'failed', 'uninstalling', 'uninstalled');
-- Create "applications" table
CREATE TABLE "public"."applications" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "packageName" character varying NOT NULL,
  "versionName" character varying NOT NULL,
  "versionCode" bigint NOT NULL,
  "status" "public"."applications_status_enum" NOT NULL DEFAULT 'uploading',
  "category" "public"."applications_category_enum" NOT NULL DEFAULT 'other',
  "icon" character varying NULL,
  "size" bigint NOT NULL,
  "minSdkVersion" integer NOT NULL,
  "targetSdkVersion" integer NULL,
  "tenantId" character varying NULL,
  "uploaderId" character varying NULL,
  "bucketName" character varying NOT NULL,
  "objectKey" character varying NOT NULL,
  "downloadUrl" character varying NULL,
  "permissions" jsonb NULL,
  "metadata" jsonb NULL,
  "tags" jsonb NULL,
  "downloadCount" integer NOT NULL DEFAULT 0,
  "installCount" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_68c0f27277a0e9cd25f8f0343ca" UNIQUE ("packageName")
);
-- Create index "IDX_66676190473cb500b0fc377263" to table: "applications"
CREATE INDEX "IDX_66676190473cb500b0fc377263" ON "public"."applications" ("uploaderId");
-- Create index "IDX_68c0f27277a0e9cd25f8f0343c" to table: "applications"
CREATE INDEX "IDX_68c0f27277a0e9cd25f8f0343c" ON "public"."applications" ("packageName");
-- Create index "IDX_8ee114cee92e995a9e75c05cfb" to table: "applications"
CREATE INDEX "IDX_8ee114cee92e995a9e75c05cfb" ON "public"."applications" ("status");
-- Create index "IDX_c27adf21d49ce6fa1c0d95a529" to table: "applications"
CREATE INDEX "IDX_c27adf21d49ce6fa1c0d95a529" ON "public"."applications" ("tenantId");
-- Create index "IDX_fcdfc51648dfbc8cfa417d6c3f" to table: "applications"
CREATE INDEX "IDX_fcdfc51648dfbc8cfa417d6c3f" ON "public"."applications" ("name");
-- Create "device_applications" table
CREATE TABLE "public"."device_applications" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "deviceId" character varying NOT NULL,
  "applicationId" character varying NOT NULL,
  "status" "public"."device_applications_status_enum" NOT NULL DEFAULT 'installing',
  "installPath" character varying NULL,
  "installedAt" timestamp NULL,
  "uninstalledAt" timestamp NULL,
  "errorMessage" character varying NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_f66b3191de10eb03a1e4205cc13" PRIMARY KEY ("id")
);
-- Create index "IDX_8863a65791194bbc939c64f263" to table: "device_applications"
CREATE INDEX "IDX_8863a65791194bbc939c64f263" ON "public"."device_applications" ("deviceId");
-- Create index "IDX_a264b824590e3c1715b95f01cc" to table: "device_applications"
CREATE INDEX "IDX_a264b824590e3c1715b95f01cc" ON "public"."device_applications" ("applicationId");
-- Create index "IDX_ed3ad09318509308e77388810d" to table: "device_applications"
CREATE INDEX "IDX_ed3ad09318509308e77388810d" ON "public"."device_applications" ("status");
