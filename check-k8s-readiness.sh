#!/bin/bash

echo "======================================================================"
echo "  K8s Readiness Check - All Backend Services"
echo "======================================================================"
echo

cd /home/eric/next-cloudphone/backend

services="user-service device-service billing-service notification-service proxy-service sms-receive-service api-gateway app-service"

echo "1. DistributedLockModule Integration Check"
echo "----------------------------------------------------------------------"
for service in $services; do
  printf "%-25s" "$service:"
  if grep -q "DistributedLockModule" "$service/src/app.module.ts" 2>/dev/null; then
    echo "✅ Has DistributedLockModule"
  else
    # Check if service has cron tasks
    cron_count=$(find "$service/src" -name "*.ts" -type f -exec grep -l "@ClusterSafeCron\|@Cron(" {} \; 2>/dev/null | wc -l)
    if [ "$cron_count" -gt 0 ]; then
      echo "❌ Missing (HAS CRON TASKS!)"
    else
      echo "⚪ Not needed (no cron tasks)"
    fi
  fi
done
echo

echo "2. @ClusterSafeCron Usage Count"
echo "----------------------------------------------------------------------"
for service in $services; do
  count=$(find "$service/src" -name "*.ts" -type f -exec grep -l "@ClusterSafeCron" {} \; 2>/dev/null | wc -l)
  printf "%-25s" "$service:"
  if [ "$count" -gt 0 ]; then
    echo "$count files"
  else
    echo "0 files"
  fi
done
echo

echo "3. Old @Cron Usage (Should be 0)"
echo "----------------------------------------------------------------------"
for service in $services; do
  count=$(find "$service/src" -name "*.ts" -type f -exec grep -l "^import.*@Cron" {} \; 2>/dev/null | grep -v "ClusterSafeCron" | wc -l)
  printf "%-25s" "$service:"
  if [ "$count" -gt 0 ]; then
    echo "⚠️  $count files (NEEDS MIGRATION)"
  else
    echo "✅ 0 files"
  fi
done
echo

echo "4. lockService Injection Check"
echo "----------------------------------------------------------------------"
for service in user-service device-service billing-service notification-service proxy-service sms-receive-service; do
  echo "--- $service ---"
  files=$(find "$service/src" -name "*.ts" -type f -exec grep -l "@ClusterSafeCron" {} \; 2>/dev/null)

  if [ -z "$files" ]; then
    echo "  No @ClusterSafeCron usage"
  else
    echo "$files" | while read file; do
      if grep -q "lockService.*DistributedLockService" "$file" 2>/dev/null; then
        echo "  ✅ $(basename $file)"
      else
        echo "  ❌ $(basename $file) - MISSING lockService"
      fi
    done
  fi
  echo
done

echo "======================================================================"
echo "  Summary"
echo "======================================================================"
echo
echo "Services with DistributedLockModule:"
has_module=$(for s in $services; do grep -q "DistributedLockModule" "$s/src/app.module.ts" 2>/dev/null && echo "$s"; done | wc -l)
echo "  $has_module / 8 services"
echo

echo "Services with @ClusterSafeCron:"
has_cluster_cron=$(for s in $services; do [ $(find "$s/src" -name "*.ts" -exec grep -l "@ClusterSafeCron" {} \; 2>/dev/null | wc -l) -gt 0 ] && echo "$s"; done | wc -l)
echo "  $has_cluster_cron / 8 services"
echo

echo "Services with old @Cron (needs migration):"
has_old_cron=$(for s in $services; do [ $(find "$s/src" -name "*.ts" -exec grep -l "^import.*Cron" {} \; 2>/dev/null | grep -v "ClusterSafeCron" | wc -l) -gt 0 ] && echo "$s"; done | wc -l)
echo "  $has_old_cron / 8 services"
echo

echo "======================================================================"
