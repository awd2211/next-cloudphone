-- Add new schema named "atlas_schema_revisions"
CREATE SCHEMA "atlas_schema_revisions";
-- Add new schema named "public"
CREATE SCHEMA IF NOT EXISTS "public";
-- Set comment to schema: "public"
COMMENT ON SCHEMA "public" IS 'standard public schema';
-- Create enum type "invoices_status_enum"
CREATE TYPE "public"."invoices_status_enum" AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded');
-- Create enum type "payments_method_enum"
CREATE TYPE "public"."payments_method_enum" AS ENUM ('wechat', 'alipay', 'balance');
-- Create enum type "orders_paymentmethod_enum"
CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM ('wechat', 'alipay', 'stripe', 'balance');
-- Create enum type "plans_type_enum"
CREATE TYPE "public"."plans_type_enum" AS ENUM ('free', 'basic', 'pro', 'enterprise');
-- Create enum type "plans_billingcycle_enum"
CREATE TYPE "public"."plans_billingcycle_enum" AS ENUM ('hourly', 'daily', 'monthly', 'yearly');
-- Create enum type "usage_records_usagetype_enum"
CREATE TYPE "public"."usage_records_usagetype_enum" AS ENUM ('device_usage', 'storage_usage', 'traffic_usage', 'api_call');
-- Create enum type "invoices_type_enum"
CREATE TYPE "public"."invoices_type_enum" AS ENUM ('monthly', 'recharge', 'adjustment', 'refund');
-- Create enum type "payments_status_enum"
CREATE TYPE "public"."payments_status_enum" AS ENUM ('pending', 'processing', 'success', 'failed', 'refunding', 'refunded', 'cancelled');
-- Create enum type "user_balances_status_enum"
CREATE TYPE "public"."user_balances_status_enum" AS ENUM ('normal', 'low', 'insufficient', 'frozen');
-- Create enum type "balance_transactions_type_enum"
CREATE TYPE "public"."balance_transactions_type_enum" AS ENUM ('recharge', 'consume', 'refund', 'freeze', 'unfreeze', 'adjustment', 'reward');
-- Create enum type "orders_status_enum"
CREATE TYPE "public"."orders_status_enum" AS ENUM ('pending', 'paid', 'cancelled', 'refunded', 'failed');
-- Create enum type "balance_transactions_status_enum"
CREATE TYPE "public"."balance_transactions_status_enum" AS ENUM ('pending', 'success', 'failed', 'cancelled');
-- Create "balance_transactions" table
CREATE TABLE "public"."balance_transactions" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "balanceId" uuid NOT NULL,
  "type" "public"."balance_transactions_type_enum" NOT NULL,
  "amount" numeric(15,2) NOT NULL,
  "balanceBefore" numeric(15,2) NOT NULL,
  "balanceAfter" numeric(15,2) NOT NULL,
  "status" "public"."balance_transactions_status_enum" NOT NULL DEFAULT 'pending',
  "orderId" character varying NULL,
  "paymentId" character varying NULL,
  "deviceId" character varying NULL,
  "description" text NULL,
  "metadata" jsonb NULL,
  "operatorId" character varying NULL,
  "ipAddress" character varying NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_6aea2d6b103d342d343be2ae93c" PRIMARY KEY ("id")
);
-- Create index "IDX_1577da0add257816f329b24026" to table: "balance_transactions"
CREATE INDEX "IDX_1577da0add257816f329b24026" ON "public"."balance_transactions" ("userId");
-- Create index "IDX_278661dc3efbd56e3c81d25f31" to table: "balance_transactions"
CREATE INDEX "IDX_278661dc3efbd56e3c81d25f31" ON "public"."balance_transactions" ("orderId");
-- Create index "IDX_59791f8aa72b034cfec084b9c6" to table: "balance_transactions"
CREATE INDEX "IDX_59791f8aa72b034cfec084b9c6" ON "public"."balance_transactions" ("type");
-- Create index "IDX_703830d310eec53e6da6e69f45" to table: "balance_transactions"
CREATE INDEX "IDX_703830d310eec53e6da6e69f45" ON "public"."balance_transactions" ("status");
-- Create index "IDX_8ea932bb128ab7f714a130ed5c" to table: "balance_transactions"
CREATE INDEX "IDX_8ea932bb128ab7f714a130ed5c" ON "public"."balance_transactions" ("balanceId");
-- Create index "IDX_c5f10ae7d80c42ca81e31c4e1d" to table: "balance_transactions"
CREATE INDEX "IDX_c5f10ae7d80c42ca81e31c4e1d" ON "public"."balance_transactions" ("paymentId");
-- Create enum type "billing_rules_ruletype_enum"
CREATE TYPE "public"."billing_rules_ruletype_enum" AS ENUM ('fixed', 'pay_per_use', 'tiered', 'volume', 'time_based');
-- Create enum type "billing_rules_resourcetype_enum"
CREATE TYPE "public"."billing_rules_resourcetype_enum" AS ENUM ('device', 'cpu', 'memory', 'storage', 'bandwidth', 'duration');
-- Create enum type "billing_rules_billingunit_enum"
CREATE TYPE "public"."billing_rules_billingunit_enum" AS ENUM ('hour', 'day', 'month', 'gb', 'unit');
-- Create "atlas_schema_revisions" table
CREATE TABLE "atlas_schema_revisions"."atlas_schema_revisions" (
  "version" character varying NOT NULL,
  "description" character varying NOT NULL,
  "type" bigint NOT NULL DEFAULT 2,
  "applied" bigint NOT NULL DEFAULT 0,
  "total" bigint NOT NULL DEFAULT 0,
  "executed_at" timestamptz NOT NULL,
  "execution_time" bigint NOT NULL,
  "error" text NULL,
  "error_stmt" text NULL,
  "hash" character varying NOT NULL,
  "partial_hashes" jsonb NULL,
  "operator_version" character varying NOT NULL,
  PRIMARY KEY ("version")
);
-- Create "billing_rules" table
CREATE TABLE "public"."billing_rules" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" text NULL,
  "ruleType" "public"."billing_rules_ruletype_enum" NOT NULL,
  "resourceType" "public"."billing_rules_resourcetype_enum" NOT NULL,
  "billingUnit" "public"."billing_rules_billingunit_enum" NOT NULL,
  "fixedPrice" numeric(10,4) NULL,
  "unitPrice" numeric(10,4) NULL,
  "tiers" jsonb NULL,
  "timeBasedPricing" jsonb NULL,
  "priority" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "validFrom" timestamp NULL,
  "validUntil" timestamp NULL,
  "conditions" jsonb NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_a5ff5261e3c093c133364746695" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_a17b9b02ccd3bbc0493f0a31c83" UNIQUE ("name")
);
-- Create index "IDX_35d062aa78d26c561154b03b96" to table: "billing_rules"
CREATE INDEX "IDX_35d062aa78d26c561154b03b96" ON "public"."billing_rules" ("ruleType");
-- Create index "IDX_9a240b98575a7e261dc1bbb977" to table: "billing_rules"
CREATE INDEX "IDX_9a240b98575a7e261dc1bbb977" ON "public"."billing_rules" ("resourceType");
-- Create index "IDX_a17b9b02ccd3bbc0493f0a31c8" to table: "billing_rules"
CREATE INDEX "IDX_a17b9b02ccd3bbc0493f0a31c8" ON "public"."billing_rules" ("name");
-- Create "invoices" table
CREATE TABLE "public"."invoices" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "invoiceNumber" character varying NOT NULL,
  "userId" uuid NOT NULL,
  "type" "public"."invoices_type_enum" NOT NULL DEFAULT 'monthly',
  "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'draft',
  "subtotal" numeric(15,2) NOT NULL,
  "tax" numeric(10,2) NOT NULL DEFAULT 0,
  "discount" numeric(10,2) NOT NULL DEFAULT 0,
  "total" numeric(15,2) NOT NULL,
  "items" jsonb NOT NULL,
  "billingPeriodStart" date NOT NULL,
  "billingPeriodEnd" date NOT NULL,
  "dueDate" date NOT NULL,
  "paidAt" timestamp NULL,
  "paymentId" character varying NULL,
  "paymentMethod" character varying NULL,
  "notes" text NULL,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber")
);
-- Create index "IDX_2b9bec0c008a1c631aa6d68d71" to table: "invoices"
CREATE INDEX "IDX_2b9bec0c008a1c631aa6d68d71" ON "public"."invoices" ("type");
-- Create index "IDX_3e190acb65bf6cef7187cf728d" to table: "invoices"
CREATE INDEX "IDX_3e190acb65bf6cef7187cf728d" ON "public"."invoices" ("billingPeriodStart");
-- Create index "IDX_41ee6a6636d48aac700fb52e0b" to table: "invoices"
CREATE INDEX "IDX_41ee6a6636d48aac700fb52e0b" ON "public"."invoices" ("dueDate");
-- Create index "IDX_64923f3a8d3f3247dd5fe9f43c" to table: "invoices"
CREATE INDEX "IDX_64923f3a8d3f3247dd5fe9f43c" ON "public"."invoices" ("paymentId");
-- Create index "IDX_805b3e07beb3671072858eab45" to table: "invoices"
CREATE INDEX "IDX_805b3e07beb3671072858eab45" ON "public"."invoices" ("billingPeriodEnd");
-- Create index "IDX_ac0f09364e3701d9ed35435288" to table: "invoices"
CREATE INDEX "IDX_ac0f09364e3701d9ed35435288" ON "public"."invoices" ("status");
-- Create index "IDX_bf8e0f9dd4558ef209ec111782" to table: "invoices"
CREATE INDEX "IDX_bf8e0f9dd4558ef209ec111782" ON "public"."invoices" ("invoiceNumber");
-- Create index "IDX_fcbe490dc37a1abf68f19c5ccb" to table: "invoices"
CREATE INDEX "IDX_fcbe490dc37a1abf68f19c5ccb" ON "public"."invoices" ("userId");
-- Create "orders" table
CREATE TABLE "public"."orders" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "userId" character varying NOT NULL,
  "tenantId" character varying NULL,
  "orderNumber" character varying NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "discountAmount" numeric(10,2) NOT NULL DEFAULT 0,
  "finalAmount" numeric(10,2) NOT NULL,
  "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending',
  "paymentMethod" "public"."orders_paymentmethod_enum" NULL,
  "planId" character varying NULL,
  "deviceId" character varying NULL,
  "description" text NULL,
  "metadata" jsonb NULL,
  "transactionId" character varying NULL,
  "paidAt" timestamp NULL,
  "cancelledAt" timestamp NULL,
  "refundedAt" timestamp NULL,
  "expiresAt" timestamp NULL,
  "cancelReason" text NULL,
  "refundReason" text NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")
);
-- Create index "IDX_151b79a83ba240b0cb31b2302d" to table: "orders"
CREATE INDEX "IDX_151b79a83ba240b0cb31b2302d" ON "public"."orders" ("userId");
-- Create index "IDX_208a358e9fe8abe6e1d8245980" to table: "orders"
CREATE INDEX "IDX_208a358e9fe8abe6e1d8245980" ON "public"."orders" ("tenantId");
-- Create index "IDX_59b0c3b34ea0fa5562342f2414" to table: "orders"
CREATE INDEX "IDX_59b0c3b34ea0fa5562342f2414" ON "public"."orders" ("orderNumber");
-- Create index "IDX_775c9f06fc27ae3ff8fb26f2c4" to table: "orders"
CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "public"."orders" ("status");
-- Create "user_balances" table
CREATE TABLE "public"."user_balances" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "balance" numeric(15,2) NOT NULL DEFAULT 0,
  "frozenAmount" numeric(15,2) NOT NULL DEFAULT 0,
  "totalRecharge" numeric(15,2) NOT NULL DEFAULT 0,
  "totalConsumption" numeric(15,2) NOT NULL DEFAULT 0,
  "status" "public"."user_balances_status_enum" NOT NULL DEFAULT 'normal',
  "lowBalanceThreshold" numeric(10,2) NOT NULL DEFAULT 100,
  "autoRecharge" boolean NOT NULL DEFAULT true,
  "autoRechargeAmount" numeric(10,2) NULL,
  "autoRechargeTrigger" numeric(10,2) NULL,
  "lastRechargeAt" timestamp NULL,
  "lastConsumeAt" timestamp NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_bf6c91bf949d39175f095c6c3d4" PRIMARY KEY ("id")
);
-- Create index "IDX_fc961fea2e90ea93847e43f7b4" to table: "user_balances"
CREATE UNIQUE INDEX "IDX_fc961fea2e90ea93847e43f7b4" ON "public"."user_balances" ("userId");
-- Create "plans" table
CREATE TABLE "public"."plans" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "name" character varying NOT NULL,
  "description" text NULL,
  "type" "public"."plans_type_enum" NOT NULL DEFAULT 'basic',
  "price" numeric(10,2) NOT NULL,
  "billingCycle" "public"."plans_billingcycle_enum" NOT NULL DEFAULT 'monthly',
  "deviceQuota" integer NOT NULL DEFAULT 0,
  "storageQuotaGB" integer NOT NULL DEFAULT 0,
  "trafficQuotaGB" integer NOT NULL DEFAULT 0,
  "features" jsonb NULL,
  "metadata" jsonb NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "isPublic" boolean NOT NULL DEFAULT false,
  "tenantId" character varying NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_253d25dae4c94ee913bc5ec4850" UNIQUE ("name")
);
-- Create index "IDX_07200ddb231df8e6a579219256" to table: "plans"
CREATE INDEX "IDX_07200ddb231df8e6a579219256" ON "public"."plans" ("tenantId");
-- Create index "IDX_253d25dae4c94ee913bc5ec485" to table: "plans"
CREATE INDEX "IDX_253d25dae4c94ee913bc5ec485" ON "public"."plans" ("name");
-- Create "usage_records" table
CREATE TABLE "public"."usage_records" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "userId" character varying NOT NULL,
  "tenantId" character varying NULL,
  "deviceId" character varying NOT NULL,
  "usageType" "public"."usage_records_usagetype_enum" NOT NULL DEFAULT 'device_usage',
  "quantity" numeric(10,2) NOT NULL DEFAULT 0,
  "unit" character varying NOT NULL DEFAULT 'hour',
  "cost" numeric(10,2) NOT NULL DEFAULT 0,
  "startTime" timestamp NOT NULL,
  "endTime" timestamp NULL,
  "durationSeconds" integer NOT NULL DEFAULT 0,
  "orderId" character varying NULL,
  "isBilled" boolean NOT NULL DEFAULT false,
  "metadata" jsonb NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY ("id")
);
-- Create index "IDX_1ab50aa2642b97103ab39f59c3" to table: "usage_records"
CREATE INDEX "IDX_1ab50aa2642b97103ab39f59c3" ON "public"."usage_records" ("usageType");
-- Create index "IDX_26b7c842dadf236757286d0092" to table: "usage_records"
CREATE INDEX "IDX_26b7c842dadf236757286d0092" ON "public"."usage_records" ("userId");
-- Create index "IDX_6d552c70389fc376518bbbf55a" to table: "usage_records"
CREATE INDEX "IDX_6d552c70389fc376518bbbf55a" ON "public"."usage_records" ("startTime");
-- Create index "IDX_7da0e8602df6cfa94fdf1ab31a" to table: "usage_records"
CREATE INDEX "IDX_7da0e8602df6cfa94fdf1ab31a" ON "public"."usage_records" ("deviceId");
-- Create index "IDX_88fb4ce77319ad67394471e6af" to table: "usage_records"
CREATE INDEX "IDX_88fb4ce77319ad67394471e6af" ON "public"."usage_records" ("tenantId");
-- Create index "IDX_a410b24e0897b758d840c4396d" to table: "usage_records"
CREATE INDEX "IDX_a410b24e0897b758d840c4396d" ON "public"."usage_records" ("endTime");
-- Create index "IDX_d4c682a4405c1204dd3abd57d0" to table: "usage_records"
CREATE INDEX "IDX_d4c682a4405c1204dd3abd57d0" ON "public"."usage_records" ("isBilled");
-- Create "payments" table
CREATE TABLE "public"."payments" (
  "id" uuid NOT NULL DEFAULT public.uuid_generate_v4(),
  "order_id" uuid NOT NULL,
  "user_id" character varying NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "method" "public"."payments_method_enum" NOT NULL DEFAULT 'wechat',
  "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
  "transaction_id" character varying NULL,
  "payment_no" character varying NOT NULL,
  "raw_response" jsonb NULL,
  "payment_url" character varying NULL,
  "failure_reason" character varying NULL,
  "refund_amount" numeric(10,2) NULL,
  "refund_reason" character varying NULL,
  "paid_at" timestamp NULL,
  "refunded_at" timestamp NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_8aaa54db3d9827cba0999b7fb26" UNIQUE ("payment_no"),
  CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "public"."orders" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
