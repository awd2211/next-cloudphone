# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**云手机平台 (Cloud Phone Platform)** - An enterprise-grade cloud Android device management platform built with microservices architecture. Supports massive deployment, multi-tenant isolation, and high availability.

Core capabilities:
- Remote control via WebRTC with low-latency real-time streaming
- Cloud phone instance lifecycle management (create, allocate, monitor)
- APK management (upload, install, uninstall, app marketplace)
- Complete user authentication/authorization with multi-tenant support
- Flexible billing/metering system
- Comprehensive monitoring and alerting infrastructure

## Technology Stack

### Backend Microservices (Polyglot Architecture)
- **NestJS/TypeScript** (6 services): API Gateway, User, Device, App, Billing, Notification
- **Python/FastAPI** (1 service): Scheduler - Resource scheduling and task orchestration
- **Go/Gin** (1 service): Media Service - WebRTC audio/video streaming

### Frontend
- **React 18 + TypeScript + Vite**
- Admin Portal: Ant Design Pro
- User Portal: Ant Design

### Infrastructure
- **Database**: PostgreSQL 14 (separate DB per microservice)
- **Cache**: Redis 7 (with shared cache module)
- **Message Queue**: RabbitMQ 3 (event-driven communication)
- **Object Storage**: MinIO (for APK files)
- **Service Discovery**: Consul
- **Monitoring**: Prometheus + Grafana + Jaeger (distributed tracing)
- **API Gateway**: Envoy Proxy (circuit breaker, rate limiting, retries)
- **Containerization**: Docker & Docker Compose (dev), Kubernetes (prod)

## Development Commands

### Quick Start (Docker Compose - Recommended)

Start everything (infrastructure + all services):
```bash
docker compose -f docker-compose.dev.yml up -d
```

Check service health:
```bash
./check-health.sh
# Or check individual services:
curl http://localhost:30000/api/health  # API Gateway
curl http://localhost:30001/health       # User Service
```

View logs:
```bash
docker compose -f docker-compose.dev.yml logs -f [service-name]
# Example: docker compose -f docker-compose.dev.yml logs -f api-gateway
```

Stop all services:
```bash
docker compose -f docker-compose.dev.yml down
```

### Local Development (Without Docker)

**Prerequisites**: Node.js 18+, Python 3.9+, Go 1.21+, pnpm, PostgreSQL, Redis

Install dependencies (all services):
```bash
pnpm install  # Root level - installs all workspaces
```

Start individual NestJS services:
```bash
cd backend/[service-name]
pnpm run dev  # Hot reload with nest start --watch
```

Start Python scheduler service:
```bash
cd backend/scheduler-service
source venv/bin/activate  # Create venv first if needed
pip install -r requirements.txt
python main.py
```

Start Go media service:
```bash
cd backend/media-service
go mod download
go run main.go
```

Start frontends:
```bash
# Admin portal (port 5173)
cd frontend/admin
pnpm run dev

# User portal (port 5174)
cd frontend/user
pnpm run dev
```

### Build & Production

Build all services:
```bash
pnpm build  # Builds all workspaces
```

Build individual NestJS service:
```bash
cd backend/[service-name]
pnpm run build  # Uses nest build
```

Build frontends:
```bash
cd frontend/admin  # or frontend/user
pnpm run build
```

Production start (NestJS):
```bash
pnpm run start:prod  # or: node dist/main
```

### Testing

Run tests for NestJS services:
```bash
cd backend/[service-name]
pnpm test              # Run once
pnpm run test:watch    # Watch mode
pnpm run test:cov      # With coverage
```

### Linting & Formatting

```bash
cd backend/[service-name]
pnpm run lint          # ESLint with auto-fix
pnpm run format        # Prettier
```

### Database Migrations

Using Atlas for schema management:
```bash
cd backend/user-service  # Or other NestJS service
pnpm run migrate:status    # Check migration status
pnpm run migrate:apply     # Apply pending migrations
pnpm run migrate:diff      # Generate new migration
pnpm run schema:inspect    # Inspect current schema
```

Initialize permissions data:
```bash
cd backend/user-service
pnpm run init:permissions  # Initialize RBAC permissions
```

Seed test data:
```bash
./scripts/seed-database.sh
```

### Consul Service Discovery

Start all services with Consul registration:
```bash
./scripts/start-all-with-consul.sh
```

Check Consul integration:
```bash
./scripts/check-consul-integration.sh
```

Restart services to re-register:
```bash
./scripts/restart-services-for-consul.sh
```

