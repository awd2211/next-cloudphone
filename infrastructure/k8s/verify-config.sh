#!/bin/bash
#
# Kubernetes Configuration Verification Script
# Validates all YAML files for syntax and completeness
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=0
WARNINGS=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((ERRORS++))
}

check_yaml_syntax() {
    local file=$1
    local basename=$(basename "$file")

    if command -v yamllint &> /dev/null; then
        if yamllint -d relaxed "$file" &> /dev/null; then
            log_success "Syntax OK: $basename"
        else
            log_error "Syntax error: $basename"
        fi
    else
        # Fallback to kubectl dry-run
        if kubectl apply --dry-run=client -f "$file" &> /dev/null; then
            log_success "Syntax OK: $basename"
        else
            log_error "Syntax error: $basename"
        fi
    fi
}

check_required_files() {
    log_info "Checking required files..."

    local required_files=(
        "namespace.yaml"
        "configmaps/shared-config.yaml"
        "secrets/cloudphone-secrets.yaml"
        "statefulsets/postgres.yaml"
        "statefulsets/redis.yaml"
        "statefulsets/rabbitmq.yaml"
        "deployments/user-service.yaml"
        "deployments/device-service.yaml"
        "deployments/api-gateway-v2.yaml"
        "ingress/ingress.yaml"
        "deploy.sh"
        "README.md"
    )

    for file in "${required_files[@]}"; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
        fi
    done
}

check_secrets_updated() {
    log_info "Checking if secrets are updated..."

    local secret_file="$SCRIPT_DIR/secrets/cloudphone-secrets.yaml"

    if grep -q "cG9zdGdyZXM=" "$secret_file"; then
        log_warning "PostgreSQL password is still default (postgres)"
    fi

    if grep -q "eW91ci1zZWNyZXQta2V5LWNoYW5nZS1pbi1wcm9kdWN0aW9u" "$secret_file"; then
        log_warning "JWT secret is still default - MUST CHANGE IN PRODUCTION!"
    fi

    if grep -q "YWRtaW4xMjM=" "$secret_file"; then
        log_warning "RabbitMQ password is still default (admin123)"
    fi
}

check_resource_limits() {
    log_info "Checking resource limits..."

    local deployment_files=("$SCRIPT_DIR"/deployments/*.yaml)

    for file in "${deployment_files[@]}"; do
        if [ -f "$file" ]; then
            if grep -q "resources:" "$file"; then
                if grep -q "limits:" "$file" && grep -q "requests:" "$file"; then
                    log_success "Resource limits OK: $(basename "$file")"
                else
                    log_warning "Incomplete resource limits: $(basename "$file")"
                fi
            else
                log_warning "No resource limits: $(basename "$file")"
            fi
        fi
    done
}

check_health_probes() {
    log_info "Checking health probes..."

    local deployment_files=("$SCRIPT_DIR"/deployments/*.yaml)

    for file in "${deployment_files[@]}"; do
        if [ -f "$file" ]; then
            local has_liveness=$(grep -c "livenessProbe:" "$file" || true)
            local has_readiness=$(grep -c "readinessProbe:" "$file" || true)

            if [ "$has_liveness" -gt 0 ] && [ "$has_readiness" -gt 0 ]; then
                log_success "Health probes OK: $(basename "$file")"
            else
                log_warning "Missing health probes: $(basename "$file")"
            fi
        fi
    done
}

main() {
    log_info "========================================="
    log_info "Kubernetes Configuration Verification"
    log_info "========================================="
    echo ""

    check_required_files
    echo ""

    log_info "Validating YAML syntax..."
    for file in "$SCRIPT_DIR"/**/*.yaml; do
        if [ -f "$file" ]; then
            check_yaml_syntax "$file"
        fi
    done
    echo ""

    check_secrets_updated
    echo ""

    check_resource_limits
    echo ""

    check_health_probes
    echo ""

    log_info "========================================="
    log_info "Verification Complete"
    log_info "========================================="
    echo ""

    if [ $ERRORS -gt 0 ]; then
        log_error "Found $ERRORS error(s)"
    else
        log_success "No errors found"
    fi

    if [ $WARNINGS -gt 0 ]; then
        log_warning "Found $WARNINGS warning(s)"
    else
        log_success "No warnings"
    fi

    echo ""

    if [ $ERRORS -gt 0 ]; then
        log_error "Configuration validation FAILED"
        exit 1
    else
        log_success "Configuration validation PASSED"
        exit 0
    fi
}

main
