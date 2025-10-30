# Cloud Phone Platform - Kubernetes Deployment Guide

Complete production-ready Kubernetes manifests for deploying the Cloud Phone Platform.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Scaling](#scaling)
7. [Monitoring](#monitoring)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Tools

- **kubectl** >= 1.25
- **Kubernetes cluster** >= 1.25 (EKS, GKE, AKS, or self-hosted)
- **Helm** >= 3.0 (optional, for easier package management)
- **Docker** (for building images)

### Cluster Requirements

**Minimum Resources:**
- 6 worker nodes (4 vCPU, 16GB RAM each)
- 200GB persistent storage
- Load Balancer support (cloud provider or MetalLB)
- StorageClass named `standard` available

**Recommended:**
- 10+ worker nodes
- 500GB+ persistent storage
- Monitoring stack (Prometheus + Grafana)
- Certificate management (cert-manager)

---

## 🏗️ Architecture Overview

### Namespace: `cloudphone`

All resources are deployed in the `cloudphone` namespace for isolation.

### Services

#### Infrastructure (StatefulSets)
- **PostgreSQL** - Multi-database instance (14-alpine)
  - 6 databases: user, device, app, billing, notification, scheduler
  - 50GB PVC
  - 1 replica (use Patroni for HA)

- **Redis** - Cache and session storage (7-alpine)
  - AOF persistence enabled
  - 10GB PVC
  - 1 replica (use Redis Sentinel for HA)

- **RabbitMQ** - Message broker (3-management-alpine)
  - Virtual host: `/cloudphone`
  - 20GB PVC
  - 1 replica (use RabbitMQ cluster for HA)

#### Microservices (Deployments)
- **api-gateway** - Entry point (3 replicas, HPA 3-20)
- **user-service** - User & Auth (3 replicas, HPA 3-10)
- **device-service** - Device management (3 replicas, HPA 3-10)
- **app-service** - APK management (2 replicas)
- **billing-service** - Billing & metering (2 replicas)
- **notification-service** - Multi-channel notifications (2 replicas)

---

## 🚀 Quick Start

### 1. Prepare Environment

```bash
# Clone repository
cd /path/to/cloudphone

# Navigate to k8s directory
cd infrastructure/k8s

# Review and update configuration
./prepare.sh
```

### 2. Update Secrets (CRITICAL!)

**BEFORE deploying to production**, update the secrets with strong values:

```bash
# Edit secrets file
nano secrets/cloudphone-secrets.yaml

# Generate secure secrets
echo -n 'your-super-secret-jwt-key' | base64
# Replace values in cloudphone-secrets.yaml
```

**Required secrets to update:**
- `db_password` - PostgreSQL password
- `jwt_secret` - JWT signing key (CRITICAL)
- `service_jwt_secret` - Service-to-service JWT key
- `rabbitmq_password` - RabbitMQ admin password
- `minio_access_key` / `minio_secret_key` - MinIO credentials

### 3. Deploy

```bash
# Make script executable
chmod +x deploy.sh

# Deploy everything
./deploy.sh production
```

### 4. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n cloudphone

# Check services
kubectl get svc -n cloudphone

# Check ingress
kubectl get ingress -n cloudphone
```

---

## ⚙️ Configuration

### ConfigMaps

**shared-config.yaml**
Contains non-sensitive configuration shared across all services:
- Database connection settings
- Redis connection settings
- RabbitMQ connection settings
- Service URLs
- Feature flags

```bash
# Edit configuration
kubectl edit configmap cloudphone-shared-config -n cloudphone

# Restart pods to apply changes
kubectl rollout restart deployment -n cloudphone
```

### Secrets

**cloudphone-secrets.yaml**
Contains sensitive data (base64 encoded):

```bash
# View current secrets (base64 decoded)
kubectl get secret cloudphone-secrets -n cloudphone -o jsonpath='{.data.jwt_secret}' | base64 -d

# Update a secret
kubectl create secret generic cloudphone-secrets \
  --from-literal=jwt_secret='new-secret-value' \
  --dry-run=client -o yaml | kubectl apply -n cloudphone -f -

# Restart services to use new secrets
kubectl rollout restart deployment -n cloudphone
```

---

## 📦 Deployment

### Manual Deployment Steps

#### 1. Create Namespace
```bash
kubectl apply -f namespace.yaml
```

#### 2. Deploy ConfigMaps & Secrets
```bash
kubectl apply -f configmaps/ -n cloudphone
kubectl apply -f secrets/ -n cloudphone
```

#### 3. Deploy Infrastructure
```bash
# PostgreSQL
kubectl apply -f statefulsets/postgres.yaml -n cloudphone
kubectl wait --for=condition=ready pod -l app=postgres -n cloudphone --timeout=300s

# Redis
kubectl apply -f statefulsets/redis.yaml -n cloudphone
kubectl wait --for=condition=ready pod -l app=redis -n cloudphone --timeout=300s

# RabbitMQ
kubectl apply -f statefulsets/rabbitmq.yaml -n cloudphone
kubectl wait --for=condition=ready pod -l app=rabbitmq -n cloudphone --timeout=300s
```

#### 4. Initialize Databases

```bash
# Get PostgreSQL pod name
PG_POD=$(kubectl get pod -l app=postgres -n cloudphone -o jsonpath='{.items[0].metadata.name}')

# Run database initialization (if not using init script)
kubectl exec -it $PG_POD -n cloudphone -- psql -U postgres -f /path/to/init-databases.sql

# Apply migrations for each service
kubectl exec -it <user-service-pod> -n cloudphone -- npm run migrate:apply
kubectl exec -it <device-service-pod> -n cloudphone -- pnpm migrate:apply
```

#### 5. Deploy Microservices

```bash
# Deploy in order
kubectl apply -f deployments/user-service.yaml -n cloudphone
kubectl apply -f deployments/device-service.yaml -n cloudphone
kubectl apply -f deployments/app-service.yaml -n cloudphone
kubectl apply -f deployments/billing-service.yaml -n cloudphone
kubectl apply -f deployments/notification-service.yaml -n cloudphone
kubectl apply -f deployments/api-gateway-v2.yaml -n cloudphone

# Wait for all deployments
kubectl wait --for=condition=available deployment --all -n cloudphone --timeout=600s
```

#### 6. Deploy Ingress

```bash
# Install NGINX Ingress Controller (if not installed)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Deploy ingress
kubectl apply -f ingress/ingress.yaml -n cloudphone

# Get ingress IP
kubectl get ingress -n cloudphone
```

---

## 📈 Scaling

### Horizontal Pod Autoscaler (HPA)

All microservices have HPA configured:

```bash
# View HPA status
kubectl get hpa -n cloudphone

# Scale manually (overrides HPA temporarily)
kubectl scale deployment user-service --replicas=5 -n cloudphone

# Update HPA limits
kubectl edit hpa user-service-hpa -n cloudphone
```

**Current HPA Configuration:**

| Service | Min | Max | CPU Target | Memory Target |
|---------|-----|-----|------------|---------------|
| api-gateway | 3 | 20 | 70% | - |
| user-service | 3 | 10 | 70% | 80% |
| device-service | 3 | 10 | 70% | 80% |

### Manual Scaling

```bash
# Scale StatefulSet (requires careful consideration)
kubectl scale statefulset postgres --replicas=3 -n cloudphone

# Scale Deployment
kubectl scale deployment billing-service --replicas=5 -n cloudphone
```

---

## 📊 Monitoring

### Health Checks

```bash
# Check all pod health
kubectl get pods -n cloudphone

# Port-forward to check service health directly
kubectl port-forward svc/user-service 30001:30001 -n cloudphone
curl http://localhost:30001/health
```

### Logs

```bash
# View logs for a service
kubectl logs -f deployment/user-service -n cloudphone

# View logs for all replicas
kubectl logs -f -l app=user-service -n cloudphone

# View logs with timestamps
kubectl logs --timestamps -f deployment/device-service -n cloudphone

# View previous logs (after pod restart)
kubectl logs --previous <pod-name> -n cloudphone
```

### Events

```bash
# View recent events
kubectl get events -n cloudphone --sort-by='.lastTimestamp'

# Watch events in real-time
kubectl get events -n cloudphone --watch
```

### Metrics

```bash
# Pod metrics (requires metrics-server)
kubectl top pods -n cloudphone

# Node metrics
kubectl top nodes
```

---

## 💾 Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup script
PG_POD=$(kubectl get pod -l app=postgres -n cloudphone -o jsonpath='{.items[0].metadata.name}')

# Backup all databases
for db in cloudphone_user cloudphone_device cloudphone_app cloudphone_billing cloudphone_notification cloudphone_scheduler; do
  kubectl exec $PG_POD -n cloudphone -- pg_dump -U postgres $db | gzip > backup-$db-$(date +%Y%m%d).sql.gz
done
```

### Restore Database

```bash
# Restore a database
gunzip < backup-cloudphone_user-20251030.sql.gz | \
  kubectl exec -i $PG_POD -n cloudphone -- psql -U postgres cloudphone_user
```

### Persistent Volume Snapshots

```bash
# Create VolumeSnapshot (if CSI driver supports it)
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-$(date +%Y%m%d)
  namespace: cloudphone
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: postgres-data-postgres-0
EOF
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status and events
kubectl describe pod <pod-name> -n cloudphone

# Check pod logs
kubectl logs <pod-name> -n cloudphone

# Common causes:
# - Image pull errors (check imagePullPolicy)
# - Resource limits (check node capacity)
# - ConfigMap/Secret not found
# - PVC pending (check StorageClass)
```

#### 2. Service Connection Issues

```bash
# Test service connectivity from another pod
kubectl run test-pod --image=busybox --rm -it -n cloudphone -- sh

# Inside test pod
nslookup user-service
telnet user-service 30001
wget -O- http://user-service:30001/health
```

#### 3. Database Connection Failures

```bash
# Check PostgreSQL is running
kubectl get pods -l app=postgres -n cloudphone

# Test database connection
kubectl exec -it <user-service-pod> -n cloudphone -- sh
psql -h postgres-service -U postgres -d cloudphone_user

# Check credentials
kubectl get secret cloudphone-secrets -n cloudphone -o jsonpath='{.data.db_password}' | base64 -d
```

#### 4. Ingress Not Working

```bash
# Check ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl describe ingress cloudphone-ingress -n cloudphone

# Check service endpoints
kubectl get endpoints -n cloudphone
```

### Debug Commands

```bash
# Shell into a pod
kubectl exec -it <pod-name> -n cloudphone -- /bin/sh

# Copy files from pod
kubectl cp cloudphone/<pod-name>:/path/to/file ./local-file

# Port forward to access service locally
kubectl port-forward svc/api-gateway 8080:80 -n cloudphone

# Restart a deployment
kubectl rollout restart deployment user-service -n cloudphone

# View deployment history
kubectl rollout history deployment user-service -n cloudphone

# Rollback to previous version
kubectl rollout undo deployment user-service -n cloudphone
```

---

## 📚 Additional Resources

### Official Documentation
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager](https://cert-manager.io/docs/)

### Project Documentation
- [CLAUDE.md](../../CLAUDE.md) - Project architecture
- [DATABASE_SEPARATION_ARCHITECTURE_VALIDATED.md](../../DATABASE_SEPARATION_ARCHITECTURE_VALIDATED.md)
- [SERVICE_TO_SERVICE_AUTH_IMPLEMENTATION_COMPLETE.md](../../SERVICE_TO_SERVICE_AUTH_IMPLEMENTATION_COMPLETE.md)

---

## ✅ Deployment Checklist

Before deploying to production, ensure:

- [ ] Updated all secrets in `cloudphone-secrets.yaml`
- [ ] Reviewed and customized `cloudphone-shared-config` ConfigMap
- [ ] Configured persistent storage (StorageClass)
- [ ] Set up load balancer or Ingress controller
- [ ] Configured TLS certificates (cert-manager or manual)
- [ ] Set appropriate resource limits and requests
- [ ] Tested database connectivity
- [ ] Applied database migrations
- [ ] Configured monitoring (Prometheus + Grafana)
- [ ] Set up backup strategy for PostgreSQL
- [ ] Configured log aggregation (ELK/Loki)
- [ ] Tested horizontal pod autoscaling
- [ ] Verified health checks are working
- [ ] Tested rolling updates
- [ ] Documented disaster recovery procedures

---

## 🎉 Summary

This Kubernetes configuration provides:

✅ **Production-ready manifests** for all services
✅ **StatefulSets** for stateful infrastructure (PostgreSQL, Redis, RabbitMQ)
✅ **Horizontal Pod Autoscaling** for dynamic scaling
✅ **Health checks** (liveness + readiness probes)
✅ **Resource limits** to prevent resource exhaustion
✅ **ConfigMaps & Secrets** for configuration management
✅ **Ingress** for external access
✅ **Namespace isolation** for multi-tenancy

**Need help?** Check the troubleshooting section or open an issue on GitHub.
