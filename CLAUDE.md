# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cloud Phone Platform (云手机平台)** - An enterprise-grade cloud Android device management platform built on microservices architecture with multi-tenancy support, supporting large-scale deployments with high availability.

**Tech Stack:**
- Backend: NestJS (TypeScript), Go (Gin), Python (FastAPI)
- Frontend: React 18 + TypeScript + Ant Design (Pro)
- Infrastructure: PostgreSQL 14, Redis 7, RabbitMQ 3, MinIO, Consul
- Containerization: Docker + Redroid (Android containers)
- Monitoring: Prometheus + Grafana
- Package Manager: **pnpm** (workspace monorepo)

## Development Environment

### Service Management

**This project uses PM2 for process management in the local development environment.**

Common PM2 commands:
```bash
# View all services
pm2 list

# Restart a service
pm2 restart device-service
pm2 restart api-gateway

# View logs
pm2 logs device-service
pm2 logs device-service --lines 50

# Stop a service
pm2 stop device-service

# Delete a service from PM2
pm2 delete device-service
```

### Build and Run Commands

**Root-level commands (using pnpm workspaces):**
```bash
# Install dependencies for all services
pnpm install

# Build all services
pnpm build

# Run all services in development mode (parallel)
pnpm dev

# Run tests for all services
pnpm test
```

