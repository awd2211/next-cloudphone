--
-- PostgreSQL database dump
--

\restrict RQV02rkNH5esaCZ5EeK8GQrqhsPsuRazOBy0pc6wtSDgr0A4U8LnA6B9REc7bou

-- Dumped from database version 14.19
-- Dumped by pg_dump version 14.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: balance_transactions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.balance_transactions_status_enum AS ENUM (
    'pending',
    'success',
    'failed',
    'cancelled'
);


ALTER TYPE public.balance_transactions_status_enum OWNER TO postgres;

--
-- Name: balance_transactions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.balance_transactions_type_enum AS ENUM (
    'recharge',
    'consume',
    'refund',
    'freeze',
    'unfreeze',
    'adjustment',
    'reward'
);


ALTER TYPE public.balance_transactions_type_enum OWNER TO postgres;

--
-- Name: billing_rules_billingunit_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billing_rules_billingunit_enum AS ENUM (
    'hour',
    'day',
    'month',
    'gb',
    'unit'
);


ALTER TYPE public.billing_rules_billingunit_enum OWNER TO postgres;

--
-- Name: billing_rules_resourcetype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billing_rules_resourcetype_enum AS ENUM (
    'device',
    'cpu',
    'memory',
    'storage',
    'bandwidth',
    'duration'
);


ALTER TYPE public.billing_rules_resourcetype_enum OWNER TO postgres;

--
-- Name: billing_rules_ruletype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billing_rules_ruletype_enum AS ENUM (
    'fixed',
    'pay_per_use',
    'tiered',
    'volume',
    'time_based'
);


ALTER TYPE public.billing_rules_ruletype_enum OWNER TO postgres;

--
-- Name: invoices_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoices_status_enum AS ENUM (
    'draft',
    'pending',
    'paid',
    'overdue',
    'cancelled',
    'refunded'
);


ALTER TYPE public.invoices_status_enum OWNER TO postgres;

--
-- Name: invoices_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoices_type_enum AS ENUM (
    'monthly',
    'recharge',
    'adjustment',
    'refund'
);


ALTER TYPE public.invoices_type_enum OWNER TO postgres;

--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_channel AS ENUM (
    'websocket',
    'email',
    'sms'
);


ALTER TYPE public.notification_channel OWNER TO postgres;

--
-- Name: notification_preferences_notificationtype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_preferences_notificationtype_enum AS ENUM (
    'device.created',
    'device.creation_failed',
    'device.started',
    'device.stopped',
    'device.error',
    'device.connection_lost',
    'device.deleted',
    'device.expiring_soon',
    'device.expired',
    'app.installed',
    'app.uninstalled',
    'app.install_failed',
    'app.approved',
    'app.rejected',
    'billing.low_balance',
    'billing.payment_success',
    'billing.payment_failed',
    'billing.invoice_generated',
    'billing.subscription_expiring',
    'billing.subscription_expired',
    'user.registered',
    'user.login',
    'user.password_changed',
    'user.profile_updated',
    'system.maintenance',
    'system.announcement',
    'system.update',
    'system.security_alert'
);


ALTER TYPE public.notification_preferences_notificationtype_enum OWNER TO postgres;

--
-- Name: notification_templates_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notification_templates_type_enum AS ENUM (
    'device.created',
    'device.creation_failed',
    'device.started',
    'device.stopped',
    'device.error',
    'device.connection_lost',
    'device.deleted',
    'device.expiring_soon',
    'device.expired',
    'app.installed',
    'app.uninstalled',
    'app.install_failed',
    'app.approved',
    'app.rejected',
    'billing.low_balance',
    'billing.payment_success',
    'billing.payment_failed',
    'billing.invoice_generated',
    'billing.subscription_expiring',
    'billing.subscription_expired',
    'user.registered',
    'user.login',
    'user.password_changed',
    'user.profile_updated',
    'system.maintenance',
    'system.announcement',
    'system.update',
    'system.security_alert'
);


ALTER TYPE public.notification_templates_type_enum OWNER TO postgres;

--
-- Name: notifications_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_status_enum AS ENUM (
    'pending',
    'sent',
    'read',
    'failed'
);


ALTER TYPE public.notifications_status_enum OWNER TO postgres;

--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_type_enum AS ENUM (
    'system',
    'device',
    'app',
    'billing',
    'user',
    'alert',
    'message'
);