### Monitoring

Start monitoring stack (Prometheus + Grafana + Jaeger + AlertManager):
```bash
cd infrastructure/monitoring
./start-monitoring.sh
```

Access monitoring UIs:
- **Jaeger**: http://localhost:16686 (distributed tracing)
- **Prometheus**: http://localhost:9090 (metrics)
- **Grafana**: http://localhost:3000 (admin/admin123)
- **AlertManager**: http://localhost:9093

Start Envoy Proxy:
```bash
cd infrastructure/envoy
./start-envoy.sh
```

Envoy admin interface: http://localhost:9901

## Architecture & Code Organization

### Microservices Port Allocation

| Service | Port | Database | Language |
|---------|------|----------|----------|
| API Gateway | 30000 | cloudphone_core | NestJS/TypeScript |
| User Service | 30001 | cloudphone_core | NestJS/TypeScript |
| Device Service | 30002 | cloudphone_core | NestJS/TypeScript |
| App Service | 30003 | cloudphone_core | NestJS/TypeScript |
| Scheduler Service | 30004 | cloudphone_scheduler | Python/FastAPI |
| Billing Service | 30005 | cloudphone_billing | NestJS/TypeScript |
| Notification Service | 30006 | cloudphone_core | NestJS/TypeScript |
| Media Service | 30007 | - | Go/Gin |

Frontend:
- Admin Portal: http://localhost:5173
- User Portal: http://localhost:5174

Infrastructure:
- PostgreSQL: 5432
- Redis: 6379
- RabbitMQ: 5672 (AMQP), 15672 (Management UI)
- MinIO: 9000 (API), 9001 (Console)
- Consul: 8500 (HTTP/UI), 8600 (DNS)
- Envoy Proxy: 10000 (HTTP), 9901 (Admin)

### Database per Service Pattern

Each microservice owns its database following microservices best practices:
- `cloudphone_core`: Shared by User, Device, App, Notification services (transitioning)
- `cloudphone_billing`: Billing service (independent)
- `cloudphone_scheduler`: Scheduler service (independent)

Database initialization script: `database/init-databases.sql`

**Important**: Services should never directly query another service's database. Use REST APIs or RabbitMQ events for inter-service communication.

### Shared Code Module

`backend/shared/` - Workspace package `@cloudphone/shared` containing:
- `config/`: Configuration utilities (JWT, database, Redis, RabbitMQ)
- `consul/`: Consul service registration and health checks
- `cache/`: Redis cache abstraction with decorators
- `events/`: RabbitMQ event schemas and publishers/consumers
- `health/`: Health check infrastructure
- `http/`: HTTP client utilities with circuit breakers (Opossum)
- `interceptors/`: Common NestJS interceptors (logging, timeout, transform)
- `filters/`: Global exception filters
- `exceptions/`: Custom exception classes
- `utils/`: Shared utilities

Import in services: `import { ... } from '@cloudphone/shared'`

### Event-Driven Communication

RabbitMQ exchanges and event patterns (see `backend/shared/src/events/schemas/`):
- `device.created`, `device.updated`, `device.deleted`
- `user.created`, `user.updated`, `user.deleted`
- `app.installed`, `app.uninstalled`
- `billing.usage.recorded`, `billing.payment.completed`
- `notification.email.send`, `notification.sms.send`

Event publishing pattern:
```typescript
import { EventPublisher } from '@cloudphone/shared';

constructor(private eventPublisher: EventPublisher) {}

await this.eventPublisher.publish('device.created', {
  deviceId: '123',
  userId: 'user-456',
  // ... event payload
});
```

### NestJS Service Structure

Standard NestJS module organization in each service:
```
src/
├── main.ts                    # Bootstrap application
├── app.module.ts              # Root module
├── entities/                  # TypeORM entities
│   └── *.entity.ts
├── [feature]/                 # Feature modules
│   ├── [feature].module.ts
│   ├── [feature].controller.ts
│   ├── [feature].service.ts
│   └── dto/                   # Data Transfer Objects
│       ├── create-*.dto.ts
│       └── update-*.dto.ts
├── guards/                    # Route guards (auth, roles)
├── decorators/                # Custom decorators
└── config/                    # Service-specific config
```

### Authentication & Authorization

JWT-based authentication flow:
1. User logs in via `POST /api/auth/login` (API Gateway → User Service)
2. User Service validates credentials and returns JWT token
3. Subsequent requests include `Authorization: Bearer <token>` header
4. API Gateway validates JWT and forwards to backend services
5. Backend services trust the validated token (no re-verification needed)

