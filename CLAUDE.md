# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cloud Phone Platform (云手机平台)** - An enterprise-grade cloud Android device management platform built on microservices architecture with multi-tenancy support, supporting large-scale deployments with high availability.

**Tech Stack:**
- Backend: **NestJS (TypeScript)** - Unified backend framework
- Frontend: React 18 + TypeScript + Ant Design (Pro)
- Infrastructure: PostgreSQL 14, Redis 7, RabbitMQ 3, MinIO, Consul
- Containerization: Docker + Redroid (Android containers)
- Monitoring: Prometheus + Grafana
- Package Manager: **pnpm** (workspace monorepo)

**Note**: Previously had a Python/FastAPI scheduler-service, but it has been migrated to TypeScript and integrated into device-service for consistency.

**Project Structure:**
- **Monorepo**: Uses pnpm workspaces with `packages: ['backend/*', 'frontend/*']`
- **Shared Code**: `@cloudphone/shared` provides common utilities across all backend services
- **Databases**: Separate databases per service (cloudphone, cloudphone_user, cloudphone_device)
- **Service Communication**: RabbitMQ for async events, HTTP for sync calls via Consul service discovery

## Development Environment

### Service Management

**This project uses PM2 for process management in the local development environment.**

PM2 configuration is in `ecosystem.config.js` with cluster mode for scalable services:
- **api-gateway**: 2-max instances (cluster mode)
- **user-service**: 2-4 instances (cluster mode)
- **device-service**: 2-3 instances (cluster mode) - ✅ Now supports cluster mode with Redis distributed locks
- **app-service**: 1 instance (fork mode)
- **billing-service**: 1 instance (fork mode - avoids transaction conflicts)
- **notification-service**: 1 instance (fork mode)
- **sms-receive-service**: 1 instance (fork mode)
- **proxy-service**: 2 instances (cluster mode)
- **livechat-service**: 1-2 instances (fork/cluster mode) - 在线客服系统
- **frontend-admin**: 1 instance (fork mode)
- **frontend-user**: 1 instance (fork mode)

Common PM2 commands:
```bash
# Start all services from ecosystem.config.js
pm2 start ecosystem.config.js

# View all services
pm2 list

# Restart a service
pm2 restart device-service
pm2 restart api-gateway

# View logs
pm2 logs device-service
pm2 logs device-service --lines 50
pm2 logs --lines 100  # All services

# Stop a service
pm2 stop device-service

# Delete a service from PM2
pm2 delete device-service

# Flush logs
pm2 flush

# Get detailed info about a service
pm2 describe device-service
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

# Format code across all services
pnpm format

# Check formatting
pnpm format:check
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

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode
pnpm test:watch
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
- `cloudphone` - Main database (shared tables: roles, permissions, role_permissions)
- `cloudphone_user` - User service database
- `cloudphone_device` - Device service database
- `cloudphone_notification` - Notification service database
- `cloudphone_livechat` - LiveChat service database

**Database initialization:**
```bash
# Initialize all databases (creates databases and tables)
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres < database/init-databases.sql
```

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

# Inspect schema
pnpm schema:inspect
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

# View specific service logs
docker compose -f docker-compose.dev.yml logs -f postgres

# Stop all
docker compose -f docker-compose.dev.yml down

# Stop all and remove volumes (WARNING: deletes data)
docker compose -f docker-compose.dev.yml down -v
```

**Service ports:**
- PostgreSQL: 5432
- Redis: 6379
- RabbitMQ: 5672 (AMQP), 15672 (Management UI - admin/admin123)
- MinIO: 9000 (API), 9001 (Console - minioadmin/minioadmin)
- Consul: 8500 (HTTP/UI), 8600 (DNS)

## Microservices Architecture

### Service Responsibilities

**Backend Services:**

1. **api-gateway** (Port 30000) - Unified entry point
   - Routes requests to backend services via proxy
   - JWT authentication with JwtAuthGuard
   - Rate limiting
   - CORS handling
   - All routes require authentication except health checks

2. **user-service** (Port 30001) - User & Auth
   - User CRUD with CQRS + Event Sourcing
   - Authentication (JWT) and password hashing (bcrypt)
   - Role-based permissions (RBAC) with field-level permissions
   - Multi-tenant quotas with enforcement
   - Event Store with snapshots (every 10 events)
   - Features: Tickets, Audit Logs, API Keys, Cache Management, Queue Management, Event Sourcing Viewer
   - Menu permissions, Data scope management

