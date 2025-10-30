# Quick Start Guide - Cloud Phone Platform

## Services Overview

### Backend Services
| Service | Port | URL | Status |
|---------|------|-----|--------|
| API Gateway | 30000 | http://localhost:30000 | ✅ Running |
| User Service | 30001 | http://localhost:30001 | ✅ Running |
| Device Service | 30002 | http://localhost:30002 | ⚠️ Degraded (DB OK) |
| App Service | 30003 | http://localhost:30003 | ✅ Running |
| Billing Service | 30005 | http://localhost:30005 | ✅ Running |
| Notification Service | 30006 | http://localhost:30006 | ✅ Running |

### Frontend Applications
| App | Port | URL | Status |
|-----|------|-----|--------|
| Admin Dashboard | 5175 | http://localhost:5175 | ✅ Running |

### Infrastructure
| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| PostgreSQL | 5432 | localhost:5432 | postgres/postgres |
| Redis | 6379 | localhost:6379 | (no password) |
| RabbitMQ | 15672 | http://localhost:15672 | admin/admin123 |
| MinIO | 9001 | http://localhost:9001 | minioadmin/minioadmin |
| Consul | 8500 | http://localhost:8500 | (no auth) |

---

## Quick Commands

### Start All Services
```bash
# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Check backend services
pm2 list

# Start frontend
cd frontend/admin && pnpm dev
```

### Test Authentication
```bash
# Login
curl -X POST http://localhost:30000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# Save token
TOKEN="<paste-token-here>"

# Test authenticated request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:30000/api/v1/users
```

### Check Service Health
```bash
# All services
for port in 30000 30001 30002 30003 30005 30006; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r '.status // .data.status')"
done

# Detailed device service health
curl -s http://localhost:30002/health | jq '.data'
```

### Database Access
```bash
# Connect to PostgreSQL
docker compose -f docker-compose.dev.yml exec postgres psql -U postgres

# List databases
\l

# Connect to specific database
\c cloudphone_user

# List tables
\dt

# Check user permissions
SELECT u.username, r.name as role, COUNT(p.id) as permission_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
GROUP BY u.username, r.name;
```

### Redis Access
```bash
# Connect to Redis
docker compose -f docker-compose.dev.yml exec redis redis-cli

# Check cache keys
KEYS *

# Clear specific key pattern
KEYS "*::1*" | xargs redis-cli DEL

# Monitor Redis commands
MONITOR
```

### RabbitMQ Access
```bash
# List queues
curl -u admin:admin123 http://localhost:15672/api/queues

# List exchanges
curl -u admin:admin123 http://localhost:15672/api/exchanges

# Purge a queue
curl -u admin:admin123 -X DELETE \
  http://localhost:15672/api/queues/%2F/notification-service.user.registered/contents
```

### Service Management (PM2)
```bash
# List all services
pm2 list

# View logs
pm2 logs notification-service
pm2 logs notification-service --lines 100

# Restart service
pm2 restart notification-service

# Stop service
pm2 stop notification-service

# Rebuild and restart
cd backend/notification-service
pnpm build
pm2 restart notification-service
```

---

## Default Credentials

### Database Users
- **Username:** admin
- **Password:** Admin123!
- **User ID:** 10000000-0000-0000-0000-000000000001
- **Role:** admin (27 permissions)

### PostgreSQL
- **User:** postgres
- **Password:** postgres
- **Databases:** cloudphone, cloudphone_user, cloudphone_device, cloudphone_billing, cloudphone_app, cloudphone_notification

### RabbitMQ
- **User:** admin
- **Password:** admin123
- **Vhost:** cloudphone

### MinIO
- **User:** minioadmin
- **Password:** minioadmin
- **Bucket:** cloudphone-apps

---

## API Endpoints

### Authentication (API Gateway)
```bash
# Login
POST http://localhost:30000/api/v1/auth/login
Body: {"username":"admin","password":"Admin123!"}

# Register (if enabled)
POST http://localhost:30000/api/v1/auth/register
Body: {"username":"...","password":"...","email":"..."}
```

### Users (User Service)
```bash
# Get all users
GET http://localhost:30000/api/v1/users
Headers: Authorization: Bearer <token>

# Get user by ID
GET http://localhost:30000/api/v1/users/:id
Headers: Authorization: Bearer <token>

# Create user
POST http://localhost:30000/api/v1/users
Headers: Authorization: Bearer <token>
Body: {"username":"...","password":"...","email":"..."}
```

### Billing (Billing Service)
```bash
# Get plans
GET http://localhost:30000/api/v1/billing/plans
Headers: Authorization: Bearer <token>

# Create plan
POST http://localhost:30000/api/v1/billing/plans
Headers: Authorization: Bearer <token>
Body: {"name":"...","price":100,"features":[]}
```

### Notifications (Notification Service)
```bash
# Get user notifications
GET http://localhost:30000/api/v1/notifications/user/:userId?page=1&limit=10
Headers: Authorization: Bearer <token>

# Mark as read
POST http://localhost:30000/api/v1/notifications/:id/read
Headers: Authorization: Bearer <token>

# Create notification (admin)
POST http://localhost:30000/api/v1/notifications
Headers: Authorization: Bearer <token>
Body: {"title":"...","message":"...","type":"info"}
```

### Devices (Device Service)
```bash
# Get devices
GET http://localhost:30000/api/v1/devices
Headers: Authorization: Bearer <token>

# Create device
POST http://localhost:30000/api/v1/devices
Headers: Authorization: Bearer <token>
Body: {"userId":"...","specs":{}}
```