RBAC implementation:
- Roles: `SUPER_ADMIN`, `ADMIN`, `USER` (defined in User Service)
- Permissions: Resource-action pairs (e.g., `device:create`, `user:read`)
- Guards: `@Roles()`, `@RequirePermissions()` decorators

### Caching Strategy

Redis caching patterns (using `@cloudphone/shared/cache`):
```typescript
import { Cacheable, CacheEvict } from '@cloudphone/shared';

@Cacheable('user', 3600) // Cache for 1 hour
async getUser(id: string) { ... }

@CacheEvict('user') // Invalidate cache
async updateUser(id: string, data: UpdateUserDto) { ... }
```

Common cache keys:
- `user:{id}` - User data
- `device:{id}` - Device details
- `plan:{id}` - Billing plans
- `captcha:{id}` - Login captchas (TTL: 5min)

### Monitoring & Observability

All NestJS services expose:
- `/health` - Health check endpoint (Consul uses this)
- `/metrics` - Prometheus metrics (prom-client)
- Swagger docs at `/api/docs` (Swagger UI)

Jaeger distributed tracing:
- Enabled in API Gateway and propagates trace context
- Use `X-B3-Sampled: 1` header to force trace sampling
- View traces at http://localhost:16686

Structured logging (Winston/Pino):
- Log levels: error, warn, info, debug
- JSON format for log aggregation
- Includes trace IDs, service name, timestamps

### Circuit Breaker Pattern

HTTP calls between services use Opossum circuit breakers (configured in `@cloudphone/shared/http`):
- Timeout: 10s
- Error threshold: 50%
- Reset timeout: 30s
- Protects against cascading failures

### Error Handling

Centralized exception handling via NestJS filters:
- `HttpExceptionFilter`: Transforms exceptions to consistent response format
- `AllExceptionsFilter`: Catches unexpected errors
- Custom exceptions: `BusinessException`, `ResourceNotFoundException`, etc.

Standard error response:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2025-10-22T...",
  "path": "/api/..."
}
```

## Important Patterns & Conventions

### Environment Variables

Each service has `.env.example` with all required variables. Key variables:
- `NODE_ENV`: development/production
- `PORT`: Service port (3000x range)
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`: PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT`: Redis connection
- `RABBITMQ_URL`: RabbitMQ connection string
- `JWT_SECRET`: Secret for JWT signing (MUST change in production)
- `CONSUL_HOST`, `CONSUL_PORT`: Consul connection
- `USE_CONSUL`: Enable/disable Consul registration

Validate environment config:
```bash
./scripts/validate-env.sh [service-name]
# Or: node scripts/check-env.js [service-name]
```

### TypeORM Entities

- Use `@Entity()` decorator
- Primary keys: UUID (via `@PrimaryGeneratedColumn('uuid')`)
- Timestamps: `@CreateDateColumn()`, `@UpdateDateColumn()`
- Soft deletes: `@DeleteDateColumn()`
- Relations: Always specify `cascade` and `onDelete` behavior

### DTO Validation

Use class-validator decorators in DTOs:
```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;
}
```

Validation is automatic via `ValidationPipe` (configured globally).

### API Response Format

Consistent response wrapper (configured via interceptors):
```json
{
  "code": 200,
  "message": "Success",
  "data": { ... },
  "timestamp": "2025-10-22T..."
}
```

Pagination response:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Dependency Injection Best Practices

**Critical**: All NestJS services must properly inject dependencies through constructors. Do NOT use direct imports of service instances.

Correct pattern:
```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly roleService: RoleService,  // ✅ Injected
  ) {}
}
```

Common DI issues:
- Missing `@Injectable()` decorator
- Circular dependencies (use `forwardRef()`)
- Missing provider in module's `providers` array
- Importing concrete classes instead of interfaces

Check for DI issues:
```bash
./scripts/check-all-services-di.sh
./scripts/scan-di-issues.sh
```

## Development Workflow

### Starting Development

1. Start infrastructure:
   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq minio consul
   ```

2. Start backend services (choose one method):
   - Docker (easiest): `docker compose -f docker-compose.dev.yml up -d`
   - Local (for debugging): See "Local Development" commands above

3. Start frontends:
   ```bash
   cd frontend/admin && pnpm run dev  # Terminal 1
   cd frontend/user && pnpm run dev   # Terminal 2
   ```

4. Verify health:
   ```bash
   ./check-health.sh
   ```

### Making Changes

