#!/bin/bash

# Test SMS Receive Service API
# Usage: ./scripts/test-api.sh

set -e

BASE_URL="http://localhost:30007"
DEVICE_ID="550e8400-e29b-41d4-a716-446655440000"

echo "========================================"
echo " Testing SMS Receive Service API"
echo "========================================"
echo ""

# Test 1: Health check (via polling status)
echo "Test 1: Checking service status..."
echo "-----------------------------------"
RESPONSE=$(curl -s "$BASE_URL/numbers/polling/status")
echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ Service is running"
else
  echo "❌ Service is not running properly"
  exit 1
fi

echo ""
echo "Test 2: Request a virtual number for Telegram..."
echo "------------------------------------------------"
REQUEST_DATA=$(cat <<EOF
{
  "service": "telegram",
  "country": "RU",
  "deviceId": "$DEVICE_ID"
}
EOF
)

RESPONSE=$(curl -s -X POST "$BASE_URL/numbers/request" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_DATA")

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
  NUMBER_ID=$(echo "$RESPONSE" | jq -r '.data.id')
  PHONE_NUMBER=$(echo "$RESPONSE" | jq -r '.data.phoneNumber')
  echo "✅ Number requested successfully"
  echo "   Number ID: $NUMBER_ID"
  echo "   Phone: $PHONE_NUMBER"

  echo ""
  echo "Test 3: Check number status..."
  echo "------------------------------"
  sleep 2
  STATUS_RESPONSE=$(curl -s "$BASE_URL/numbers/$NUMBER_ID")
  echo "$STATUS_RESPONSE" | jq '.'

  echo ""
  echo "Test 4: Cancel number (cleanup)..."
  echo "----------------------------------"
  sleep 1
  CANCEL_RESPONSE=$(curl -s -X POST "$BASE_URL/numbers/$NUMBER_ID/cancel")
  echo "$CANCEL_RESPONSE" | jq '.'

  if echo "$CANCEL_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Number cancelled successfully"
  fi
else
  echo "❌ Failed to request number"
  echo "$RESPONSE" | jq -r '.error'

  echo ""
  echo "Common reasons:"
  echo "  1. SMS_ACTIVATE_API_KEY not configured in .env"
  echo "  2. Insufficient balance on SMS-Activate account"
  echo "  3. No numbers available for selected service/country"
fi

echo ""
echo "========================================"
echo " Test Complete"
echo "========================================"