3. **device-service** (Port 30002) - Cloud Phone Management
   - Docker container lifecycle management (Redroid)
   - ADB integration for Android control
   - Device monitoring with Prometheus metrics
   - Lifecycle automation (cleanup, autoscaling, backup)
   - Fault tolerance (retry, failover, state recovery)
   - Quota enforcement via QuotaGuard
   - Port management for ADB connections
   - WebSocket support for real-time device updates
   - **云厂商支持**:
     - ✅ **已完成**: Redroid (本地容器), Aliyun ECP (阿里云手机), Huawei CloudPhone (华为云手机)
     - 🚧 **后端已实现/前端配置页缺失**: AWS DeviceFarm, Tencent Cloud, Baidu Cloud, BrowserStack, Genymotion, Physical Devices

4. **app-service** (Port 30003) - APK Management
   - APK upload/download (MinIO integration)
   - App installation/uninstallation via ADB
   - App marketplace with versioning
   - Audit workflow for app approvals

5. **billing-service** (Port 30005) - Billing & Metering
   - Usage metering (device time, resources)
   - Balance management
   - Plan subscriptions
   - Invoice generation
   - Payment processing with Saga pattern
   - International payment support

6. **notification-service** (Port 30006) - Multi-channel Notifications
   - WebSocket real-time notifications
   - Email notifications (with Handlebars templates)
   - SMS support (placeholder)
   - RabbitMQ event consumers with DLX (Dead Letter Exchange)
   - Template management system with 100% coverage
   - Notification preferences per user
   - **✅ 100% Integration Test Coverage (38/38 tests passing)**
     - Real PostgreSQL, Redis, RabbitMQ testing
     - Performance benchmarks established
     - See `backend/notification-service/test/` for documentation

7. **proxy-service** (Port 30007) - 多供应商代理池管理
   - 代理池自动刷新 (启动3秒后自动填充，每10分钟定时刷新)
   - 多供应商适配器: Kookeey, IPIDEA, BrightData, IPRoyal, Oxylabs, Smartproxy
   - 代理质量评估和智能选择
   - 供应商排名和成本优化
   - 按地理位置、协议类型筛选代理
   - 数据库配置 (管理后台配置 API Key 和供应商参数)

8. **sms-receive-service** (Port 30008) - 短信接收服务
   - 虚拟号码租用和短信接收
   - 多供应商适配器: 5sim, SMS-Activate, SMS-Man, SmsPVA, OnlineSim
   - 订单管理和号码生命周期
   - 价格查询和国家/运营商支持

9. **media-service** - Go/Gin (Port 30009)
   - WebRTC streaming for device screens
   - Screen recording
   - Multi-encoder support (H264, VP8, VP9)

10. **livechat-service** (Port 30010) - 在线客服系统
   - WebSocket 实时聊天 (Socket.IO)
   - 智能排队分配 (5种路由策略: Round Robin, Least Busy, Skill-based, Priority, Random)
   - AI 智能客服 (OpenAI 集成)
   - 多媒体消息支持 (图片、文件、语音)
   - 设备远程协助 (ADB 命令执行)
   - 会话转工单集成
   - 绩效统计和质检评分
   - 消息加密 (AES-256-GCM) 和归档
   - RabbitMQ 事件消费 (device.*, user.*, ticket.* 事件)

**Frontend Applications:**

- **admin** (Port 5173) - Admin dashboard (Ant Design Pro)
  - React Query for state management
  - Component lazy loading (WebRTCPlayer, ADBConsole, Charts)
  - useMemo/useCallback for performance optimization
- **user** (Port 5174) - User portal (Ant Design)
- **gv** (Port 5175) - Government Cloud Phone Demo
  - React 19 + Ant Design 5 + TanStack Query
  - 政务云手机演示平台

### Shared Module (@cloudphone/shared)

Located in `backend/shared/`, provides common utilities:

**Core Services:**
- **EventBusService** - RabbitMQ event publishing
  - Methods: `publish()`, `publishDeviceEvent()`, `publishUserEvent()`, `publishBillingEvent()`
  - Exchange: `cloudphone.events`
