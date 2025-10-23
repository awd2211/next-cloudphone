#!/bin/bash

# E2E Tests Runner Script
# This script runs end-to-end integration tests for the Cloud Phone Platform

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create logs directory
mkdir -p "$LOG_DIR"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_service() {
    local service_name=$1
    local service_url=$2
    local max_retries=5
    local retry_count=0

    print_info "Checking $service_name at $service_url..."

    while [ $retry_count -lt $max_retries ]; do
        if curl -sf "$service_url/health" > /dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        fi
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $max_retries ]; then
            print_warning "$service_name not ready, retrying... ($retry_count/$max_retries)"
            sleep 2
        fi
    done

    print_error "$service_name is not healthy after $max_retries attempts"
    return 1
}

# Main execution
main() {
    print_header "Cloud Phone Platform - E2E Tests"

    # Parse command line arguments
    TEST_SUITE="all"
    SKIP_HEALTH_CHECK=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --suite)
                TEST_SUITE="$2"
                shift 2
                ;;
            --skip-health-check)
                SKIP_HEALTH_CHECK=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --suite <name>           Run specific test suite (user, device, billing, or all)"
                echo "  --skip-health-check      Skip service health checks"
                echo "  --help                   Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                       # Run all tests"
                echo "  $0 --suite user          # Run user authentication tests only"
                echo "  $0 --skip-health-check   # Skip health checks"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Check if we're in the right directory
    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        print_error "package.json not found. Please run this script from the e2e-tests directory."
        exit 1
    fi

    # Check if node_modules exists
    if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        cd "$SCRIPT_DIR"
        pnpm install
    fi

    # Health checks
    if [ "$SKIP_HEALTH_CHECK" = false ]; then
        print_header "Service Health Checks"

        SERVICES_HEALTHY=true

        check_service "User Service" "http://localhost:30001" || SERVICES_HEALTHY=false
        check_service "Device Service" "http://localhost:30002" || SERVICES_HEALTHY=false
        check_service "Billing Service" "http://localhost:30005" || SERVICES_HEALTHY=false

        if [ "$SERVICES_HEALTHY" = false ]; then
            print_error "One or more services are not healthy"
            print_info "Please ensure all services are running:"
            echo ""
            echo "  cd $PROJECT_ROOT"
            echo "  pnpm dev"
            echo ""
            print_info "Or start infrastructure services:"
            echo ""
            echo "  docker compose -f docker-compose.dev.yml up -d"
            echo ""
            exit 1
        fi

        print_success "All services are healthy"
        echo ""
    else
        print_warning "Skipping service health checks"
        echo ""
    fi

    # Run tests
    print_header "Running E2E Tests"

    cd "$SCRIPT_DIR"

    # Determine which tests to run
    case $TEST_SUITE in
        user)
            print_info "Running user authentication tests..."
            TEST_FILE="api/user-auth.e2e.spec.ts"
            ;;
        device)
            print_info "Running device lifecycle tests..."
            TEST_FILE="api/device-lifecycle.e2e.spec.ts"
            ;;
        billing)
            print_info "Running billing tests..."
            TEST_FILE="api/billing.e2e.spec.ts"
            ;;
        all)
            print_info "Running all E2E tests..."
            TEST_FILE=""
            ;;
        *)
            print_error "Unknown test suite: $TEST_SUITE"
            print_info "Valid options: user, device, billing, all"
            exit 1
            ;;
    esac

    # Run the tests
    LOG_FILE="$LOG_DIR/e2e-tests-$TIMESTAMP.log"

    if [ -n "$TEST_FILE" ]; then
        if pnpm test "$TEST_FILE" 2>&1 | tee "$LOG_FILE"; then
            print_success "Tests passed!"
        else
            print_error "Tests failed!"
            print_info "Log file: $LOG_FILE"
            exit 1
        fi
    else
        if pnpm test 2>&1 | tee "$LOG_FILE"; then
            print_success "All tests passed!"
        else
            print_error "Some tests failed!"
            print_info "Log file: $LOG_FILE"
            exit 1
        fi
    fi

    echo ""
    print_header "Test Summary"

    # Extract test summary from log
    if grep -q "Test Suites:" "$LOG_FILE"; then
        grep "Test Suites:" "$LOG_FILE" | tail -1
        grep "Tests:" "$LOG_FILE" | tail -1
        grep "Time:" "$LOG_FILE" | tail -1
    fi

    echo ""
    print_success "E2E tests completed successfully!"
    print_info "Full log: $LOG_FILE"
}

# Trap errors
trap 'print_error "An error occurred. Check the log file for details."; exit 1' ERR

# Run main function
main "$@"
