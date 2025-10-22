#!/bin/bash

set -e

echo "Starting all microservices locally..."

# Create logs directory
mkdir -p /home/eric/next-cloudphone/logs

# Export common environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=postgres
export DB_PASSWORD=postgres
export DB_DATABASE=cloudphone_user  # user-service 会覆盖这个
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=your-super-secret-jwt-key-change-in-production
export MINIO_ENDPOINT=localhost
export MINIO_PORT=9000
export MINIO_ACCESS_KEY=minioadmin
export MINIO_SECRET_KEY=minioadmin
export RABBITMQ_URL=amqp://admin:admin123@localhost:5672/cloudphone
export CONSUL_HOST=localhost
export CONSUL_PORT=8500

# Kill any existing services
echo "Stopping any existing services..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "pnpm run dev" 2>/dev/null || true
sleep 2

# Start API Gateway (Port 30000)
echo "Starting API Gateway on port 30000..."
cd /home/eric/next-cloudphone/backend/api-gateway
PORT=30000 DB_DATABASE=cloudphone_auth pnpm run dev > /home/eric/next-cloudphone/logs/api-gateway.log 2>&1 &
echo "  API Gateway PID: $!"

sleep 2

# Start User Service (Port 30001)
echo "Starting User Service on port 30001..."
cd /home/eric/next-cloudphone/backend/user-service
PORT=30001 DB_DATABASE=cloudphone_user pnpm run dev > /home/eric/next-cloudphone/logs/user-service.log 2>&1 &
echo "  User Service PID: $!"

sleep 2

# Start Device Service (Port 30002)
echo "Starting Device Service on port 30002..."
cd /home/eric/next-cloudphone/backend/device-service
PORT=30002 DB_DATABASE=cloudphone_device pnpm run dev > /home/eric/next-cloudphone/logs/device-service.log 2>&1 &
echo "  Device Service PID: $!"

sleep 2

# Start App Service (Port 30003)
echo "Starting App Service on port 30003..."
cd /home/eric/next-cloudphone/backend/app-service
PORT=30003 DB_DATABASE=cloudphone_app pnpm run dev > /home/eric/next-cloudphone/logs/app-service.log 2>&1 &
echo "  App Service PID: $!"

sleep 2

# Start Billing Service (Port 30005)
echo "Starting Billing Service on port 30005..."
cd /home/eric/next-cloudphone/backend/billing-service
PORT=30005 DB_DATABASE=cloudphone_billing pnpm run dev > /home/eric/next-cloudphone/logs/billing-service.log 2>&1 &
echo "  Billing Service PID: $!"

sleep 2

# Start Notification Service (Port 30006)
echo "Starting Notification Service on port 30006..."
cd /home/eric/next-cloudphone/backend/notification-service
PORT=30006 DB_DATABASE=cloudphone_notification pnpm run dev > /home/eric/next-cloudphone/logs/notification-service.log 2>&1 &
echo "  Notification Service PID: $!"

sleep 3

echo ""
echo "===== All Backend Services Started ====="
echo ""
echo "Service Status:"
echo "  API Gateway:      http://localhost:30000/api"
echo "  User Service:     http://localhost:30001/health"
echo "  Device Service:   http://localhost:30002/health"
echo "  App Service:      http://localhost:30003/health"
echo "  Billing Service:  http://localhost:30005/health"
echo "  Notification Service: http://localhost:30006/health"
echo ""
echo "Logs are available in /home/eric/next-cloudphone/logs/"
echo ""
echo "Check service health with:"
echo "  curl http://localhost:30000/health"
echo "  curl http://localhost:30001/health"
echo ""
echo "To stop all services, run:"
echo "  pkill -f 'nest start'"
echo "  pkill -f 'pnpm run dev'"
echo ""