- **ConsulModule** - Service registration and discovery
- **HttpClientService** - HTTP client with circuit breaker (Opossum)
- **HealthCheckService** - Standardized health checks
- **DistributedLockService** - Redis-based distributed locks with `@Lock()` decorator
- **TempFileManagerService** - Temporary file management

**Security & Validation:**
- **SecurityModule** - Rate limiting, IP blacklist, auto-ban middleware
- **ValidationModule** - Input validation and sanitization
- **SanitizationPipe** - HTML sanitization (strict/loose modes)
- **SqlInjectionGuard** - SQL injection detection and prevention
- **Custom Validators** - IsStrongPassword, IsValidUsername, etc.

**Database & Caching:**
- **AppCacheModule** - Redis cache configuration
- **@Cacheable** - Method-level caching decorator
- **@CacheEvict** - Cache invalidation decorator
- **@Transaction** - Transaction management decorator
- **QueryAudit** - Query logging and auditing

**Configuration Factories:**
- `createDatabaseConfig()` - TypeORM configuration
- `createRedisConfig()` - Redis configuration
- `createJwtConfig()` - JWT configuration
- `createLoggerConfig()` - Pino logger configuration

**Event Schemas:**
- `app.events.ts` - App installation/uninstallation events
- `notification.events.ts` - System-wide notification events
- Provider type definitions for multi-cloud device support

**Usage in services:**
```typescript
import {
  EventBusService,
  ConsulModule,
  SecurityModule,
  AppCacheModule,
  Cacheable,
  Lock,
  createLoggerConfig
} from '@cloudphone/shared';
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

**Important:** All services consume events via RabbitMQ consumers with Dead Letter Exchange for failed messages.

### CQRS + Event Sourcing (User Service)

User service implements full event sourcing with the `@nestjs/cqrs` package.

**Command Handlers** (`backend/user-service/src/users/commands/handlers/`):
- `CreateUserHandler` → emits `UserCreatedEvent`
- `UpdateUserHandler` → emits `UserUpdatedEvent`
- `ChangePasswordHandler` → emits `PasswordChangedEvent`
- `DeleteUserHandler` → emits `UserDeletedEvent`
- `UpdateLoginInfoHandler` → emits `LoginInfoUpdatedEvent`

**Query Handlers** (`backend/user-service/src/users/queries/handlers/`):
- `GetUserHandler` - Fetch user by ID
- `GetUsersHandler` - List users with pagination
- `GetUserByUsernameHandler` - Find by username
- `GetUserByEmailHandler` - Find by email
- `GetUserStatsHandler` - User statistics

**Event Store:**
- All events persisted in `user_events` table with full payload
- Snapshots in `user_snapshots` table (every 10 events)
- Replay capability via `EventReplayService`
- Event versioning support

**Testing event sourcing:**
```bash
cd backend/user-service
./scripts/test-event-sourcing.sh
```

**Documentation:**
- `backend/user-service/CQRS.md` - CQRS pattern implementation
- `backend/user-service/EVENT_SOURCING.md` - Event sourcing details
- `backend/user-service/EVENT_SOURCING_USAGE_GUIDE.md` - Usage examples

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

**Quota Types:**
- Device count limits
- CPU core limits
- Memory limits
- Storage limits
- API rate limits

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
- `port-manager/` - Port allocation service
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

**Testing:**
Device service has comprehensive test coverage with Jest:
```bash
cd backend/device-service
pnpm test                    # Run all tests
pnpm test:cov               # Run with coverage
pnpm test:watch             # Watch mode
pnpm test devices.service   # Specific test file
```

### Notification Service

**Multi-channel support:**
- WebSocket (real-time via Socket.IO)
- Email (SMTP with Handlebars templates)
- SMS (placeholder for future implementation)

**RabbitMQ Consumers** (`backend/notification-service/src/rabbitmq/consumers/`):
- `device-events.consumer.ts` - device.* events
- `user-events.consumer.ts` - user.* events
- `billing-events.consumer.ts` - billing.* events
- `app-events.consumer.ts` - app.* events
- `dlx.consumer.ts` - Dead Letter Exchange handler for failed messages

**Template System:**
All notification types have Handlebars templates in `src/templates/`:
```bash
# Initialize templates
cd backend/notification-service
psql -U postgres -d cloudphone < init-templates.sql

