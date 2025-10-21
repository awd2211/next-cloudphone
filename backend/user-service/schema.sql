-- Add new schema named "public"
CREATE SCHEMA IF NOT EXISTS "public";
-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'standard public schema';
-- Create enum type "api_keys_status_enum"
CREATE TYPE "public"."api_keys_status_enum" AS ENUM ('active', 'revoked', 'expired');
-- Create enum type "tickets_category_enum"
CREATE TYPE "public"."tickets_category_enum" AS ENUM ('technical', 'billing', 'account', 'feature_request', 'other');
-- Create enum type "users_datascope_enum"
CREATE TYPE "public"."users_datascope_enum" AS ENUM ('all', 'tenant', 'department', 'self');
-- Create enum type "data_scopes_scopetype_enum"
CREATE TYPE "public"."data_scopes_scopetype_enum" AS ENUM ('all', 'tenant', 'department', 'department_only', 'self', 'custom');
-- Create enum type "field_permissions_operation_enum"
CREATE TYPE "public"."field_permissions_operation_enum" AS ENUM ('create', 'update', 'view', 'export');
-- Create enum type "quotas_status_enum"
CREATE TYPE "public"."quotas_status_enum" AS ENUM ('active', 'exceeded', 'suspended', 'expired');
-- Create enum type "ticket_replies_type_enum"
CREATE TYPE "public"."ticket_replies_type_enum" AS ENUM ('user', 'staff', 'system');
-- Create enum type "permissions_scope_enum"
CREATE TYPE "public"."permissions_scope_enum" AS ENUM ('all', 'tenant', 'department', 'self', 'custom');
-- Create enum type "tickets_priority_enum"
CREATE TYPE "public"."tickets_priority_enum" AS ENUM ('low', 'medium', 'high', 'urgent');
-- Create enum type "tickets_status_enum"
CREATE TYPE "public"."tickets_status_enum" AS ENUM ('open', 'in_progress', 'pending', 'resolved', 'closed');
-- Create enum type "audit_logs_action_enum"
CREATE TYPE "public"."audit_logs_action_enum" AS ENUM ('user_login', 'user_logout', 'user_register', 'user_update', 'user_delete', 'password_change', 'password_reset', 'quota_create', 'quota_update', 'quota_deduct', 'quota_restore', 'balance_recharge', 'balance_consume', 'balance_adjust', 'balance_freeze', 'balance_unfreeze', 'device_create', 'device_start', 'device_stop', 'device_delete', 'device_update', 'role_assign', 'role_revoke', 'permission_grant', 'permission_revoke', 'config_update', 'system_maintenance', 'api_key_create', 'api_key_revoke');
-- Create enum type "notifications_type_enum"
CREATE TYPE "public"."notifications_type_enum" AS ENUM ('info', 'warning', 'error', 'success', 'announcement');
-- Create enum type "users_status_enum"
CREATE TYPE "public"."users_status_enum" AS ENUM ('active', 'inactive', 'suspended', 'deleted');
-- Create "users" table
CREATE TABLE "public"."users" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "username" character varying NOT NULL,
  "email" character varying NOT NULL,
  "password" character varying NOT NULL,
  "fullName" character varying NULL,
  "avatar" character varying NULL,
  "phone" character varying NULL,
  "status" "public"."users_status_enum" NOT NULL DEFAULT 'active',
  "tenantId" character varying NULL,
  "departmentId" character varying NULL,
  "dataScope" "public"."users_datascope_enum" NOT NULL DEFAULT 'tenant',
  "isSuperAdmin" boolean NOT NULL DEFAULT false,
  "metadata" jsonb NULL,
  "loginAttempts" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamp NULL,
  "lastLoginAt" timestamp NULL,
  "lastLoginIp" character varying NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
  CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")
);
-- Create index "IDX_554d853741f2083faaa5794d2a" to table: "users"
CREATE INDEX "IDX_554d853741f2083faaa5794d2a" ON "public"."users" ("departmentId");
-- Create index "IDX_97672ac88f789774dd47f7c8be" to table: "users"
CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "public"."users" ("email");
-- Create index "IDX_c58f7e88c286e5e3478960a998" to table: "users"
CREATE INDEX "IDX_c58f7e88c286e5e3478960a998" ON "public"."users" ("tenantId");
-- Create index "IDX_fe0bb3f6520ee0469504521e71" to table: "users"
CREATE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "public"."users" ("username");
-- Create enum type "audit_logs_level_enum"
CREATE TYPE "public"."audit_logs_level_enum" AS ENUM ('info', 'warning', 'error', 'critical');
-- Create "audit_logs" table
CREATE TABLE "public"."audit_logs" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "targetUserId" character varying NULL,
  "action" "public"."audit_logs_action_enum" NOT NULL,
  "level" "public"."audit_logs_level_enum" NOT NULL DEFAULT 'info',
  "resourceType" character varying NOT NULL,
  "resourceId" character varying NULL,
  "description" text NOT NULL,
  "oldValue" jsonb NULL,
  "newValue" jsonb NULL,
  "metadata" jsonb NULL,
  "ipAddress" character varying NULL,
  "userAgent" character varying NULL,
  "requestId" character varying NULL,
  "success" boolean NOT NULL DEFAULT true,
  "errorMessage" text NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id")
);
-- Create index "IDX_5b7fbc8045a0654e5f8db27dc5" to table: "audit_logs"
CREATE INDEX "IDX_5b7fbc8045a0654e5f8db27dc5" ON "public"."audit_logs" ("targetUserId");
-- Create index "IDX_76566a7a3b90863650d467bff6" to table: "audit_logs"
CREATE INDEX "IDX_76566a7a3b90863650d467bff6" ON "public"."audit_logs" ("level");
-- Create index "IDX_8ddc86298ac7fadad468b28d83" to table: "audit_logs"
CREATE INDEX "IDX_8ddc86298ac7fadad468b28d83" ON "public"."audit_logs" ("ipAddress");
-- Create index "IDX_b41c13e0a4212c95088d102981" to table: "audit_logs"
CREATE INDEX "IDX_b41c13e0a4212c95088d102981" ON "public"."audit_logs" ("resourceId");
-- Create index "IDX_c69efb19bf127c97e6740ad530" to table: "audit_logs"
CREATE INDEX "IDX_c69efb19bf127c97e6740ad530" ON "public"."audit_logs" ("createdAt");
-- Create index "IDX_cee5459245f652b75eb2759b4c" to table: "audit_logs"
CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "public"."audit_logs" ("action");
-- Create index "IDX_cfa83f61e4d27a87fcae1e025a" to table: "audit_logs"
CREATE INDEX "IDX_cfa83f61e4d27a87fcae1e025a" ON "public"."audit_logs" ("userId");
-- Create index "IDX_fb731b6c9ec3271068b48a0786" to table: "audit_logs"
CREATE INDEX "IDX_fb731b6c9ec3271068b48a0786" ON "public"."audit_logs" ("resourceType");
-- Create index "idx_audit_level_time" to table: "audit_logs"
CREATE INDEX "idx_audit_level_time" ON "public"."audit_logs" ("level", "createdAt");
-- Create index "idx_audit_resource" to table: "audit_logs"
CREATE INDEX "idx_audit_resource" ON "public"."audit_logs" ("resourceType", "resourceId", "createdAt");
-- Create index "idx_audit_user_action" to table: "audit_logs"
CREATE INDEX "idx_audit_user_action" ON "public"."audit_logs" ("userId", "action", "createdAt");
-- Create "api_keys" table
CREATE TABLE "public"."api_keys" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "name" character varying NOT NULL,
  "key" character varying NOT NULL,
  "prefix" character varying NOT NULL,
  "status" "public"."api_keys_status_enum" NOT NULL DEFAULT 'active',
  "scopes" jsonb NOT NULL DEFAULT '[]',
  "expiresAt" timestamp NULL,
  "lastUsedAt" timestamp NULL,
  "usageCount" integer NOT NULL DEFAULT 0,
  "lastUsedIp" character varying NULL,
  "description" text NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_e42cf55faeafdcce01a82d24849" UNIQUE ("key"),
  CONSTRAINT "FK_6c2e267ae764a9413b863a29342" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "IDX_6c2e267ae764a9413b863a2934" to table: "api_keys"