**Individual NestJS service commands** (in backend/*/):
```bash
# Development mode with hot-reload
pnpm dev

# Build TypeScript to dist/
pnpm build

# Production start
pnpm start:prod

# Lint and fix
pnpm lint

# Run tests
pnpm test
```

**Frontend commands** (in frontend/admin/ or frontend/user/):
```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Database Operations

**PostgreSQL databases:**
- `cloudphone` - Main database (shared tables)
- `cloudphone_user` - User service database
- `cloudphone_device` - Device service database

**Database migrations:**

Device Service uses **Atlas** for schema migrations:
```bash
cd backend/device-service

# Check migration status
pnpm migrate:status

# Apply migrations
pnpm migrate:apply

# Generate new migration
pnpm migrate:diff

# Validate migrations
pnpm migrate:validate
```

User Service uses SQL migration files:
```bash
# Apply user service migrations
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < backend/user-service/migrations/20251022120000_add_user_events_table.sql
```

### Infrastructure Services

**Start all infrastructure with Docker Compose:**
```bash
# Start PostgreSQL, Redis, RabbitMQ, MinIO, Consul
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop all
docker compose -f docker-compose.dev.yml down
```

**Service ports:**
- PostgreSQL: 5432
- Redis: 6379
- RabbitMQ: 5672 (AMQP), 15672 (Management UI)
- MinIO: 9000 (API), 9001 (Console)
- Consul: 8500 (HTTP/UI), 8600 (DNS)

## Microservices Architecture

### Service Responsibilities

**Backend Services:**

1. **api-gateway** (Port 30000) - Unified entry point
   - Routes requests to backend services
   - JWT authentication
   - Rate limiting
   - CORS handling

2. **user-service** (Port 30001) - User & Auth
   - User CRUD with CQRS + Event Sourcing
   - Authentication (JWT)
   - Role-based permissions (RBAC)
   - Multi-tenant quotas
   - Event Store with snapshots

3. **device-service** (Port 30002) - Cloud Phone Management
   - Docker container lifecycle management (Redroid)
   - ADB integration for Android control
   - Device monitoring with Prometheus metrics
   - Lifecycle automation (cleanup, autoscaling, backup)
   - Fault tolerance (retry, failover, state recovery)
   - Quota enforcement via QuotaGuard

4. **app-service** (Port 30003) - APK Management
   - APK upload/download (MinIO integration)
   - App installation/uninstallation via ADB
   - App marketplace

5. **billing-service** (Port 30005) - Billing & Metering
   - Usage metering (device time, resources)
   - Balance management
   - Plan subscriptions
   - Invoice generation

6. **notification-service** (Port 30006) - Multi-channel Notifications
   - WebSocket real-time notifications
   - Email notifications (with Handlebars templates)
   - SMS support (placeholder)
   - RabbitMQ event consumers with DLX
   - Template management system

7. **scheduler-service** (Port 30004) - Python/FastAPI
   - Resource scheduling and orchestration
   - Cron job management

8. **media-service** - Go/Gin (Port TBD)
   - WebRTC streaming for device screens
   - Screen recording

**Frontend Applications:**

- **admin** (Port 5173) - Admin dashboard (Ant Design Pro)
- **user** (Port 5174) - User portal (Ant Design)

### Shared Module (@cloudphone/shared)

Located in `backend/shared/`, provides common utilities:

- **EventBusService** - RabbitMQ event publishing
  - Methods: `publish()`, `publishDeviceEvent()`, `publishUserEvent()`, `publishBillingEvent()`
  - Exchange: `cloudphone.events`

- **ConsulModule** - Service registration and discovery

- **Event Schemas** - Typed event definitions
  - `app.events.ts` - App installation/uninstallation events
  - `notification.events.ts` - System-wide notification events

- **Logger Config** - Unified Pino logger setup with `createLoggerConfig()`

**Usage in services:**
```typescript
import { EventBusService, ConsulModule, createLoggerConfig } from '@cloudphone/shared';
```

## Key Architectural Patterns

### Event-Driven Architecture

**RabbitMQ Exchange:** `cloudphone.events` (topic exchange)

**Event Flow Example:**
```
device-service → publish('cloudphone.events', 'device.created', payload)
                    ↓
            RabbitMQ Exchange
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
billing-service  notification   user-service
(meter usage)    (send alert)   (update quota)
```

**Event Naming Convention:**
- Pattern: `{service}.{entity}.{action}`
- Examples: `device.started`, `app.installed`, `user.registered`, `billing.payment_success`

### CQRS + Event Sourcing (User Service)

User service implements full event sourcing:

**Command Handlers** (`backend/user-service/src/users/commands/handlers/`):
- `CreateUserHandler` → emits `UserCreatedEvent`
- `UpdateUserHandler` → emits `UserUpdatedEvent`
- `ChangePasswordHandler` → emits `PasswordChangedEvent`

**Query Handlers** (`backend/user-service/src/users/queries/handlers/`):
- `GetUserHandler` - Fetch user by ID
- `GetUsersHandler` - List users with pagination

**Event Store:**
- All events persisted in `user_events` table
- Snapshots in `user_snapshots` table (every 10 events)
- Replay capability via `EventReplayService`

**Testing event sourcing:**
```bash
cd backend/user-service
./scripts/test-event-sourcing.sh
```

### Multi-Tenancy & Quotas

**Quota Enforcement Flow:**
```
User creates device → @QuotaCheck decorator → QuotaGuard
                                                  ↓
                                         GET /quotas/user/:userId
                                                  ↓
                                      Check: devices < maxDevices?
                                                  ↓
                              Yes: Allow creation | No: Throw ForbiddenException
```

**Quota Usage Reporting:**
```typescript
// Device service reports usage to user service
POST /quotas/user/:userId/usage
{
  "deviceId": "...",
  "action": "create" | "delete",
  "usageData": { cpuCores: 2, memoryMB: 4096 }
}
```

### Device Service Architecture

**Core Modules:**
- `devices/` - CRUD operations, port management
- `docker/` - Dockerode wrapper for container management
- `adb/` - adbkit wrapper for Android control
- `snapshots/` - Device backup/restore
- `metrics/` - Prometheus metrics collection
- `health/` - Enhanced health checks
- `lifecycle/` - Automation (cleanup, autoscaling, backup)
- `failover/` - Fault detection and recovery
- `state-recovery/` - State healing and rollback
- `quota/` - Quota client and guard
- `common/` - Retry decorator with exponential backoff

**Important Decorators:**
```typescript
// Retry with backoff (common/retry.decorator.ts)
@Retry({ maxAttempts: 3, baseDelayMs: 1000, retryableErrors: [DockerError] })
async startContainer(id: string) { ... }

// Quota check (quota/quota.guard.ts)
@QuotaCheck(QuotaCheckType.DEVICE_CREATION)
async createDevice(@Body() dto: CreateDeviceDto) { ... }
```

**Scheduled Jobs (Cron):**
- Every hour: Auto backup, cleanup idle/error/stopped devices
- Every 5 min: Autoscaling, fault detection
- Every 30 min: State consistency check
- Daily 9AM: Expiration warnings
- Daily 2AM: Cleanup old backups

### Notification Service

**Multi-channel support:**
- WebSocket (real-time)
- Email (SMTP with Handlebars templates)
- SMS (placeholder)

**RabbitMQ Consumers** (`backend/notification-service/src/rabbitmq/consumers/`):
- `device-events.consumer.ts` - device.* events
- `user-events.consumer.ts` - user.* events
- `billing-events.consumer.ts` - billing.* events
- `app-events.consumer.ts` - app.* events
- `dlx.consumer.ts` - Dead Letter Exchange handler

**Template System:**
```bash
# Initialize templates
cd backend/notification-service
psql -U postgres -d cloudphone < init-templates.sql

# Test templates
./test-templates.sh
```

## Testing

### Health Checks

**All services expose `/health` endpoints:**
```bash
# Device service
curl http://localhost:30002/health

# User service
curl http://localhost:30001/health

# Check all services
./scripts/check-health.sh
```

**Device service detailed health:**
```bash
curl http://localhost:30002/health/detailed
# Returns: database, Docker, ADB, Redis, RabbitMQ status
```

### Feature Testing Scripts

```bash
# Device service features
./scripts/test-device-service-features.sh --token <JWT>

# User service event sourcing
cd backend/user-service && ./scripts/test-event-sourcing.sh

# Notification templates
cd backend/notification-service && ./test-templates.sh
```

### Monitoring

**Prometheus metrics:**
```bash
# Device service metrics
curl http://localhost:30002/metrics

# Grafana dashboards
# Import: infrastructure/monitoring/grafana/dashboards/device-overview.json
```

**Start monitoring stack:**
```bash
cd infrastructure/monitoring
./start-monitoring.sh
# Access Grafana: http://localhost:3000 (admin/admin)
```

## Common Development Workflows

### Adding a New NestJS Service

1. Create service directory under `backend/`
2. Initialize with NestJS CLI or copy structure from existing service
3. Add to `pnpm-workspace.yaml` if using workspace dependencies
4. Configure database (add to `database/init-databases.sql`)
5. Register with Consul (import `ConsulModule` from `@cloudphone/shared`)
6. Add to PM2 ecosystem or docker-compose

### Publishing Events

```typescript
import { EventBusService } from '@cloudphone/shared';

constructor(private eventBus: EventBusService) {}

// Publish device event
await this.eventBus.publishDeviceEvent('created', {
  deviceId: device.id,
  userId: device.userId,
  // ... payload
});

// Or use generic publish
await this.eventBus.publish('cloudphone.events', 'custom.event', payload);
```

### Consuming Events

```typescript
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

@RabbitSubscribe({
  exchange: 'cloudphone.events',
  routingKey: 'device.created',
  queue: 'my-service.device-created',
})
async handleDeviceCreated(event: DeviceCreatedEvent) {
  // Handle event
}
```

### Accessing Shared Database Tables

Some tables are in the main `cloudphone` database:
- `roles` - System roles
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings

When services need shared data, query the `cloudphone` database directly.

### Environment Variables

**Each service has `.env.example` with all required variables.**

Key variables:
- `NODE_ENV` - development/production
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `REDIS_HOST`, `REDIS_PORT`
- `RABBITMQ_URL` - amqp://admin:admin123@localhost:5672/cloudphone
- `JWT_SECRET` - Must be same across all services
- `CONSUL_HOST`, `CONSUL_PORT`

**Device service specific:**
- `DOCKER_HOST` - Unix socket path
- `ADB_PORT_START`, `ADB_PORT_END` - Port range for Android devices
- Lifecycle automation flags (see `backend/device-service/.env.example`)

## Troubleshooting

### Service Won't Start

1. Check PM2 logs: `pm2 logs <service-name>`
2. Verify dependencies installed: `pnpm install`
3. Check if port is in use: `lsof -i :<port>` or `ss -tlnp | grep <port>`
4. Rebuild if needed: `pnpm build`

### Database Connection Errors

1. Verify PostgreSQL is running: `docker compose -f docker-compose.dev.yml ps postgres`
2. Check database exists:
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres \
     psql -U postgres -c "\l"
   ```
3. Verify credentials match `.env`

### RabbitMQ Issues

1. Check RabbitMQ status: `docker compose -f docker-compose.dev.yml ps rabbitmq`
2. Access management UI: http://localhost:15672 (admin/admin123)
3. Check queues and exchanges are created
4. Verify vhost `cloudphone` exists

### Device Service Issues

1. Check Docker socket permissions: `ls -la /var/run/docker.sock`
2. Verify ADB connection: `adb devices`
3. Check container logs: `docker logs <container-name>`
4. Run feature tests: `./scripts/test-device-service-features.sh`

### TypeScript Build Errors

**Shared module changes:**
If you modify `@cloudphone/shared`, rebuild it first:
```bash
cd backend/shared
pnpm build
```

Then rebuild dependent services.

## Important Notes

- **Always use pnpm**, not npm or yarn
- **Database migrations**: Device service uses Atlas, others use SQL files
- **JWT_SECRET must be identical** across all services for auth to work
- **PM2 is used in development**, Kubernetes/Docker in production
- **Event naming**: Follow `{service}.{entity}.{action}` pattern
- **Shared code**: Put common utilities in `@cloudphone/shared`
- **Port conflicts**: Services have fixed ports (30000-30006), ensure they're free
