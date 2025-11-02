#!/bin/bash

set -e

echo "======================================"
echo " SMS Receive Service - Quick Start"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✅ Created .env file. Please edit it and add your API keys!${NC}"
  echo ""
  echo "Required configuration:"
  echo "  - SMS_ACTIVATE_API_KEY (get from https://sms-activate.io)"
  echo ""
  read -p "Press Enter to continue after editing .env file..."
fi

echo ""
echo "Step 1: Installing dependencies..."
echo "-----------------------------------"
pnpm install

echo ""
echo "Step 2: Building the project..."
echo "-------------------------------"
pnpm build

echo ""
echo "Step 3: Running database migrations..."
echo "--------------------------------------"
pnpm migration:run

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To start the service:"
echo "  Development:  pnpm dev"
echo "  Production:   pnpm start:prod"
echo ""
echo "To test the service:"
echo "  curl http://localhost:30007/numbers/polling/status"
echo ""
