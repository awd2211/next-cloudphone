#!/bin/bash

# ============================================================================
# 权限命名格式自动迁移脚本
# Automated Permission Naming Convention Migration Script
# ============================================================================
#
# 功能: 自动将代码中的权限引用从冒号格式迁移到点号格式
# 用法:
#   ./scripts/migrate-permissions.sh              # 执行迁移
#   ./scripts/migrate-permissions.sh --dry-run    # 预览更改（不实际修改文件）
#   ./scripts/migrate-permissions.sh --verify     # 验证迁移结果
# ============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/home/eric/next-cloudphone"
cd "$PROJECT_ROOT"

# 命令行参数
DRY_RUN=false
VERIFY=false

if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}🔍 DRY RUN 模式 - 仅预览更改，不会修改文件${NC}"
elif [[ "$1" == "--verify" ]]; then
    VERIFY=true
    echo -e "${BLUE}✅ 验证模式 - 检查迁移结果${NC}"
fi

echo ""
echo "========================================"
echo "权限命名格式自动迁移"
echo "========================================"
echo ""

# ============================================================================
# 函数: 替换权限格式
# ============================================================================

replace_permission() {
    local file="$1"
    local old_pattern="$2"
    local new_pattern="$3"
    local description="$4"

    if [ "$DRY_RUN" = true ]; then
        # Dry run: 只显示将要更改的内容
        if grep -q "$old_pattern" "$file" 2>/dev/null; then
            echo -e "${YELLOW}  📝 $file${NC}"
            grep -n "$old_pattern" "$file" | head -5
            echo ""
        fi
    else
        # 实际替换
        if grep -q "$old_pattern" "$file" 2>/dev/null; then
            echo -e "${GREEN}  ✅ $description: $file${NC}"
            sed -i "s/$old_pattern/$new_pattern/g" "$file"
        fi
    fi
}

# ============================================================================
# 函数: 处理整个服务
# ============================================================================