ALTER TYPE public.notifications_type_enum OWNER TO postgres;

--
-- Name: orders_paymentmethod_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_paymentmethod_enum AS ENUM (
    'wechat',
    'alipay',
    'stripe',
    'balance'
);


ALTER TYPE public.orders_paymentmethod_enum OWNER TO postgres;

--
-- Name: orders_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.orders_status_enum AS ENUM (
    'pending',
    'paid',
    'cancelled',
    'refunded',
    'failed'
);


ALTER TYPE public.orders_status_enum OWNER TO postgres;

--
-- Name: payment_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_mode AS ENUM (
    'hosted',
    'custom'
);


ALTER TYPE public.payment_mode OWNER TO postgres;

--
-- Name: payments_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payments_method_enum AS ENUM (
    'wechat',
    'alipay',
    'balance',
    'stripe',
    'paypal',
    'paddle'
);


ALTER TYPE public.payments_method_enum OWNER TO postgres;

--
-- Name: payments_payment_mode_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payments_payment_mode_enum AS ENUM (
    'hosted',
    'custom'
);


ALTER TYPE public.payments_payment_mode_enum OWNER TO postgres;

--
-- Name: payments_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payments_status_enum AS ENUM (
    'pending',
    'processing',
    'success',
    'failed',
    'refunding',
    'refunded',
    'cancelled'
);


ALTER TYPE public.payments_status_enum OWNER TO postgres;

--
-- Name: plans_billingcycle_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.plans_billingcycle_enum AS ENUM (
    'hourly',
    'daily',
    'monthly',
    'yearly'
);


ALTER TYPE public.plans_billingcycle_enum OWNER TO postgres;

--
-- Name: plans_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.plans_type_enum AS ENUM (
    'free',
    'basic',
    'pro',
    'enterprise'
);


ALTER TYPE public.plans_type_enum OWNER TO postgres;

--
-- Name: sms_records_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sms_records_status_enum AS ENUM (
    'pending',
    'sent',
    'delivered',
    'failed'
);


ALTER TYPE public.sms_records_status_enum OWNER TO postgres;

--
-- Name: subscriptions_interval_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscriptions_interval_enum AS ENUM (
    'day',
    'week',
    'month',
    'year'
);


ALTER TYPE public.subscriptions_interval_enum OWNER TO postgres;

--
-- Name: subscriptions_provider_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscriptions_provider_enum AS ENUM (
    'stripe',
    'paypal',
    'paddle'
);


ALTER TYPE public.subscriptions_provider_enum OWNER TO postgres;

--
-- Name: subscriptions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscriptions_status_enum AS ENUM (
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'trialing',
    'unpaid',
    'paused'
);


ALTER TYPE public.subscriptions_status_enum OWNER TO postgres;

--
-- Name: usage_records_usagetype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.usage_records_usagetype_enum AS ENUM (
    'device_usage',
    'storage_usage',
    'traffic_usage',
    'api_call'
);


ALTER TYPE public.usage_records_usagetype_enum OWNER TO postgres;

--
-- Name: user_balances_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_balances_status_enum AS ENUM (
    'normal',
    'low',
    'insufficient',
    'frozen'
);


ALTER TYPE public.user_balances_status_enum OWNER TO postgres;

--
-- Name: update_notification_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_notification_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_notification_preferences_updated_at() OWNER TO postgres;

--
-- Name: update_saga_state_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_saga_state_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_saga_state_updated_at() OWNER TO postgres;

--
-- Name: update_sms_records_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sms_records_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_sms_records_updated_at() OWNER TO postgres;

--
-- Name: update_subscriptions_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_subscriptions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_subscriptions_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: balance_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.balance_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "balanceId" uuid NOT NULL,
    type public.balance_transactions_type_enum NOT NULL,
    amount numeric(15,2) NOT NULL,
    "balanceBefore" numeric(15,2) NOT NULL,
    "balanceAfter" numeric(15,2) NOT NULL,
    status public.balance_transactions_status_enum DEFAULT 'pending'::public.balance_transactions_status_enum NOT NULL,
    "orderId" character varying,
    "paymentId" character varying,
    "deviceId" character varying,
    description text,
    metadata jsonb,
    "operatorId" character varying,
    "ipAddress" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.balance_transactions OWNER TO postgres;

