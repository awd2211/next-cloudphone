#!/bin/bash
#
# Cloud Phone Platform - Kubernetes Deployment Script
# ==================================================
# This script deploys all Cloud Phone Platform services to Kubernetes
#
# Usage:
#   ./deploy.sh [environment]
#
# Environments: dev, staging, production
#
# Prerequisites:
# - kubectl configured and connected to your cluster
# - Docker images built and pushed to registry
# - Storage class 'standard' available in cluster
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
NAMESPACE="cloudphone"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl first."
        exit 1
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

create_namespace() {
    log_info "Creating namespace: $NAMESPACE..."

    if kubectl get namespace $NAMESPACE &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f $SCRIPT_DIR/namespace.yaml
        log_success "Namespace created"
    fi
}

deploy_config() {
    log_info "Deploying ConfigMaps and Secrets..."

    # ConfigMaps
    kubectl apply -f $SCRIPT_DIR/configmaps/ -n $NAMESPACE

    # Secrets (IMPORTANT: Update secrets with production values first!)
    if [ "$ENVIRONMENT" = "production" ]; then
        log_warning "IMPORTANT: Ensure you have updated secrets in secrets/cloudphone-secrets.yaml with production values!"
        read -p "Have you updated the secrets? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_error "Deployment cancelled. Please update secrets first."
            exit 1
        fi
    fi

    kubectl apply -f $SCRIPT_DIR/secrets/ -n $NAMESPACE

    log_success "Configuration deployed"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure services (PostgreSQL, Redis, RabbitMQ)..."

    # StatefulSets
    kubectl apply -f $SCRIPT_DIR/statefulsets/postgres.yaml -n $NAMESPACE
    log_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s || log_warning "PostgreSQL timeout, continuing..."

    kubectl apply -f $SCRIPT_DIR/statefulsets/redis.yaml -n $NAMESPACE
    log_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s || log_warning "Redis timeout, continuing..."

    kubectl apply -f $SCRIPT_DIR/statefulsets/rabbitmq.yaml -n $NAMESPACE
    log_info "Waiting for RabbitMQ to be ready..."
    kubectl wait --for=condition=ready pod -l app=rabbitmq -n $NAMESPACE --timeout=300s || log_warning "RabbitMQ timeout, continuing..."

    log_success "Infrastructure services deployed"
}

deploy_services() {
    log_info "Deploying microservices..."

    # Deploy services in order
    SERVICES=(
        "user-service"
        "device-service"
        "app-service"
        "billing-service"
        "notification-service"
        "api-gateway"
    )

    for service in "${SERVICES[@]}"; do
        if [ -f "$SCRIPT_DIR/deployments/$service.yaml" ]; then
            log_info "Deploying $service..."
            kubectl apply -f $SCRIPT_DIR/deployments/$service.yaml -n $NAMESPACE
        else
            log_warning "Deployment file for $service not found, skipping..."
        fi
    done

    log_success "Microservices deployed"
}

deploy_ingress() {
    log_info "Deploying Ingress..."

    if [ -f "$SCRIPT_DIR/ingress/ingress.yaml" ]; then
        kubectl apply -f $SCRIPT_DIR/ingress/ingress.yaml -n $NAMESPACE
        log_success "Ingress deployed"
    else
        log_warning "Ingress configuration not found"
    fi
}

show_status() {
    log_info "Deployment Status:"
    echo ""

    log_info "Pods:"
    kubectl get pods -n $NAMESPACE

    echo ""
    log_info "Services:"
    kubectl get services -n $NAMESPACE

    echo ""
    log_info "Ingress:"
    kubectl get ingress -n $NAMESPACE

    echo ""
    log_info "PersistentVolumeClaims:"
    kubectl get pvc -n $NAMESPACE
}

# Main deployment flow
main() {
    log_info "========================================="
    log_info "Cloud Phone Platform Kubernetes Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Namespace: $NAMESPACE"
    log_info "========================================="
    echo ""

    check_prerequisites
    create_namespace
    deploy_config
    deploy_infrastructure

    log_info "Waiting 30 seconds for infrastructure to stabilize..."
    sleep 30

    deploy_services
    deploy_ingress

    echo ""
    log_success "========================================="
    log_success "Deployment Complete!"
    log_success "========================================="
    echo ""

    show_status

    echo ""
    log_info "Next Steps:"
    log_info "1. Monitor pod status: kubectl get pods -n $NAMESPACE -w"
    log_info "2. Check logs: kubectl logs -f <pod-name> -n $NAMESPACE"
    log_info "3. Access services via Ingress or port-forward"
    log_info "4. Run database migrations: kubectl exec -it <user-service-pod> -n $NAMESPACE -- pnpm migrate:apply"
}

# Run main function
main