# Test templates
./test-templates.sh
```

**Features:**
- Template versioning and management
- User notification preferences
- Batch notification support
- Notification history tracking

### Security Features

The platform implements multiple security layers:

**Authentication & Authorization:**
- JWT-based authentication with refresh tokens
- RBAC with role hierarchy
- Field-level permissions
- Data scope restrictions
- API key management for service-to-service auth

**Input Validation:**
- `class-validator` decorators on all DTOs
- Custom validators for passwords, usernames, emails
- SQL injection detection with `SqlInjectionGuard`
- HTML sanitization with `SanitizationPipe`
- Query parameter validation

**Rate Limiting:**
```typescript
// From @cloudphone/shared SecurityModule
- Default: 100 requests/minute
- Login endpoints: 5 requests/minute
- Sensitive endpoints: 20 requests/minute
- IP blacklist support
- Auto-ban after threshold (10 failures → 1 hour ban)
```

**Security Headers:**
- Helmet middleware for security headers
- CORS with configurable origins
- CSRF protection with csurf
- Cookie security (httpOnly, secure, sameSite)

**Audit & Monitoring:**
- All database queries can be audited with `@QueryAudit`
- Audit logs for sensitive operations
- User activity tracking
- Failed authentication attempt logging

## Testing

### Unit Tests

All NestJS services use Jest with standardized configuration:

**Jest Configuration:**
```javascript
// jest.config.js in each service
{
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
}
```

**Running Tests:**
```bash
# In any backend service
pnpm test                  # Run all tests
pnpm test:watch           # Watch mode
pnpm test:cov             # Coverage report
pnpm test <filename>      # Specific file

# Root level - test all services
pnpm test
```

**Test Files:**
- Unit tests: `*.spec.ts` files alongside source
- Integration tests: `test/` directory
- E2E tests: `backend/e2e-tests/` (separate package)

**Mock Examples:**
Services mock external dependencies:
```typescript
// Mock @cloudphone/shared in jest.config.js
moduleNameMapper: {
  '^@cloudphone/shared$': '<rootDir>/../../shared/src',
  '^uuid$': '<rootDir>/__mocks__/uuid.ts',
}
```

### Health Checks

**All services expose `/health` endpoints:**
```bash
# Check individual services
curl http://localhost:30000/health  # API Gateway
curl http://localhost:30001/health  # User Service
curl http://localhost:30002/health  # Device Service
curl http://localhost:30003/health  # App Service
curl http://localhost:30005/health  # Billing Service
curl http://localhost:30006/health  # Notification Service
curl http://localhost:30007/health  # Proxy Service
curl http://localhost:30008/health  # SMS Receive Service
curl http://localhost:30010/health  # LiveChat Service

# Check all services with script
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

# Check all services DI (Dependency Injection)
./scripts/check-all-services-di.sh

# Check Consul integration
./scripts/check-consul-integration.sh

# Monitor outbox pattern
./scripts/monitor-outbox.sh
```

### Monitoring

**Prometheus metrics:**
```bash
# Device service metrics
curl http://localhost:30002/metrics

# User service metrics
curl http://localhost:30001/metrics

# Grafana dashboards
# Import: infrastructure/monitoring/grafana/dashboards/device-overview.json
```

**Start monitoring stack:**
```bash
cd infrastructure/monitoring
./start-monitoring.sh
# Access Grafana: http://localhost:3000 (admin/admin)
```

**Key Metrics:**
- HTTP request duration histograms
- Active device count
- Event processing metrics
- Cache hit/miss rates
- Database connection pool status

## Common Development Workflows

### Starting Development Environment

**Complete setup from scratch:**
```bash
# 1. Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# 2. Wait for PostgreSQL to be ready
docker compose -f docker-compose.dev.yml logs -f postgres
# Wait for "database system is ready to accept connections"

# 3. Initialize databases
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres < database/init-databases.sql

# 4. Install dependencies
pnpm install

# 5. Build shared module first
cd backend/shared && pnpm build && cd ../..

# 6. Build all services
pnpm build

# 7. Start services with PM2
pm2 start ecosystem.config.js