--
-- Name: billing_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description text,
    "ruleType" public.billing_rules_ruletype_enum NOT NULL,
    "resourceType" public.billing_rules_resourcetype_enum NOT NULL,
    "billingUnit" public.billing_rules_billingunit_enum NOT NULL,
    "fixedPrice" numeric(10,4),
    "unitPrice" numeric(10,4),
    tiers jsonb,
    "timeBasedPricing" jsonb,
    priority integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "validFrom" timestamp without time zone,
    "validUntil" timestamp without time zone,
    conditions jsonb,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.billing_rules OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "invoiceNumber" character varying NOT NULL,
    "userId" uuid NOT NULL,
    type public.invoices_type_enum DEFAULT 'monthly'::public.invoices_type_enum NOT NULL,
    status public.invoices_status_enum DEFAULT 'draft'::public.invoices_status_enum NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    tax numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) NOT NULL,
    items jsonb NOT NULL,
    "billingPeriodStart" date NOT NULL,
    "billingPeriodEnd" date NOT NULL,
    "dueDate" date NOT NULL,
    "paidAt" timestamp without time zone,
    "paymentId" character varying,
    "paymentMethod" character varying,
    notes text,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "userId" character varying(255) NOT NULL,
    "notificationType" public.notification_preferences_notificationtype_enum NOT NULL,
    "enabledChannels" text DEFAULT ''::text NOT NULL,
    "customSettings" jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    type public.notification_templates_type_enum NOT NULL,
    title character varying(200) NOT NULL,
    body text NOT NULL,
    email_template text,
    sms_template text,
    channels text[] NOT NULL,
    default_data jsonb,
    language character varying(10) DEFAULT 'zh-CN'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_templates OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    type public.notifications_type_enum DEFAULT 'system'::public.notifications_type_enum NOT NULL,
    status public.notifications_status_enum DEFAULT 'pending'::public.notifications_status_enum NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    data jsonb,
    channels text,
    "templateId" uuid,
    "sentAt" timestamp without time zone,
    "readAt" timestamp without time zone,
    "expiresAt" timestamp without time zone,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "errorMessage" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    "userName" character varying,
    "userEmail" character varying,
    "tenantId" character varying,
    "orderNumber" character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "finalAmount" numeric(10,2) NOT NULL,
    status public.orders_status_enum DEFAULT 'pending'::public.orders_status_enum NOT NULL,
    "paymentMethod" public.orders_paymentmethod_enum,
    "planId" character varying,
    "deviceId" character varying,
    "deviceName" character varying,
    description text,
    metadata jsonb,
    "transactionId" character varying,
    "paidAt" timestamp without time zone,
    "cancelledAt" timestamp without time zone,
    "refundedAt" timestamp without time zone,
    "expiresAt" timestamp without time zone,
    "cancelReason" text,
    "refundReason" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    user_id character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    method public.payments_method_enum DEFAULT 'wechat'::public.payments_method_enum NOT NULL,
    status public.payments_status_enum DEFAULT 'pending'::public.payments_status_enum NOT NULL,
    transaction_id character varying,
    payment_no character varying NOT NULL,
    raw_response jsonb,
    payment_url character varying,
    failure_reason character varying,
    refund_amount numeric(10,2),
    refund_reason character varying,
    paid_at timestamp without time zone,
    refunded_at timestamp without time zone,
    expires_at timestamp without time zone NOT NULL,
    currency character varying(3) DEFAULT 'CNY'::character varying NOT NULL,
    payment_mode public.payments_payment_mode_enum,
    subscription_id character varying,
    client_secret character varying,
    customer_id character varying,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description text,
    type public.plans_type_enum DEFAULT 'basic'::public.plans_type_enum NOT NULL,
    price numeric(10,2) NOT NULL,
    "billingCycle" public.plans_billingcycle_enum DEFAULT 'monthly'::public.plans_billingcycle_enum NOT NULL,
    "deviceQuota" integer DEFAULT 0 NOT NULL,
    "storageQuotaGB" integer DEFAULT 0 NOT NULL,
    "trafficQuotaGB" integer DEFAULT 0 NOT NULL,
    features jsonb,
    metadata jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "tenantId" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: saga_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saga_state (
    id bigint NOT NULL,
    saga_id character varying(100) NOT NULL,
    saga_type character varying(50) NOT NULL,
    current_step character varying(100) NOT NULL,
    step_index integer DEFAULT 0 NOT NULL,
    state jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'RUNNING'::character varying NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    timeout_at timestamp without time zone,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT saga_state_status_check CHECK (((status)::text = ANY ((ARRAY['RUNNING'::character varying, 'COMPLETED'::character varying, 'COMPENSATING'::character varying, 'COMPENSATED'::character varying, 'FAILED'::character varying, 'TIMEOUT'::character varying])::text[]))),
    CONSTRAINT saga_state_type_check CHECK (((saga_type)::text = ANY ((ARRAY['PAYMENT_REFUND'::character varying, 'DEVICE_CREATION'::character varying, 'APP_UPLOAD'::character varying])::text[])))
);


