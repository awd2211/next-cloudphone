-- Add new schema named "public"
CREATE SCHEMA IF NOT EXISTS "public";
-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'standard public schema';
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
  "dataScope" character varying(50) NOT NULL DEFAULT 'tenant',
  "isSuperAdmin" boolean NOT NULL DEFAULT false,
  "metadata" jsonb NULL,
  "loginAttempts" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamp NULL,
  "lastLoginAt" timestamp NULL,
  "lastLoginIp" character varying NULL,
  "twoFactorEnabled" boolean NOT NULL DEFAULT false,
  "twoFactorSecret" character varying NULL,
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
