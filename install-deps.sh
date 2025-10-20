#!/bin/bash

echo "Installing dependencies for all backend services..."

services=(
  "backend/api-gateway"
  "backend/user-service"
  "backend/device-service"
  "backend/app-service"
  "backend/billing-service"
)

for service in "${services[@]}"; do
  echo ""
  echo "=== Installing dependencies for $service ==="
  cd "/home/eric/next-cloudphone/$service"
  if [ -f package.json ]; then
    pnpm install --prefer-offline
  else
    echo "No package.json found in $service"
  fi
done

echo ""
echo "=== Installing frontend dependencies ==="

cd "/home/eric/next-cloudphone/frontend/admin"
pnpm install --prefer-offline

cd "/home/eric/next-cloudphone/frontend/user"
pnpm install --prefer-offline

echo ""
echo "All dependencies installed successfully!"