ALTER TABLE public.saga_state OWNER TO postgres;

--
-- Name: TABLE saga_state; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.saga_state IS 'Stores state of long-running distributed transactions (Sagas) for reliable orchestration with compensation logic';


--
-- Name: COLUMN saga_state.saga_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.saga_id IS 'Unique identifier for the saga instance (UUID format)';


--
-- Name: COLUMN saga_state.saga_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.saga_type IS 'Type of saga: PAYMENT_REFUND, DEVICE_CREATION, APP_UPLOAD';


--
-- Name: COLUMN saga_state.current_step; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.current_step IS 'Name of the current step being executed';


--
-- Name: COLUMN saga_state.step_index; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.step_index IS 'Zero-based index of the current step (for compensation ordering)';


--
-- Name: COLUMN saga_state.state; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.state IS 'JSONB object containing saga-specific state data (entity IDs, intermediate results, etc.)';


--
-- Name: COLUMN saga_state.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.status IS 'Saga status: RUNNING, COMPLETED, COMPENSATING, COMPENSATED, FAILED, TIMEOUT';


--
-- Name: COLUMN saga_state.error_message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.error_message IS 'Last error message if saga failed or is compensating';


--
-- Name: COLUMN saga_state.retry_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.retry_count IS 'Number of retry attempts for the current step';


--
-- Name: COLUMN saga_state.max_retries; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.max_retries IS 'Maximum retry attempts before triggering compensation';


--
-- Name: COLUMN saga_state.timeout_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.timeout_at IS 'Timestamp when saga should timeout if not completed';


--
-- Name: COLUMN saga_state.started_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.started_at IS 'Timestamp when saga execution started';


--
-- Name: COLUMN saga_state.completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.saga_state.completed_at IS 'Timestamp when saga reached terminal state (COMPLETED, COMPENSATED, FAILED)';


--
-- Name: saga_state_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.saga_state_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.saga_state_id_seq OWNER TO postgres;

--
-- Name: saga_state_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.saga_state_id_seq OWNED BY public.saga_state.id;


--
-- Name: sms_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sms_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    phone character varying(20) NOT NULL,
    content text NOT NULL,
    status public.sms_records_status_enum DEFAULT 'pending'::public.sms_records_status_enum NOT NULL,
    provider character varying(50) NOT NULL,
    "userId" uuid,
    "userName" character varying(100),
    "templateCode" character varying(50),
    "messageId" character varying(100),
    "errorMessage" text,
    "sentAt" timestamp without time zone,
    "deliveredAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    variables json
);