# 8. Check service status
pm2 list
pm2 logs
```

### Adding a New NestJS Service

1. Create service directory under `backend/`
2. Initialize with NestJS CLI or copy structure from existing service
3. Add to `pnpm-workspace.yaml` (already includes `backend/*`)
4. Create `.env.example` with required variables
5. Configure database (add to `database/init-databases.sql` if needs own DB)
6. Import shared modules:
   ```typescript
   import { EventBusModule, ConsulModule, SecurityModule } from '@cloudphone/shared';
   ```
7. Register with Consul (import `ConsulModule.forRoot()`)
8. Add to `ecosystem.config.js` for PM2
9. Add proxy route in `backend/api-gateway/src/proxy/proxy.controller.ts`

### Adding API Gateway Routes

When adding new controllers to services, update the API Gateway:

```typescript
// backend/api-gateway/src/proxy/proxy.controller.ts

// Add exact route match
@UseGuards(JwtAuthGuard)
@All("your-new-route")
async proxyYourRouteExact(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("service-name", req, res);
}

// Add wildcard route for sub-paths
@UseGuards(JwtAuthGuard)
@All("your-new-route/*path")
async proxyYourRoute(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy("service-name", req, res);
}
```

**Service name mapping:**
- `"users"` → user-service
- `"devices"` → device-service
- `"apps"` → app-service
- `"billing"` → billing-service
- `"notifications"` → notification-service
- `"proxy"` → proxy-service
- `"sms"` → sms-receive-service
- `"livechat"` → livechat-service

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

// Publish user event
await this.eventBus.publishUserEvent('registered', {
  userId: user.id,
  email: user.email,
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
  queueOptions: {
    deadLetterExchange: 'cloudphone.dlx',  // Important: handle failures
  },
})
async handleDeviceCreated(event: DeviceCreatedEvent) {
  try {
    // Handle event
    this.logger.log(`Processing device created: ${event.deviceId}`);
  } catch (error) {
    this.logger.error(`Failed to process device.created event`, error);
    throw error; // Will be sent to DLX
  }
}
```

### Using Distributed Locks

```typescript
import { Lock, DistributedLockService } from '@cloudphone/shared';

// Method-level decorator
@Lock('resource:{{resourceId}}')  // Supports template interpolation
async criticalOperation(resourceId: string) {
  // This method is protected by a distributed lock
}

// Manual lock management
constructor(private lockService: DistributedLockService) {}

async manualLock() {
  const lock = await this.lockService.acquireLock('my-resource', 5000);
  try {
    // Critical section
  } finally {
    await this.lockService.releaseLock('my-resource');
  }
}
```

### Using Caching

```typescript
import { Cacheable, CacheEvict } from '@cloudphone/shared';

// Cache method result
@Cacheable('users:{{userId}}', 300)  // Cache for 5 minutes
async getUser(userId: string) {
  return this.userRepository.findOne(userId);
}

// Evict cache
@CacheEvict('users:{{userId}}')
async updateUser(userId: string, data: UpdateUserDto) {
  return this.userRepository.update(userId, data);
}

// Evict multiple cache keys
@CacheEvict(['users:*', 'user-list'])
async deleteUser(userId: string) {
  return this.userRepository.delete(userId);
}
```

### Accessing Shared Database Tables

Some tables are in the main `cloudphone` database:
- `roles` - System roles
- `permissions` - Permission definitions
- `role_permissions` - Role-permission mappings

When services need shared data, configure a second database connection:
```typescript
// In service module
TypeOrmModule.forRoot({
  name: 'shared',
  database: 'cloudphone',
  // ... other config
})

// In service
@InjectRepository(Role, 'shared')
private roleRepository: Repository<Role>
```

### Environment Variables

**Each service has `.env.example` with all required variables.**

**Common variables (all services):**
```bash
NODE_ENV=development
PORT=30001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloudphone_user  # Service-specific

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672/cloudphone

# JWT (MUST be same across all services)
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Consul
CONSUL_HOST=localhost
CONSUL_PORT=8500

# Logging
LOG_LEVEL=debug  # development: debug, production: info
```

**Device service specific:**
```bash
DOCKER_HOST=unix:///var/run/docker.sock
ADB_PORT_START=5555
ADB_PORT_END=5655

# Lifecycle automation flags
AUTO_CLEANUP_ENABLED=true
AUTO_BACKUP_ENABLED=true
AUTO_SCALING_ENABLED=false
FAULT_DETECTION_ENABLED=true
```

**Notification service specific:**
```bash
# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=password
SMTP_FROM=noreply@cloudphone.run

# WebSocket
WS_PORT=30006
```

## Testing

### Unit Tests

All NestJS services use Jest with standardized configuration:

```bash
# In any backend service
pnpm test                  # Run all tests
pnpm test:watch           # Watch mode
pnpm test:cov             # Coverage report
pnpm test <filename>      # Specific file

# Root level - test all services
pnpm test
```

### Integration Tests

**Notification Service** has complete integration test coverage with real infrastructure:

```bash
cd backend/notification-service

# One-command test (recommended - auto cleanup)
pnpm test:integration:clean

# Manual run
docker compose -f docker-compose.test.yml up -d
pnpm test:integration

# With coverage
pnpm test:integration:cov
```

**Test Results:** ✅ **38/38 (100%)**
- Redis Integration: 15/15 tests
- Notifications Service: 13/13 tests
- RabbitMQ Integration: 10/10 tests

**Performance Benchmarks:**
- Redis 1000 operations: 41ms ⚡
- 10 concurrent notifications: 158ms
- 50 RabbitMQ events: 5.1 seconds

**Documentation:**
- `backend/notification-service/test/SUCCESS_SUMMARY.md` - Achievement summary
- `backend/notification-service/test/INTEGRATION_TEST_REPORT.md` - Technical details
- `backend/notification-service/test/QUICK_REFERENCE.md` - Command reference

## Troubleshooting

### Service Won't Start

1. Check PM2 logs: `pm2 logs <service-name> --lines 100`
2. Verify dependencies installed: `pnpm install`
3. Check if port is in use: `lsof -i :<port>` or `ss -tlnp | grep <port>`
4. Rebuild if needed: `pnpm build`
5. Check if shared module is built: `ls backend/shared/dist/`
6. Verify environment variables: Check `.env` file exists and matches `.env.example`

### Database Connection Errors

1. Verify PostgreSQL is running: `docker compose -f docker-compose.dev.yml ps postgres`
2. Check database exists:
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres \
     psql -U postgres -c "\l"
   ```
3. Verify credentials match `.env`
4. Check if database was initialized:
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres \
     psql -U postgres -d cloudphone_user -c "\dt"
   ```
5. Re-run initialization if needed:
   ```bash
   docker compose -f docker-compose.dev.yml exec -T postgres \
     psql -U postgres < database/init-databases.sql
   ```

### RabbitMQ Issues

1. Check RabbitMQ status: `docker compose -f docker-compose.dev.yml ps rabbitmq`
2. Access management UI: http://localhost:15672 (admin/admin123)
3. Check queues and exchanges are created (look for `cloudphone.events` exchange)
4. Verify vhost `cloudphone` exists
5. Check for messages in Dead Letter Queue (DLX)
6. Restart RabbitMQ if needed: `docker compose -f docker-compose.dev.yml restart rabbitmq`

### Device Service Issues

1. Check Docker socket permissions: `ls -la /var/run/docker.sock`
   - Should be writable: `chmod 666 /var/run/docker.sock` (development only)
2. Verify ADB connection: `adb devices`
3. Check if ADB server is running: `adb start-server`
4. Check container logs: `docker logs <container-name>`
5. Run feature tests: `./scripts/test-device-service-features.sh`
6. Check port availability: Device service needs ports 5555-5655 for ADB

### TypeScript Build Errors

**Shared module changes:**
If you modify `@cloudphone/shared`, rebuild it first:
```bash
cd backend/shared
pnpm build
```

Then rebuild dependent services:
```bash
cd ../user-service && pnpm build
cd ../device-service && ppnpm build
# ... etc
```

**Module resolution errors:**
Check `tsconfig.json` paths are correct:
```json
{
  "compilerOptions": {
    "paths": {
      "@cloudphone/shared": ["../shared/src"],
      "@cloudphone/shared/*": ["../shared/src/*"]
    }
  }
}
```

### Frontend Development Issues

**API connection errors:**
1. Check `.env.development` has correct API gateway URL:
   ```
   VITE_API_URL=http://localhost:30000
   ```
2. Verify API Gateway is running: `pm2 list | grep api-gateway`
3. Check CORS configuration in API Gateway
4. Clear browser cache and restart dev server

**Build errors:**
1. Check Node.js version: `node --version` (should be 18+)
2. Clear cache: `rm -rf node_modules/.vite`
3. Reinstall: `pnpm install`

### PM2 Issues

**Services not starting:**
```bash
# Delete all PM2 processes and restart
pm2 delete all
pm2 start ecosystem.config.js

# Check for build artifacts
ls backend/*/dist/main.js

