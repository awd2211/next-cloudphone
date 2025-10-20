#!/bin/bash

set -e

echo "Starting frontend applications..."

# Create logs directory
mkdir -p /home/eric/next-cloudphone/logs

# Kill any existing frontend processes
echo "Stopping any existing frontend processes..."
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start Admin Frontend (Port 5173)
echo "Starting Admin Frontend on port 5173..."
cd /home/eric/next-cloudphone/frontend/admin
pnpm run dev > /home/eric/next-cloudphone/logs/admin-frontend.log 2>&1 &
echo "  Admin Frontend PID: $!"

sleep 2

# Start User Frontend (Port 5174)
echo "Starting User Frontend on port 5174..."
cd /home/eric/next-cloudphone/frontend/user
pnpm run dev > /home/eric/next-cloudphone/logs/user-frontend.log 2>&1 &
echo "  User Frontend PID: $!"

sleep 3

echo ""
echo "===== Frontend Applications Started ====="
echo ""
echo "Admin Frontend: http://localhost:5173"
echo "User Frontend:  http://localhost:5174"
echo ""
echo "Logs are available in /home/eric/next-cloudphone/logs/"
echo ""
echo "To stop frontends, run:"
echo "  pkill -f 'vite'"
echo ""
