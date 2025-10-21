-- Add new schema named "public"
CREATE SCHEMA IF NOT EXISTS "public";
-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'standard public schema';
-- Create enum type "devices_type_enum"
CREATE TYPE "public"."devices_type_enum" AS ENUM ('phone', 'tablet');
-- Create enum type "devices_status_enum"
CREATE TYPE "public"."devices_status_enum" AS ENUM ('creating', 'idle', 'allocated', 'running', 'stopped', 'paused', 'error', 'deleted');
-- Create enum type "device_templates_category_enum"
CREATE TYPE "public"."device_templates_category_enum" AS ENUM ('gaming', 'testing', 'general', 'custom');
-- Create enum type "device_snapshots_status_enum"
CREATE TYPE "public"."device_snapshots_status_enum" AS ENUM ('creating', 'ready', 'failed', 'restoring');
-- Create enum type "nodes_status_enum"
CREATE TYPE "public"."nodes_status_enum" AS ENUM ('online', 'offline', 'maintenance', 'draining');
-- Create "device_templates" table
CREATE TABLE "public"."device_templates" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "category" "public"."device_templates_category_enum" NOT NULL DEFAULT 'general',
  "cpuCores" integer NOT NULL DEFAULT 2,
  "memoryMB" integer NOT NULL DEFAULT 4096,
  "storageMB" integer NOT NULL DEFAULT 10240,
  "resolution" character varying NOT NULL DEFAULT '1080x1920',
  "dpi" integer NOT NULL DEFAULT 320,
  "androidVersion" character varying NOT NULL DEFAULT '11',
  "enableGpu" boolean NOT NULL DEFAULT false,
  "enableAudio" boolean NOT NULL DEFAULT false,
  "preInstalledApps" jsonb NOT NULL DEFAULT '[]',
  "initCommands" jsonb NOT NULL DEFAULT '[]',
  "systemSettings" jsonb NULL,
  "snapshotId" character varying NULL,
  "snapshotPath" character varying NULL,
  "usageCount" integer NOT NULL DEFAULT 0,
  "lastUsedAt" timestamp NULL,
  "metadata" jsonb NULL,
  "tags" jsonb NOT NULL DEFAULT '[]',
  "isPublic" boolean NOT NULL DEFAULT false,
  "createdBy" character varying NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_bb935b8cf38a05dda256987548e" PRIMARY KEY ("id")
);
-- Create index "IDX_0ee54bc821f246314ed581458c" to table: "device_templates"
CREATE INDEX "IDX_0ee54bc821f246314ed581458c" ON "public"."device_templates" ("name");
-- Create index "IDX_60d495d7abc904ff17d08640e8" to table: "device_templates"
CREATE INDEX "IDX_60d495d7abc904ff17d08640e8" ON "public"."device_templates" ("createdBy");
-- Create index "IDX_fb0d1c9d7dcd0ccd2f6174d6a2" to table: "device_templates"
CREATE INDEX "IDX_fb0d1c9d7dcd0ccd2f6174d6a2" ON "public"."device_templates" ("category");
-- Create "devices" table
CREATE TABLE "public"."devices" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "type" "public"."devices_type_enum" NOT NULL DEFAULT 'phone',
  "status" "public"."devices_status_enum" NOT NULL DEFAULT 'creating',
  "userId" character varying NULL,
  "tenantId" character varying NULL,
  "containerId" character varying NULL,
  "containerName" character varying NULL,
  "imageTag" character varying NULL,
  "adbHost" character varying NULL,
  "adbPort" integer NULL,
  "cpuCores" integer NOT NULL DEFAULT 2,
  "memoryMB" integer NOT NULL DEFAULT 4096,
  "storageMB" integer NOT NULL DEFAULT 10240,
  "resolution" character varying NOT NULL DEFAULT '1920x1080',
  "dpi" integer NOT NULL DEFAULT 240,
  "androidVersion" character varying NOT NULL DEFAULT '11',
  "androidId" character varying NULL,
  "ipAddress" character varying NULL,
  "macAddress" character varying NULL,
  "cpuUsage" integer NOT NULL DEFAULT 0,
  "memoryUsage" integer NOT NULL DEFAULT 0,
  "storageUsage" integer NOT NULL DEFAULT 0,
  "lastHeartbeatAt" timestamp NULL,
  "lastActiveAt" timestamp NULL,
  "metadata" jsonb NULL,
  "tags" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "userName" character varying NULL,
  "userEmail" character varying NULL,
  CONSTRAINT "PK_b1514758245c12daf43486dd1f0" PRIMARY KEY ("id")
);
-- Create index "IDX_25a895dfc7796eab1da289796f" to table: "devices"
CREATE INDEX "IDX_25a895dfc7796eab1da289796f" ON "public"."devices" ("name");
-- Create index "IDX_388a5c41555d999c9d80abd774" to table: "devices"
CREATE INDEX "IDX_388a5c41555d999c9d80abd774" ON "public"."devices" ("tenantId");
-- Create index "IDX_77242cc7802344b79d9d1307a2" to table: "devices"
CREATE INDEX "IDX_77242cc7802344b79d9d1307a2" ON "public"."devices" ("containerId");
-- Create index "IDX_c37da3607f7214c3dda1803d09" to table: "devices"
CREATE INDEX "IDX_c37da3607f7214c3dda1803d09" ON "public"."devices" ("status");
-- Create index "IDX_e8a5d59f0ac3040395f159507c" to table: "devices"
CREATE INDEX "IDX_e8a5d59f0ac3040395f159507c" ON "public"."devices" ("userId");
-- Create "nodes" table
CREATE TABLE "public"."nodes" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "hostname" character varying NOT NULL,
  "ipAddress" character varying NOT NULL,
  "dockerPort" integer NOT NULL DEFAULT 2375,
  "status" "public"."nodes_status_enum" NOT NULL DEFAULT 'offline',
  "capacity" jsonb NOT NULL,
  "usage" jsonb NOT NULL,
  "loadScore" double precision NOT NULL DEFAULT 0,
  "labels" jsonb NOT NULL DEFAULT '[]',
  "taints" jsonb NOT NULL DEFAULT '[]',
  "priority" integer NOT NULL DEFAULT 0,
  "region" character varying NULL,
  "zone" character varying NULL,
  "lastHeartbeat" timestamp NULL,
  "failedHealthChecks" integer NOT NULL DEFAULT 0,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_682d6427523a0fa43d062ea03ee" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_b8645506b68b2c103372aacc0ff" UNIQUE ("name")
);
-- Create index "IDX_8019f2637b16f1e26cc06acc50" to table: "nodes"
CREATE INDEX "IDX_8019f2637b16f1e26cc06acc50" ON "public"."nodes" ("status");
-- Create index "IDX_b8645506b68b2c103372aacc0f" to table: "nodes"
CREATE INDEX "IDX_b8645506b68b2c103372aacc0f" ON "public"."nodes" ("name");
-- Create "device_snapshots" table
CREATE TABLE "public"."device_snapshots" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "deviceId" uuid NOT NULL,
  "status" "public"."device_snapshots_status_enum" NOT NULL DEFAULT 'creating',
  "imageId" character varying NOT NULL,
  "imageName" character varying NOT NULL,
  "imageSize" bigint NOT NULL,
  "metadata" jsonb NULL,
  "version" integer NOT NULL DEFAULT 1,
  "parentSnapshotId" character varying NULL,
  "isCompressed" boolean NOT NULL DEFAULT false,
  "compressedPath" character varying NULL,
  "compressedSize" bigint NULL,
  "tags" jsonb NOT NULL DEFAULT '[]',
  "createdBy" character varying NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "lastRestoredAt" timestamp NULL,
  "restoreCount" integer NOT NULL DEFAULT 0,
  CONSTRAINT "PK_76d05e813cba7dfadb4f0bd973d" PRIMARY KEY ("id"),
  CONSTRAINT "FK_44fec6a6cb4b83f86699e45a2d9" FOREIGN KEY ("deviceId") REFERENCES "public"."devices" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "IDX_44fec6a6cb4b83f86699e45a2d" to table: "device_snapshots"
CREATE INDEX "IDX_44fec6a6cb4b83f86699e45a2d" ON "public"."device_snapshots" ("deviceId");
-- Create index "IDX_4551e8269bf962e933c7956eff" to table: "device_snapshots"
CREATE INDEX "IDX_4551e8269bf962e933c7956eff" ON "public"."device_snapshots" ("name");
-- Create index "IDX_ca77b87346f9792fe81cf004e0" to table: "device_snapshots"
CREATE INDEX "IDX_ca77b87346f9792fe81cf004e0" ON "public"."device_snapshots" ("createdBy");