**Backend (NestJS)**:
- Hot reload is enabled via `nest start --watch`
- Changes to `.ts` files trigger automatic restart
- Database schema changes require migrations

**Frontend**:
- Vite HMR (Hot Module Replacement) updates instantly
- No restart needed for most changes

**Python/Go services**:
- Manual restart required (no hot reload in dev)

### Testing API Endpoints

Use the provided test script:
```bash
./test-api.sh
```

Or use Swagger UI:
- API Gateway: http://localhost:30000/api/docs

Sample accounts (see `TEST_ACCOUNTS.md`):
- Admin: `admin` / `admin123`
- User: `testuser` / `user123`

### Common Tasks

**Add a new NestJS endpoint**:
1. Create DTO in `dto/` folder
2. Add method to service
3. Add route to controller with decorators (`@Get`, `@Post`, etc.)
4. Add Swagger annotations (`@ApiOperation`, `@ApiResponse`)

**Add a new database table**:
1. Create entity file in `entities/`
2. Add to module's `TypeOrmModule.forFeature([NewEntity])`
3. Generate migration: `pnpm run migrate:diff`
4. Review and apply: `pnpm run migrate:apply`

**Add a new event**:
1. Define schema in `backend/shared/src/events/schemas/`
2. Use `EventPublisher.publish()` to emit
3. Use `@RabbitSubscribe()` decorator to consume

**Debugging Docker services**:
```bash
# View logs
docker compose -f docker-compose.dev.yml logs -f [service-name]

# Execute commands in container
docker compose -f docker-compose.dev.yml exec [service-name] sh

# Restart single service
docker compose -f docker-compose.dev.yml restart [service-name]

# Rebuild service
docker compose -f docker-compose.dev.yml build [service-name]
docker compose -f docker-compose.dev.yml up -d [service-name]
```

## Production Deployment

**Docker images**:
- Multi-stage Dockerfiles in `infrastructure/docker/`
- Build: `docker build -f infrastructure/docker/[service].Dockerfile -t cloudphone/[service]:latest backend/[service]`

**Kubernetes**:
- Manifests in `infrastructure/k8s/`
- Apply: `kubectl apply -f infrastructure/k8s/`

**Key production considerations**:
- Change `JWT_SECRET` to strong random value (64+ chars)
- Use managed PostgreSQL, Redis, RabbitMQ
- Configure horizontal pod autoscaling
- Set up persistent volumes for data
- Enable TLS/HTTPS in Envoy
- Configure AlertManager webhooks (email/Slack)
- Reduce Jaeger sampling to 10% (from 100%)

## Troubleshooting

**Service won't start**:
- Check logs: `docker compose logs [service-name]`
- Verify environment variables
- Check database connection
- Ensure dependencies are started (postgres, redis)

**Consul registration failing**:
- Check health endpoint returns 200
- Verify `USE_CONSUL=true` in env
- Check database is healthy (required for health check)
- View Consul UI: http://localhost:8500

**Database errors**:
- Verify database exists: `psql -U postgres -l`
- Check connection string in .env
- Run migrations: `pnpm run migrate:apply`

**TypeScript compilation errors**:
- Clear dist folder: `rm -rf dist/`
- Reinstall dependencies: `pnpm install`
- Check TypeScript version matches across services

**RabbitMQ connection issues**:
- Check RabbitMQ is running: `docker ps | grep rabbitmq`
- Verify RABBITMQ_URL format: `amqp://user:pass@host:port/vhost`
- Check virtual host exists: http://localhost:15672 (admin/admin123)

## Documentation

Key documentation files:
- `COMPLETE_INTEGRATION_GUIDE.md` - Envoy/Consul/Monitoring integration overview
- `MONITORING_INTEGRATION_COMPLETE.md` - Monitoring setup details
- `LOGGING_SYSTEM.md` - Logging configuration and usage
- `CACHE_USAGE_GUIDE.md` - Redis caching patterns
- `EVENT_STATUS.md` - RabbitMQ event architecture
- `TEST_ACCOUNTS.md` - Test user credentials
- `docs/ENVIRONMENT_VARIABLES.md` - All environment variable documentation
- `infrastructure/envoy/README.md` - Envoy configuration (500+ lines)
- `infrastructure/monitoring/README.md` - Monitoring stack guide (500+ lines)

## Contact & Resources

- **GitHub Issues**: Report bugs and request features
- **README.md**: High-level project overview
- **Architecture Docs**: See `ARCHITECTURE_*.md` files for design decisions