CREATE INDEX "IDX_6c2e267ae764a9413b863a2934" ON "public"."api_keys" ("userId");
-- Create index "IDX_d243fa737f206a31ff6e342ef5" to table: "api_keys"
CREATE INDEX "IDX_d243fa737f206a31ff6e342ef5" ON "public"."api_keys" ("status");
-- Create index "IDX_e42cf55faeafdcce01a82d2484" to table: "api_keys"
CREATE INDEX "IDX_e42cf55faeafdcce01a82d2484" ON "public"."api_keys" ("key");
-- Create "roles" table
CREATE TABLE "public"."roles" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "tenantId" character varying NULL,
  "isSystem" boolean NOT NULL DEFAULT false,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name")
);
-- Create index "IDX_648e3f5447f725579d7d4ffdfb" to table: "roles"
CREATE INDEX "IDX_648e3f5447f725579d7d4ffdfb" ON "public"."roles" ("name");
-- Create index "IDX_c954ae3b1156e075ccd4e9ce3e" to table: "roles"
CREATE INDEX "IDX_c954ae3b1156e075ccd4e9ce3e" ON "public"."roles" ("tenantId");
-- Create "data_scopes" table
CREATE TABLE "public"."data_scopes" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "roleId" uuid NOT NULL,
  "resourceType" character varying NOT NULL,
  "scopeType" "public"."data_scopes_scopetype_enum" NOT NULL DEFAULT 'tenant',
  "filter" jsonb NULL,
  "departmentIds" text NULL,
  "includeSubDepartments" boolean NOT NULL DEFAULT true,
  "description" character varying NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 100,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_288815fc8c8ddcd6e95f4de72ce" PRIMARY KEY ("id"),
  CONSTRAINT "FK_c22d2be0d1e559b12b7f6378b03" FOREIGN KEY ("roleId") REFERENCES "public"."roles" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "IDX_501f8c1dc086b242905367a8ee" to table: "data_scopes"
