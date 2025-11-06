#!/bin/bash

# Device service files that need lockService injection
files=(
  "src/cloud/cloud-device-sync.service.ts"
  "src/cloud/cloud-device-token.service.ts"
  "src/devices/devices.service.ts"
  "src/scheduler/resource-monitor.service.ts"
  "src/scheduler/allocation-scheduler.service.ts"
  "src/scheduler/reservation.service.ts"
  "src/queue/queue.service.ts"
  "src/metrics/device-metrics.service.ts"
  "src/health/enhanced-health.service.ts"
  "src/lifecycle/autoscaling.service.ts"
  "src/lifecycle/backup-expiration.service.ts"
  "src/lifecycle/lifecycle.service.ts"
  "src/failover/failover.service.ts"
  "src/state-recovery/state-recovery.service.ts"
  "src/proxy/proxy-health.service.ts"
  "src/proxy/proxy-cleanup.service.ts"
)

cd /home/eric/next-cloudphone/backend/device-service

echo "Processing ${#files[@]} files in device-service..."
echo

for file in "${files[@]}"; do
  echo "Checking $file..."

  if [ ! -f "$file" ]; then
    echo "  ⚠️  File not found: $file"
    continue
  fi

  # Check if already has lockService
  if grep -q "lockService.*DistributedLockService" "$file"; then
    echo "  ✅ Already has lockService"
    continue
  fi

  # Find constructor and add lockService
  # This is a simplified approach - we'll do it properly in the main script
  echo "  🔧 Needs lockService injection"
done

echo
echo "Summary: Check complete. Manual injection needed."
