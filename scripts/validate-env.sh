#!/bin/bash

# 环境变量验证脚本
# 用于在服务启动前检查必需的环境变量是否已设置

set -e

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_NC='\033[0m' # No Color

# 打印函数
print_error() {
    echo -e "${COLOR_RED}[ERROR]${COLOR_NC} $1"
}

print_success() {
    echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_NC} $1"
}

print_warning() {
    echo -e "${COLOR_YELLOW}[WARNING]${COLOR_NC} $1"
}

print_info() {
    echo -e "[INFO] $1"
}

# 验证单个环境变量
validate_var() {
    local var_name=$1
    local var_value=${!var_name}
    local is_required=${2:-true}
    
    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            print_error "Required environment variable '$var_name' is not set"
            return 1
        else
            print_warning "Optional environment variable '$var_name' is not set"
            return 0
        fi
    else
        print_success "✓ $var_name"
        return 0
    fi
}

# 验证 NestJS 服务的通用环境变量
validate_nestjs_service() {
    local service_name=$1
    print_info "Validating $service_name environment variables..."
    
    local errors=0
    
    # 必需变量
    validate_var "NODE_ENV" || ((errors++))
    validate_var "PORT" || ((errors++))
    validate_var "DB_HOST" || ((errors++))
    validate_var "DB_PORT" || ((errors++))
    validate_var "DB_USERNAME" || ((errors++))
    validate_var "DB_PASSWORD" || ((errors++))
    validate_var "DB_DATABASE" || ((errors++))
    validate_var "JWT_SECRET" || ((errors++))
    
    # 可选变量
    validate_var "REDIS_HOST" false
    validate_var "LOG_LEVEL" false
    
    if [ $errors -gt 0 ]; then
        print_error "$service_name validation failed with $errors error(s)"
        return 1
    else
        print_success "$service_name validation passed"
        return 0
    fi
}

# 验证 JWT_SECRET 强度
validate_jwt_secret() {
    local secret=$1
    
    if [ ${#secret} -lt 32 ]; then
        print_warning "JWT_SECRET is too short (< 32 characters). Recommended: 64+ characters"
    fi
    
    if [ "$secret" = "your-secret-key-change-in-production" ]; then
        print_error "JWT_SECRET is still using default value. Please change it!"
        return 1
    fi
    
    if [ "$NODE_ENV" = "production" ] && [[ "$secret" == *"dev"* ]]; then
        print_error "JWT_SECRET contains 'dev' in production environment"
        return 1
    fi
    
    return 0
}

# 主函数
main() {
    local service_type=${1:-"nestjs"}
    
    echo "========================================"
    echo "  Environment Variables Validation"
    echo "========================================"
    echo ""
    
    case $service_type in
        "api-gateway"|"user-service"|"device-service"|"app-service"|"billing-service")
            validate_nestjs_service "$service_type"
            ;;
        "scheduler-service")
            print_info "Validating scheduler-service environment variables..."
            validate_var "ENVIRONMENT" || exit 1
            validate_var "PORT" || exit 1
            validate_var "DB_HOST" || exit 1
            print_success "scheduler-service validation passed"
            ;;
        *)
            print_info "No specific validation for service type: $service_type"
            print_info "Performing basic validation..."
            validate_var "NODE_ENV" true || exit 1
            validate_var "PORT" true || exit 1
            ;;
    esac
    
    # 验证 JWT_SECRET
    if [ -n "$JWT_SECRET" ]; then
        validate_jwt_secret "$JWT_SECRET" || exit 1
    fi
    
    echo ""
    print_success "All validations passed!"
    echo ""
}

# 执行主函数
main "$@"