ALTER TABLE public.sms_records OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider public.subscriptions_provider_enum NOT NULL,
    status public.subscriptions_status_enum DEFAULT 'active'::public.subscriptions_status_enum NOT NULL,
    price numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    "interval" public.subscriptions_interval_enum DEFAULT 'month'::public.subscriptions_interval_enum NOT NULL,
    interval_count integer DEFAULT 1 NOT NULL,
    current_period_start timestamp without time zone NOT NULL,
    current_period_end timestamp without time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    canceled_at timestamp without time zone,
    trial_start timestamp without time zone,
    trial_end timestamp without time zone,
    next_billing_date timestamp without time zone,
    started_at timestamp without time zone,
    ended_at timestamp without time zone,
    metadata jsonb,
    failed_payment_count integer DEFAULT 0 NOT NULL,
    discount numeric(10,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id character varying NOT NULL,
    plan_id character varying NOT NULL,
    external_subscription_id character varying NOT NULL,
    external_customer_id character varying,
    latest_payment_id character varying,
    coupon_code character varying
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: typeorm_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.typeorm_migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.typeorm_migrations OWNER TO postgres;

--
-- Name: typeorm_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.typeorm_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.typeorm_migrations_id_seq OWNER TO postgres;

--
-- Name: typeorm_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.typeorm_migrations_id_seq OWNED BY public.typeorm_migrations.id;


--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" character varying NOT NULL,
    "tenantId" character varying,
    "deviceId" character varying NOT NULL,
    "usageType" public.usage_records_usagetype_enum DEFAULT 'device_usage'::public.usage_records_usagetype_enum NOT NULL,
    quantity numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    unit character varying DEFAULT 'hour'::character varying NOT NULL,
    cost numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    "startTime" timestamp without time zone NOT NULL,
    "endTime" timestamp without time zone,
    "durationSeconds" integer DEFAULT 0 NOT NULL,
    "orderId" character varying,
    "isBilled" boolean DEFAULT false NOT NULL,
    metadata jsonb,
    "providerType" character varying(20),
    "deviceType" character varying(10),
    "deviceName" character varying(255),
    "deviceConfig" jsonb,
    "billingRate" numeric(10,4) DEFAULT '0'::numeric NOT NULL,
    "pricingTier" character varying(20),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usage_records OWNER TO postgres;

--
-- Name: user_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_balances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    balance numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "frozenAmount" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "totalRecharge" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    "totalConsumption" numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    status public.user_balances_status_enum DEFAULT 'normal'::public.user_balances_status_enum NOT NULL,
    "lowBalanceThreshold" numeric(10,2) DEFAULT '100'::numeric NOT NULL,
    "autoRecharge" boolean DEFAULT true NOT NULL,
    "autoRechargeAmount" numeric(10,2),
    "autoRechargeTrigger" numeric(10,2),
    "lastRechargeAt" timestamp without time zone,
    "lastConsumeAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_balances OWNER TO postgres;

--
-- Name: saga_state id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saga_state ALTER COLUMN id SET DEFAULT nextval('public.saga_state_id_seq'::regclass);


--
-- Name: typeorm_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.typeorm_migrations ALTER COLUMN id SET DEFAULT nextval('public.typeorm_migrations_id_seq'::regclass);


--
-- Data for Name: balance_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.balance_transactions (id, "userId", "balanceId", type, amount, "balanceBefore", "balanceAfter", status, "orderId", "paymentId", "deviceId", description, metadata, "operatorId", "ipAddress", "createdAt") FROM stdin;
\.


--
-- Data for Name: billing_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_rules (id, name, description, "ruleType", "resourceType", "billingUnit", "fixedPrice", "unitPrice", tiers, "timeBasedPricing", priority, "isActive", "validFrom", "validUntil", conditions, metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, "invoiceNumber", "userId", type, status, subtotal, tax, discount, total, items, "billingPeriodStart", "billingPeriodEnd", "dueDate", "paidAt", "paymentId", "paymentMethod", notes, metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_preferences (id, enabled, "userId", "notificationType", "enabledChannels", "customSettings", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_templates (id, code, name, type, title, body, email_template, sms_template, channels, default_data, language, is_active, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, "userId", type, status, title, message, data, channels, "templateId", "sentAt", "readAt", "expiresAt", "retryCount", "errorMessage", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, "userId", "userName", "userEmail", "tenantId", "orderNumber", amount, "discountAmount", "finalAmount", status, "paymentMethod", "planId", "deviceId", "deviceName", description, metadata, "transactionId", "paidAt", "cancelledAt", "refundedAt", "expiresAt", "cancelReason", "refundReason", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, user_id, amount, method, status, transaction_id, payment_no, raw_response, payment_url, failure_reason, refund_amount, refund_reason, paid_at, refunded_at, expires_at, currency, payment_mode, subscription_id, client_secret, customer_id, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, name, description, type, price, "billingCycle", "deviceQuota", "storageQuotaGB", "trafficQuotaGB", features, metadata, "isActive", "isPublic", "tenantId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: saga_state; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.saga_state (id, saga_id, saga_type, current_step, step_index, state, status, error_message, retry_count, max_retries, timeout_at, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sms_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sms_records (id, phone, content, status, provider, "userId", "userName", "templateCode", "messageId", "errorMessage", "sentAt", "deliveredAt", "createdAt", "updatedAt", variables) FROM stdin;
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, provider, status, price, currency, "interval", interval_count, current_period_start, current_period_end, cancel_at_period_end, canceled_at, trial_start, trial_end, next_billing_date, started_at, ended_at, metadata, failed_payment_count, discount, created_at, updated_at, user_id, plan_id, external_subscription_id, external_customer_id, latest_payment_id, coupon_code) FROM stdin;
\.


--
-- Data for Name: typeorm_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.typeorm_migrations (id, "timestamp", name) FROM stdin;
1	1730419200000	BaselineFromExisting1730419200000
\.


--
-- Data for Name: usage_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage_records (id, "userId", "tenantId", "deviceId", "usageType", quantity, unit, cost, "startTime", "endTime", "durationSeconds", "orderId", "isBilled", metadata, "providerType", "deviceType", "deviceName", "deviceConfig", "billingRate", "pricingTier", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_balances (id, "userId", balance, "frozenAmount", "totalRecharge", "totalConsumption", status, "lowBalanceThreshold", "autoRecharge", "autoRechargeAmount", "autoRechargeTrigger", "lastRechargeAt", "lastConsumeAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: saga_state_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.saga_state_id_seq', 1, false);


--
-- Name: typeorm_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.typeorm_migrations_id_seq', 1, true);


--
-- Name: payments PK_197ab7af18c93fbb0c9b28b4a59; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY (id);


--
-- Name: plans PK_3720521a81c7c24fe9b7202ba61; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY (id);


--
-- Name: invoices PK_668cef7c22a427fd822cc1be3ce; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: balance_transactions PK_6aea2d6b103d342d343be2ae93c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transactions
    ADD CONSTRAINT "PK_6aea2d6b103d342d343be2ae93c" PRIMARY KEY (id);


--
-- Name: orders PK_710e2d4957aa5878dfe94e4ac2f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY (id);


--
-- Name: notification_templates PK_76f0fc48b8d057d2ae7f3a2848a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT "PK_76f0fc48b8d057d2ae7f3a2848a" PRIMARY KEY (id);


--
-- Name: billing_rules PK_a5ff5261e3c093c133364746695; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_rules
    ADD CONSTRAINT "PK_a5ff5261e3c093c133364746695" PRIMARY KEY (id);


--
-- Name: typeorm_migrations PK_bb2f075707dd300ba86d0208923; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.typeorm_migrations
    ADD CONSTRAINT "PK_bb2f075707dd300ba86d0208923" PRIMARY KEY (id);


--
-- Name: user_balances PK_bf6c91bf949d39175f095c6c3d4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_balances
    ADD CONSTRAINT "PK_bf6c91bf949d39175f095c6c3d4" PRIMARY KEY (id);


--
-- Name: usage_records PK_e511cf9f7dc53851569f87467a5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY (id);


--
-- Name: notification_templates UQ_0f527489aa40b6ba96faf6b5024; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT "UQ_0f527489aa40b6ba96faf6b5024" UNIQUE (code);


--
-- Name: plans UQ_253d25dae4c94ee913bc5ec4850; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT "UQ_253d25dae4c94ee913bc5ec4850" UNIQUE (name);


--
-- Name: payments UQ_8aaa54db3d9827cba0999b7fb26; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "UQ_8aaa54db3d9827cba0999b7fb26" UNIQUE (payment_no);


--
-- Name: billing_rules UQ_a17b9b02ccd3bbc0493f0a31c83; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_rules
    ADD CONSTRAINT "UQ_a17b9b02ccd3bbc0493f0a31c83" UNIQUE (name);


--
-- Name: subscriptions UQ_b8ce4160a5d62c05843439ef714; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "UQ_b8ce4160a5d62c05843439ef714" UNIQUE (external_subscription_id);


--
-- Name: invoices UQ_bf8e0f9dd4558ef209ec111782d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber");


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: saga_state saga_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saga_state
    ADD CONSTRAINT saga_state_pkey PRIMARY KEY (id);


--
-- Name: saga_state saga_state_saga_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saga_state
    ADD CONSTRAINT saga_state_saga_id_key UNIQUE (saga_id);


--
-- Name: sms_records sms_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sms_records
    ADD CONSTRAINT sms_records_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: IDX_07200ddb231df8e6a579219256; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_07200ddb231df8e6a579219256" ON public.plans USING btree ("tenantId");


--
-- Name: IDX_0aac65acff4b13e4496debe9c0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_0aac65acff4b13e4496debe9c0" ON public.notification_preferences USING btree ("userId", "notificationType");


--
-- Name: IDX_151b79a83ba240b0cb31b2302d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_151b79a83ba240b0cb31b2302d" ON public.orders USING btree ("userId");


--
-- Name: IDX_1577da0add257816f329b24026; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1577da0add257816f329b24026" ON public.balance_transactions USING btree ("userId");


--
-- Name: IDX_1a82f720b75736f6fcb1f42cce; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1a82f720b75736f6fcb1f42cce" ON public.notification_preferences USING btree ("notificationType");


--
-- Name: IDX_1ab50aa2642b97103ab39f59c3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1ab50aa2642b97103ab39f59c3" ON public.usage_records USING btree ("usageType");


--
-- Name: IDX_208a358e9fe8abe6e1d8245980; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_208a358e9fe8abe6e1d8245980" ON public.orders USING btree ("tenantId");


--
-- Name: IDX_21e65af2f4f242d4c85a92aff4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_21e65af2f4f242d4c85a92aff4" ON public.notifications USING btree ("userId", "createdAt");


--
-- Name: IDX_253d25dae4c94ee913bc5ec485; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_253d25dae4c94ee913bc5ec485" ON public.plans USING btree (name);


--
-- Name: IDX_26b7c842dadf236757286d0092; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_26b7c842dadf236757286d0092" ON public.usage_records USING btree ("userId");


--
-- Name: IDX_278661dc3efbd56e3c81d25f31; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_278661dc3efbd56e3c81d25f31" ON public.balance_transactions USING btree ("orderId");


--
-- Name: IDX_2b9bec0c008a1c631aa6d68d71; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_2b9bec0c008a1c631aa6d68d71" ON public.invoices USING btree (type);


--
-- Name: IDX_35d062aa78d26c561154b03b96; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_35d062aa78d26c561154b03b96" ON public.billing_rules USING btree ("ruleType");


--
-- Name: IDX_39862b1a722590857df5d1b2e3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_39862b1a722590857df5d1b2e3" ON public.notification_templates USING btree (type);


--
-- Name: IDX_3e190acb65bf6cef7187cf728d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_3e190acb65bf6cef7187cf728d" ON public.invoices USING btree ("billingPeriodStart");


--
-- Name: IDX_41ee6a6636d48aac700fb52e0b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_41ee6a6636d48aac700fb52e0b" ON public.invoices USING btree ("dueDate");


--
-- Name: IDX_487ad53b8e95224fd2f5ffe7e7; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_487ad53b8e95224fd2f5ffe7e7" ON public.sms_records USING btree (phone);


--
-- Name: IDX_59791f8aa72b034cfec084b9c6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_59791f8aa72b034cfec084b9c6" ON public.balance_transactions USING btree (type);


--
-- Name: IDX_59b0c3b34ea0fa5562342f2414; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_59b0c3b34ea0fa5562342f2414" ON public.orders USING btree ("orderNumber");


--
-- Name: IDX_64923f3a8d3f3247dd5fe9f43c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_64923f3a8d3f3247dd5fe9f43c" ON public.invoices USING btree ("paymentId");


--
-- Name: IDX_692a909ee0fa9383e7859f9b40; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON public.notifications USING btree ("userId");


--
-- Name: IDX_6d552c70389fc376518bbbf55a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6d552c70389fc376518bbbf55a" ON public.usage_records USING btree ("startTime");


--
-- Name: IDX_703830d310eec53e6da6e69f45; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_703830d310eec53e6da6e69f45" ON public.balance_transactions USING btree (status);


--
-- Name: IDX_775c9f06fc27ae3ff8fb26f2c4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON public.orders USING btree (status);


--
-- Name: IDX_78207b2dc2b0d717649e89d3fc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON public.notifications USING btree ("userId", status);


--
-- Name: IDX_7da0e8602df6cfa94fdf1ab31a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7da0e8602df6cfa94fdf1ab31a" ON public.usage_records USING btree ("deviceId");


--
-- Name: IDX_805b3e07beb3671072858eab45; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_805b3e07beb3671072858eab45" ON public.invoices USING btree ("billingPeriodEnd");


--
-- Name: IDX_88fb4ce77319ad67394471e6af; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_88fb4ce77319ad67394471e6af" ON public.usage_records USING btree ("tenantId");


--
-- Name: IDX_8ea932bb128ab7f714a130ed5c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8ea932bb128ab7f714a130ed5c" ON public.balance_transactions USING btree ("balanceId");


--
-- Name: IDX_92f5d3a7779be163cbea7916c6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_92f5d3a7779be163cbea7916c6" ON public.notifications USING btree (status);


--
-- Name: IDX_9a240b98575a7e261dc1bbb977; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_9a240b98575a7e261dc1bbb977" ON public.billing_rules USING btree ("resourceType");


--
-- Name: IDX_a17b9b02ccd3bbc0493f0a31c8; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_a17b9b02ccd3bbc0493f0a31c8" ON public.billing_rules USING btree (name);


--
-- Name: IDX_a410b24e0897b758d840c4396d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_a410b24e0897b758d840c4396d" ON public.usage_records USING btree ("endTime");


--
-- Name: IDX_a5984c9455a9f2a701b273a1df; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_a5984c9455a9f2a701b273a1df" ON public.usage_records USING btree ("deviceType");


--
-- Name: IDX_ac0f09364e3701d9ed35435288; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_ac0f09364e3701d9ed35435288" ON public.invoices USING btree (status);


--
-- Name: IDX_b20ffefc5071c7b63257ba4b6e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b20ffefc5071c7b63257ba4b6e" ON public.notification_templates USING btree (type, is_active);


--
-- Name: IDX_b70c44e8b00757584a39322559; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b70c44e8b00757584a39322559" ON public.notification_preferences USING btree ("userId");


--
-- Name: IDX_bf8e0f9dd4558ef209ec111782; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_bf8e0f9dd4558ef209ec111782" ON public.invoices USING btree ("invoiceNumber");


--
-- Name: IDX_c5f10ae7d80c42ca81e31c4e1d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_c5f10ae7d80c42ca81e31c4e1d" ON public.balance_transactions USING btree ("paymentId");


--
-- Name: IDX_c93ea1c3366b5965d301782572; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_c93ea1c3366b5965d301782572" ON public.usage_records USING btree ("providerType");


--
-- Name: IDX_d086c25cca84a50bfbe06c6a96; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d086c25cca84a50bfbe06c6a96" ON public.sms_records USING btree ("userId", "createdAt");


--
-- Name: IDX_d4c682a4405c1204dd3abd57d0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d4c682a4405c1204dd3abd57d0" ON public.usage_records USING btree ("isBilled");


--
-- Name: IDX_e2396215633c71c283f73b84f6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_e2396215633c71c283f73b84f6" ON public.sms_records USING btree (status);


--
-- Name: IDX_f7ee68ab0a32633c62cc9e63da; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f7ee68ab0a32633c62cc9e63da" ON public.usage_records USING btree ("pricingTier");


--
-- Name: IDX_fc961fea2e90ea93847e43f7b4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_fc961fea2e90ea93847e43f7b4" ON public.user_balances USING btree ("userId");


--
-- Name: IDX_fcbe490dc37a1abf68f19c5ccb; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fcbe490dc37a1abf68f19c5ccb" ON public.invoices USING btree ("userId");


--
-- Name: idx_saga_state_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saga_state_created_at ON public.saga_state USING btree (created_at);


--
-- Name: idx_saga_state_saga_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saga_state_saga_id ON public.saga_state USING btree (saga_id);


--
-- Name: idx_saga_state_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saga_state_status ON public.saga_state USING btree (status);


--
-- Name: idx_saga_state_status_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saga_state_status_type ON public.saga_state USING btree (status, saga_type);


--
-- Name: idx_saga_state_timeout; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saga_state_timeout ON public.saga_state USING btree (timeout_at) WHERE ((timeout_at IS NOT NULL) AND ((status)::text = 'RUNNING'::text));


--
-- Name: idx_saga_state_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_saga_state_type ON public.saga_state USING btree (saga_type);


--
-- Name: sms_records trigger_sms_records_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_sms_records_updated_at BEFORE UPDATE ON public.sms_records FOR EACH ROW EXECUTE FUNCTION public.update_sms_records_updated_at();


--
-- Name: subscriptions trigger_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_subscriptions_updated_at();


--
-- Name: notification_preferences trigger_update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();


--
-- Name: saga_state trigger_update_saga_state_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_saga_state_updated_at BEFORE UPDATE ON public.saga_state FOR EACH ROW EXECUTE FUNCTION public.update_saga_state_updated_at();


--
-- Name: payments FK_b2f7b823a21562eeca20e72b006; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict RQV02rkNH5esaCZ5EeK8GQrqhsPsuRazOBy0pc6wtSDgr0A4U8LnA6B9REc7bou