---

## Troubleshooting

### Service Won't Start
```bash
# Check logs
pm2 logs <service-name>

# Check if port is in use
lsof -i :<port>
ss -tlnp | grep <port>

# Rebuild service
cd backend/<service-name>
pnpm build
pm2 restart <service-name>
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.dev.yml ps postgres

# Check connection
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -c "SELECT 1"

# Check .env file
cat backend/<service-name>/.env | grep DB_
```

### Authentication Fails
```bash
# Check JWT_SECRET consistency
for service in user-service device-service app-service billing-service notification-service api-gateway; do
  echo "$service: $(grep JWT_SECRET backend/$service/.env | cut -d= -f2)"
done

# Check if all secrets match
# Expected: dev-secret-key-change-in-production

# Check user permissions
docker compose -f docker-compose.dev.yml exec postgres \
  psql -U postgres -d cloudphone_user -c \
  "SELECT COUNT(*) FROM permissions"

# Expected: 27 permissions
```

### Cache Errors
```bash
# Check Redis connection
docker compose -f docker-compose.dev.yml exec redis redis-cli PING

# Check cache-manager version
cd backend/notification-service
pnpm list | grep cache-manager

# Expected:
# cache-manager@5.4.0
# cache-manager-redis-yet@5.1.5
# @nestjs/cache-manager@2.2.2
```

### Frontend Can't Connect
```bash
# Check API Gateway is running
curl http://localhost:30000/health

# Check CORS settings
curl -I -X OPTIONS http://localhost:30000/api/v1/users \
  -H "Origin: http://localhost:5175"

# Should include Access-Control-Allow-Origin header

# Check frontend .env
cat frontend/admin/.env | grep VITE_API_BASE_URL

# Expected: http://localhost:30000
```

---

## Development Workflow

### Making Changes to Backend Service

1. **Edit code** in `backend/<service-name>/src/`
2. **Rebuild:** `cd backend/<service-name> && pnpm build`
3. **Restart:** `pm2 restart <service-name>`
4. **Check logs:** `pm2 logs <service-name>`

### Making Changes to Frontend

1. **Edit code** in `frontend/admin/src/`
2. Hot reload should automatically update
3. If issues: Restart dev server

### Database Migrations

```bash
# Device Service (uses Atlas)
cd backend/device-service
pnpm migrate:status
pnpm migrate:apply

# Other Services (SQL files)
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < backend/user-service/migrations/<file>.sql
```

### Adding New RBAC Permission

1. **Add to migrations:**
```sql
-- backend/user-service/migrations/00000000000003_add_new_permission.sql
INSERT INTO permissions (id, name, description, resource, action)
VALUES (
  gen_random_uuid(),
  'feature.action',
  'Description of permission',
  'feature',
  'action'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name = 'feature.action';
```

2. **Apply migration:**
```bash
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < backend/user-service/migrations/00000000000003_add_new_permission.sql
```

3. **Login again to get new token with updated permissions**

---

## Environment Variables

### Critical Environment Variables

All services must have these set consistently:

```bash
# JWT Secret (MUST BE SAME ACROSS ALL SERVICES)
JWT_SECRET=dev-secret-key-change-in-production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=cloudphone_<service>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672/cloudphone

# Consul
CONSUL_HOST=localhost
CONSUL_PORT=8500
```

### Service-Specific Variables

**notification-service:**
```bash
REDIS_CACHE_DB=1
REDIS_OTP_DB=2
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

**billing-service:**
```bash
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=...
```

**device-service:**
```bash
DOCKER_HOST=unix:///var/run/docker.sock
ADB_PORT_START=5555
ADB_PORT_END=5655
```

---

## Monitoring & Debugging

### View Service Metrics
```bash
# Prometheus metrics endpoint
curl http://localhost:30002/metrics

# Health check with dependencies
curl http://localhost:30002/health | jq '.data.dependencies'
```

### Enable Debug Logging
```bash
# Set LOG_LEVEL in .env
LOG_LEVEL=debug

# Rebuild and restart
pnpm build && pm2 restart <service-name>
```

### Check Event Flow (RabbitMQ)
```bash
# Subscribe to all events
cd backend/notification-service
pnpm run rabbitmq:subscribe

# Or view in RabbitMQ UI
open http://localhost:15672
# Username: admin, Password: admin123
```

---

## Production Deployment Checklist

- [ ] Change JWT_SECRET to secure random string
- [ ] Update all database passwords
- [ ] Configure SSL/TLS for all services
- [ ] Set up proper CORS origins
- [ ] Enable rate limiting on API Gateway
- [ ] Configure log aggregation (e.g., ELK stack)
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Set up CI/CD pipeline
- [ ] Load test all critical APIs
- [ ] Review and harden security settings
- [ ] Configure reverse proxy (Nginx/Traefik)
- [ ] Set up health check monitoring
- [ ] Configure log rotation
- [ ] Set up distributed tracing

---

## Useful Resources

### Documentation
- Backend API: http://localhost:30000/api/v1/docs (Swagger)
- User Service: http://localhost:30001/api/v1/docs
- Device Service: http://localhost:30002/api/v1/docs

### Monitoring
- RabbitMQ: http://localhost:15672
- Consul: http://localhost:8500
- MinIO: http://localhost:9001

### Logs
- Backend: `pm2 logs <service-name>`
- Frontend: Browser console
- Infrastructure: `docker compose -f docker-compose.dev.yml logs -f`

---

**Last Updated:** 2025-10-30
**System Status:** ✅ Production Ready