# Rebuild if missing
pnpm build
```

**Log file too large:**
```bash
# Flush all logs
pm2 flush

# Rotate logs
pm2 install pm2-logrotate
```

**Memory issues:**
```bash
# Check memory usage
pm2 monit

# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'
```

### Proxy Service Issues

**代理池为空:**
1. 检查供应商配置：`curl http://localhost:30007/proxy/providers`
2. 服务启动后会自动刷新代理池（3秒延迟），查看日志确认
3. 手动刷新：`curl -X POST http://localhost:30007/proxy/admin/refresh-pool`
4. 检查适配器初始化日志：`pm2 logs proxy-service --lines 50`

**供应商连接失败:**
1. 确认 API Key 已在管理后台配置
2. 检查供应商 API 状态
3. 查看错误日志了解具体原因

### SMS Receive Service Issues

**号码获取失败:**
1. 检查供应商 API Key 配置
2. 确认账户余额充足
3. 查看 `pm2 logs sms-receive-service` 了解错误详情

## Important Notes

- **Always use pnpm**, not npm or yarn (pnpm workspace features are required)
- **Database migrations**: Device service uses Atlas, others use SQL files
- **JWT_SECRET must be identical** across all services for auth to work
- **PM2 is used in development**, Kubernetes/Docker in production
- **Event naming**: Follow `{service}.{entity}.{action}` pattern strictly
- **Shared code**: Put common utilities in `@cloudphone/shared` and rebuild before using
- **Port conflicts**: Services have fixed ports (30000-30010), ensure they're free
- **Service startup order**: Infrastructure → Shared module build → Backend services → Frontend
- **Testing**: Always run tests before committing (`pnpm test`)
- **Security**: Never commit `.env` files, always use `.env.example` as template
- **Consul**: Services auto-register on startup, check http://localhost:8500
- **Logs**: PM2 logs are in `logs/` directory, add to `.gitignore`