migrate_service() {
    local service_name="$1"
    local service_path="backend/$service_name"

    echo -e "${BLUE}📦 处理服务: $service_name${NC}"
    echo ""

    if [ ! -d "$service_path" ]; then
        echo -e "${RED}  ❌ 服务目录不存在: $service_path${NC}"
        echo ""
        return
    fi

    shift  # 移除第一个参数（service_name）

    # 遍历所有权限替换规则
    while [ $# -gt 0 ]; do
        local old_perm="$1"
        local new_perm="$2"
        shift 2

        # 查找并替换 TypeScript 文件
        find "$service_path/src" -type f -name "*.ts" | while read -r file; do
            # 单引号版本
            replace_permission "$file" "'$old_perm'" "'$new_perm'" "$old_perm → $new_perm"
            # 双引号版本
            replace_permission "$file" "\"$old_perm\"" "\"$new_perm\"" "$old_perm → $new_perm"
        done
    done

    echo ""
}

# ============================================================================
# 验证模式
# ============================================================================

if [ "$VERIFY" = true ]; then
    echo -e "${BLUE}🔍 验证迁移结果...${NC}"
    echo ""

    FOUND_OLD_FORMAT=false

    # 查找所有仍使用冒号格式的权限
    echo "扫描残留的冒号格式权限..."
    echo ""

    for service in billing-service sms-receive-service proxy-service; do
        if [ -d "backend/$service" ]; then
            echo -e "${YELLOW}检查 $service:${NC}"
            count=$(grep -r "@RequirePermission('[^'\":]*:[^']*')" "backend/$service/src" --include="*.ts" | wc -l || true)
            if [ "$count" -gt 0 ]; then
                echo -e "${RED}  ❌ 发现 $count 处旧格式${NC}"
                grep -r "@RequirePermission('[^'\":]*:[^']*')" "backend/$service/src" --include="*.ts" | head -5
                FOUND_OLD_FORMAT=true
            else
                echo -e "${GREEN}  ✅ 无旧格式权限${NC}"
            fi
            echo ""
        fi
    done

    if [ "$FOUND_OLD_FORMAT" = false ]; then
        echo -e "${GREEN}✅ 验证通过！所有权限已迁移到点号格式${NC}"
        exit 0
    else
        echo -e "${RED}⚠️  仍有权限使用旧格式，请继续迁移${NC}"
        exit 1
    fi
fi

# ============================================================================
# 迁移 Billing Service
# ============================================================================

migrate_service "billing-service" \
    "billing:read" "billing.read" \
    "billing:create" "billing.create" \
    "billing:update" "billing.update" \
    "billing:delete" "billing.delete"

# ============================================================================
# 迁移 SMS Receive Service
# ============================================================================

migrate_service "sms-receive-service" \
    "sms:verification-code:read" "sms.verification-code.read" \
    "sms:verification-code:validate" "sms.verification-code.validate" \
    "sms:verification-code:consume" "sms.verification-code.consume" \
    "sms:statistics:view" "sms.statistics.view"

# ============================================================================
# 迁移 Proxy Service
# ============================================================================

migrate_service "proxy-service" \
    "proxy:report:create" "proxy.report.create" \
    "proxy:report:read" "proxy.report.read" \
    "proxy:report:delete" "proxy.report.delete" \
    "proxy:report:export" "proxy.report.export" \
    "proxy:report:schedule:create" "proxy.report.schedule.create" \
    "proxy:report:schedule:read" "proxy.report.schedule.read" \
    "proxy:report:schedule:update" "proxy.report.schedule.update" \
    "proxy:report:schedule:delete" "proxy.report.schedule.delete" \
    "proxy:report:schedule:execute" "proxy.report.schedule.execute" \
    "proxy:report:stats" "proxy.report.stats" \
    "proxy:report:download" "proxy.report.download" \
    "proxy:session:create" "proxy.session.create" \
    "proxy:session:renew" "proxy.session.renew" \
    "proxy:session:delete" "proxy.session.delete" \
    "proxy:session:read" "proxy.session.read" \
    "proxy:session:stats" "proxy.session.stats" \
    "proxy:provider:read" "proxy.provider.read" \
    "proxy:provider:compare" "proxy.provider.compare" \
    "proxy:provider:admin" "proxy.provider.admin" \
    "proxy:provider:stats" "proxy.provider.stats" \
    "proxy:recommend" "proxy.recommend" \
    "proxy:read" "proxy.read" \
    "proxy:stats" "proxy.stats" \
    "proxy:admin" "proxy.admin" \
    "proxy:config" "proxy.config" \
    "proxy:failover" "proxy.failover" \
    "proxy:geo:configure" "proxy.geo.configure" \
    "proxy:geo:read" "proxy.geo.read" \
    "proxy:geo:match" "proxy.geo.match" \
    "proxy:geo:recommend" "proxy.geo.recommend" \
    "proxy:geo:stats" "proxy.geo.stats" \
    "proxy:device-group:create" "proxy.device-group.create" \
    "proxy:device-group:read" "proxy.device-group.read" \
    "proxy:device-group:update" "proxy.device-group.update" \
    "proxy:device-group:delete" "proxy.device-group.delete" \
    "proxy:device-group:manage-devices" "proxy.device-group.manage-devices"

# ============================================================================
# 完成
# ============================================================================

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}========================================"
    echo "DRY RUN 完成"
    echo "========================================${NC}"
    echo ""
    echo "如果以上更改看起来正确，请运行:"
    echo -e "${GREEN}  ./scripts/migrate-permissions.sh${NC}"
    echo ""
    echo "来执行实际的文件修改。"
    echo ""
else
    echo ""
    echo -e "${GREEN}========================================"
    echo "迁移完成！"
    echo "========================================${NC}"
    echo ""
    echo "📝 后续步骤:"
    echo ""
    echo "1. 验证迁移结果:"
    echo -e "${BLUE}   ./scripts/migrate-permissions.sh --verify${NC}"
    echo ""
    echo "2. 查看更改:"
    echo -e "${BLUE}   git diff${NC}"
    echo ""
    echo "3. 编译服务 (确保无语法错误):"
    echo -e "${BLUE}   cd backend/billing-service && pnpm build${NC}"
    echo -e "${BLUE}   cd backend/sms-receive-service && pnpm build${NC}"
    echo -e "${BLUE}   cd backend/proxy-service && pnpm build${NC}"
    echo ""
    echo "4. 重启服务:"
    echo -e "${BLUE}   pm2 restart billing-service${NC}"
    echo -e "${BLUE}   pm2 restart sms-receive-service${NC}"
    echo -e "${BLUE}   pm2 restart proxy-service${NC}"
    echo ""
    echo "5. 检查日志:"
    echo -e "${BLUE}   pm2 logs billing-service --lines 50${NC}"
    echo ""
    echo "6. 提交更改:"
    echo -e "${BLUE}   git add .${NC}"
    echo -e "${BLUE}   git commit -m \"refactor: migrate permissions to dot notation\"${NC}"
    echo ""
fi