CREATE UNIQUE INDEX "IDX_501f8c1dc086b242905367a8ee" ON "public"."data_scopes" ("roleId", "resourceType");
-- Create index "IDX_c22d2be0d1e559b12b7f6378b0" to table: "data_scopes"
CREATE INDEX "IDX_c22d2be0d1e559b12b7f6378b0" ON "public"."data_scopes" ("roleId");
-- Create index "IDX_e2bacadc88ec46859df198dc2c" to table: "data_scopes"
CREATE INDEX "IDX_e2bacadc88ec46859df198dc2c" ON "public"."data_scopes" ("resourceType");
-- Create "field_permissions" table
CREATE TABLE "public"."field_permissions" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "roleId" uuid NOT NULL,
  "resourceType" character varying NOT NULL,
  "operation" "public"."field_permissions_operation_enum" NOT NULL DEFAULT 'view',
  "hiddenFields" text NULL,
  "readOnlyFields" text NULL,
  "writableFields" text NULL,
  "requiredFields" text NULL,
  "fieldAccessMap" jsonb NULL,
  "fieldTransforms" jsonb NULL,
  "description" character varying NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 100,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_88e9e2e38cdc86833f65d0bc516" PRIMARY KEY ("id"),
  CONSTRAINT "FK_f088ac9d0e5ee4db454bd16ccd3" FOREIGN KEY ("roleId") REFERENCES "public"."roles" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "IDX_9fa216191eb977a5e02534f515" to table: "field_permissions"
CREATE INDEX "IDX_9fa216191eb977a5e02534f515" ON "public"."field_permissions" ("roleId", "resourceType", "operation");
-- Create index "IDX_f088ac9d0e5ee4db454bd16ccd" to table: "field_permissions"
CREATE INDEX "IDX_f088ac9d0e5ee4db454bd16ccd" ON "public"."field_permissions" ("roleId");
-- Create index "IDX_f5122d518bf71a1386401e1619" to table: "field_permissions"
CREATE INDEX "IDX_f5122d518bf71a1386401e1619" ON "public"."field_permissions" ("resourceType");
-- Create "notifications" table
CREATE TABLE "public"."notifications" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "title" character varying NOT NULL,
  "content" text NOT NULL,
  "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'info',
  "isRead" boolean NOT NULL DEFAULT false,
  "userId" uuid NULL,
  "readAt" timestamp NULL,
  "resourceType" character varying NULL,
  "resourceId" character varying NULL,
  "actionUrl" character varying NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"),
  CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "IDX_21e65af2f4f242d4c85a92aff4" to table: "notifications"