## Quick Reference

**Service Discovery:**
- Consul UI: http://localhost:8500
- RabbitMQ Management: http://localhost:15672 (admin/admin123)
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

**Swagger/OpenAPI:**
- Proxy Service: http://localhost:30007/docs
- SMS Receive Service: http://localhost:30008/docs
- LiveChat Service: http://localhost:30010/docs

**Documentation:**
- Architecture: `docs/ARCHITECTURE.md`
- API Documentation: `docs/API.md`
- Development Guide: `docs/DEVELOPMENT_GUIDE.md`
- Deployment Guide: `docs/DEPLOYMENT_GUIDE.md`
- Quick Start: `docs/QUICK_START.md`
- User Service CQRS: `backend/user-service/CQRS.md`
- User Service Event Sourcing: `backend/user-service/EVENT_SOURCING.md`
- Security Features: `backend/shared/SECURITY_FEATURES.md`
- Notification Service: `backend/notification-service/README.md`

**Useful Scripts:**
```bash
./scripts/check-health.sh                    # Health check all services
./scripts/check-consul-integration.sh        # Verify Consul integration
./scripts/check-all-services-di.sh          # Check dependency injection
./scripts/rebuild-all-services.sh           # Rebuild all services
./scripts/clean-and-rebuild.sh              # Clean and rebuild
```

## 服务版本管理

### 查看服务版本

使用以下命令查看所有服务的版本信息：

```bash
./scripts/show-versions.sh
```

### PM2 版本显示说明

**开发环境**：
- PM2 显示版本为 `N/A` 是正常的（使用 `pnpm run dev` 启动）
- 这是 PM2 的设计限制，无法从包管理器子进程中获取版本信息
- 只有直接运行编译文件的服务才显示版本（如 media-service, proxy-service）

**生产环境**：
- 使用编译后的文件启动（`dist/main.js`）
- PM2 会正确显示所有服务的版本号

### 更新服务版本

修改各服务的 `package.json` 中的 `version` 字段，然后：

```bash
# 更新 ecosystem.config.js 中对应服务的 version 字段
vim ecosystem.config.js

# 重新部署
pm2 restart ecosystem.config.js --update-env
```