CREATE INDEX "IDX_21e65af2f4f242d4c85a92aff4" ON "public"."notifications" ("userId", "createdAt");
-- Create index "IDX_5340fc241f57310d243e5ab20b" to table: "notifications"
CREATE INDEX "IDX_5340fc241f57310d243e5ab20b" ON "public"."notifications" ("userId", "isRead");
-- Create index "IDX_692a909ee0fa9383e7859f9b40" to table: "notifications"
CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "public"."notifications" ("userId");
-- Create "quotas" table
CREATE TABLE "public"."quotas" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "planId" character varying NULL,
  "planName" character varying NULL,
  "status" "public"."quotas_status_enum" NOT NULL DEFAULT 'active',
  "limits" jsonb NOT NULL,
  "usage" jsonb NOT NULL,
  "validFrom" timestamp NULL,
  "validUntil" timestamp NULL,
  "autoRenew" boolean NOT NULL DEFAULT false,
  "notes" text NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_5f54877798333ca833245a100d1" PRIMARY KEY ("id"),
  CONSTRAINT "FK_43f51757c8cb625cdc558aa3d1e" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "IDX_1be2801eea5b0e9a9bca196d79" to table: "quotas"
CREATE INDEX "IDX_1be2801eea5b0e9a9bca196d79" ON "public"."quotas" ("planId");
-- Create index "IDX_28ea71d2079ef4e542b85effed" to table: "quotas"
CREATE INDEX "IDX_28ea71d2079ef4e542b85effed" ON "public"."quotas" ("status");
-- Create index "IDX_43f51757c8cb625cdc558aa3d1" to table: "quotas"
CREATE INDEX "IDX_43f51757c8cb625cdc558aa3d1" ON "public"."quotas" ("userId");
-- Create index "idx_quotas_plan_status" to table: "quotas"
CREATE INDEX "idx_quotas_plan_status" ON "public"."quotas" ("planId", "status");
-- Create index "idx_quotas_user_status" to table: "quotas"
CREATE INDEX "idx_quotas_user_status" ON "public"."quotas" ("userId", "status");
-- Create index "idx_quotas_valid_period" to table: "quotas"
CREATE INDEX "idx_quotas_valid_period" ON "public"."quotas" ("validFrom", "validUntil");
-- Create "permissions" table
CREATE TABLE "public"."permissions" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" character varying NULL,
  "resource" character varying NOT NULL,
  "action" character varying NOT NULL,
  "conditions" jsonb NULL,
  "scope" "public"."permissions_scope_enum" NOT NULL DEFAULT 'tenant',
  "dataFilter" jsonb NULL,
  "fieldRules" jsonb NULL,
  "metadata" jsonb NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name")
);
-- Create index "IDX_48ce552495d14eae9b187bb671" to table: "permissions"
CREATE INDEX "IDX_48ce552495d14eae9b187bb671" ON "public"."permissions" ("name");
-- Create index "IDX_89456a09b598ce8915c702c528" to table: "permissions"
CREATE INDEX "IDX_89456a09b598ce8915c702c528" ON "public"."permissions" ("resource");
-- Create "role_permissions" table
CREATE TABLE "public"."role_permissions" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"),
  CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "public"."roles" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "IDX_17022daf3f885f7d35423e9971" to table: "role_permissions"
CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "public"."role_permissions" ("permission_id");
-- Create index "IDX_178199805b901ccd220ab7740e" to table: "role_permissions"
CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "public"."role_permissions" ("role_id");
-- Create "tickets" table
CREATE TABLE "public"."tickets" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "ticketNumber" character varying NOT NULL,
  "userId" uuid NOT NULL,
  "subject" character varying NOT NULL,
  "description" text NOT NULL,
  "category" "public"."tickets_category_enum" NOT NULL DEFAULT 'other',
  "priority" "public"."tickets_priority_enum" NOT NULL DEFAULT 'medium',
  "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'open',
  "assignedTo" uuid NULL,
  "attachments" jsonb NULL,
  "tags" jsonb NULL,
  "firstResponseAt" timestamp NULL,
  "resolvedAt" timestamp NULL,
  "closedAt" timestamp NULL,
  "replyCount" integer NOT NULL DEFAULT 0,
  "lastReplyAt" timestamp NULL,
  "internalNotes" text NULL,
  "rating" integer NULL,
  "feedback" text NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_e99bd0f51b92896fdaf99ebb715" UNIQUE ("ticketNumber"),
  CONSTRAINT "FK_4bb45e096f521845765f657f5c8" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "IDX_12b901b34113688b4786368510" to table: "tickets"
CREATE INDEX "IDX_12b901b34113688b4786368510" ON "public"."tickets" ("status");
-- Create index "IDX_143c60f935aa86982b2074fadd" to table: "tickets"
CREATE INDEX "IDX_143c60f935aa86982b2074fadd" ON "public"."tickets" ("category");
-- Create index "IDX_1cfb61a749963bfba02395e118" to table: "tickets"
CREATE INDEX "IDX_1cfb61a749963bfba02395e118" ON "public"."tickets" ("priority");
-- Create index "IDX_4bb45e096f521845765f657f5c" to table: "tickets"
CREATE INDEX "IDX_4bb45e096f521845765f657f5c" ON "public"."tickets" ("userId");
-- Create index "IDX_d1beac6cf7fa5a0742a693c9aa" to table: "tickets"
CREATE INDEX "IDX_d1beac6cf7fa5a0742a693c9aa" ON "public"."tickets" ("assignedTo");
-- Create index "IDX_e99bd0f51b92896fdaf99ebb71" to table: "tickets"
CREATE INDEX "IDX_e99bd0f51b92896fdaf99ebb71" ON "public"."tickets" ("ticketNumber");
-- Create index "idx_tickets_assigned" to table: "tickets"
CREATE INDEX "idx_tickets_assigned" ON "public"."tickets" ("assignedTo", "status");
-- Create index "idx_tickets_category_status" to table: "tickets"
CREATE INDEX "idx_tickets_category_status" ON "public"."tickets" ("category", "status");
-- Create index "idx_tickets_status_priority" to table: "tickets"
CREATE INDEX "idx_tickets_status_priority" ON "public"."tickets" ("status", "priority", "createdAt");
-- Create index "idx_tickets_user_status" to table: "tickets"
CREATE INDEX "idx_tickets_user_status" ON "public"."tickets" ("userId", "status", "createdAt");
-- Create "ticket_replies" table
CREATE TABLE "public"."ticket_replies" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "ticketId" uuid NOT NULL,
  "userId" uuid NOT NULL,
  "type" "public"."ticket_replies_type_enum" NOT NULL,
  "content" text NOT NULL,
  "attachments" jsonb NULL,
  "isInternal" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_6ab133db0068322c649e89fc019" PRIMARY KEY ("id"),
  CONSTRAINT "FK_4ad4ae300ad5118e747a50ea2a2" FOREIGN KEY ("userId") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT "FK_6983c82029e4e2097d6cd5d5bf7" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "IDX_04d92dff01a6f5dd79673c51b3" to table: "ticket_replies"
CREATE INDEX "IDX_04d92dff01a6f5dd79673c51b3" ON "public"."ticket_replies" ("type");
-- Create index "IDX_4ad4ae300ad5118e747a50ea2a" to table: "ticket_replies"
CREATE INDEX "IDX_4ad4ae300ad5118e747a50ea2a" ON "public"."ticket_replies" ("userId");
-- Create index "IDX_6983c82029e4e2097d6cd5d5bf" to table: "ticket_replies"
CREATE INDEX "IDX_6983c82029e4e2097d6cd5d5bf" ON "public"."ticket_replies" ("ticketId");
-- Create "user_roles" table
CREATE TABLE "public"."user_roles" (
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id"),
  CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "public"."roles" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "IDX_87b8888186ca9769c960e92687" to table: "user_roles"
CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "public"."user_roles" ("user_id");
-- Create index "IDX_b23c65e50a758245a33ee35fda" to table: "user_roles"
CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "public"."user_roles" ("role_id");
