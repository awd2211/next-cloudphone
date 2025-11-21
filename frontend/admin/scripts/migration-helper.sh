#!/bin/bash

# React Query 迁移辅助脚本
# 用途：帮助分析和跟踪迁移进度

set -e

HOOKS_DIR="src/hooks"
QUERIES_DIR="src/hooks/queries"
PAGES_DIR="src/pages"
COMPONENTS_DIR="src/components"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   React Query 迁移辅助工具${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 功能1: 查找使用某个 hook 的所有文件
find_hook_usage() {
    local hook_name=$1
    echo -e "${YELLOW}🔍 搜索 ${hook_name} 的使用情况...${NC}"
    echo ""

    local count=$(grep -r "from.*['\"].*/${hook_name}['\"]" $PAGES_DIR $COMPONENTS_DIR --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)

    if [ $count -eq 0 ]; then
        echo -e "${GREEN}✅ 未找到使用 ${hook_name} 的文件，可以安全删除！${NC}"
    else
        echo -e "${RED}⚠️  找到 ${count} 个文件使用了 ${hook_name}:${NC}"
        echo ""
        grep -r "from.*['\"].*/${hook_name}['\"]" $PAGES_DIR $COMPONENTS_DIR --include="*.tsx" --include="*.ts" 2>/dev/null | sed 's/:.*$//' | sort -u | while read file; do
            echo -e "  📄 $file"
        done
    fi
    echo ""
}

# 功能2: 列出所有待迁移的 hooks
list_pending_hooks() {
    echo -e "${YELLOW}📋 待迁移的 Hooks:${NC}"
    echo ""

    local count=0
    for file in $HOOKS_DIR/*.ts; do
        if [ -f "$file" ] && [ "$(basename $file)" != "index.ts" ]; then
            local hook_name=$(basename $file .ts)
            # 跳过工具类 hooks
            if [[ ! $hook_name =~ ^(useDebounce|useLocalStorage|usePagination|useErrorHandler|useFilterState|usePermission)$ ]]; then
                count=$((count + 1))
                echo -e "  ${count}. ${hook_name}"
            fi
        fi
    done
    echo ""
    echo -e "${BLUE}总计: ${count} 个 hooks 待迁移${NC}"
    echo ""
}

# 功能3: 检查迁移进度
check_progress() {
    echo -e "${YELLOW}📊 迁移进度统计:${NC}"
    echo ""

    local old_count=$(find $HOOKS_DIR -maxdepth 1 -name "use*.ts" -type f ! -name "index.ts" | wc -l)
    local new_count=$(find $QUERIES_DIR -name "*.ts" -type f ! -name "index.ts" 2>/dev/null | wc -l)
    local total=$((old_count + new_count))
    local progress=$((new_count * 100 / total))

    echo -e "  旧架构 Hooks: ${RED}${old_count}${NC}"
    echo -e "  新架构 Hooks: ${GREEN}${new_count}${NC}"
    echo -e "  总计: ${total}"
    echo -e "  迁移进度: ${BLUE}${progress}%${NC}"
    echo ""

    # 进度条
    local bar_length=40
    local filled=$((progress * bar_length / 100))
    local empty=$((bar_length - filled))

    echo -n "  ["
    for ((i=0; i<filled; i++)); do echo -n "█"; done
    for ((i=0; i<empty; i++)); do echo -n "░"; done
    echo "]"
    echo ""
}

# 功能4: 创建迁移模板
create_migration_template() {
    local hook_name=$1
    local output_file="$QUERIES_DIR/${hook_name}.ts"

    if [ -f "$output_file" ]; then
        echo -e "${RED}❌ 文件已存在: $output_file${NC}"
        return 1
    fi

    # 提取服务名（去掉 use 前缀，转换为小写）
    local service_name=$(echo $hook_name | sed 's/^use//' | awk '{print tolower($0)}')

    cat > "$output_file" << EOF
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${service_name}Service } from '@/services/${service_name}';
import type { ${service_name^}, ${service_name^}Filters } from '@/types';

/**
 * 获取${service_name}列表
 * @param filters - 过滤条件
 */
export function ${hook_name}List(filters?: ${service_name^}Filters) {
  return useQuery({
    queryKey: ['${service_name}', 'list', filters],
    queryFn: () => ${service_name}Service.list(filters),
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}

/**
 * 获取单个${service_name}
 * @param id - ID
 */
export function ${hook_name}(id: string) {
  return useQuery({
    queryKey: ['${service_name}', 'detail', id],
    queryFn: () => ${service_name}Service.get(id),
    enabled: !!id,
  });
}

/**
 * 创建${service_name}
 */
export function useCreate${service_name^}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ${service_name}Service.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${service_name}', 'list'] });
    },
  });
}

/**
 * 更新${service_name}
 */
export function useUpdate${service_name^}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<${service_name^}> }) =>
      ${service_name}Service.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['${service_name}', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['${service_name}', 'list'] });
    },
  });
}

/**
 * 删除${service_name}
 */
export function useDelete${service_name^}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ${service_name}Service.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${service_name}'] });
    },
  });
}
EOF

    echo -e "${GREEN}✅ 已创建迁移模板: $output_file${NC}"
    echo -e "${YELLOW}⚠️  请根据实际需求修改模板内容${NC}"
}

# 功能5: 比较新旧 hook 的差异
compare_hooks() {
    local hook_name=$1
    local old_file="$HOOKS_DIR/${hook_name}.ts"
    local new_file="$QUERIES_DIR/${hook_name}.ts"

    if [ ! -f "$old_file" ]; then
        echo -e "${RED}❌ 旧文件不存在: $old_file${NC}"
        return 1
    fi

    if [ ! -f "$new_file" ]; then
        echo -e "${YELLOW}⚠️  新文件不存在: $new_file${NC}"
        return 1
    fi

    echo -e "${YELLOW}📊 对比 ${hook_name}:${NC}"
    echo ""

    local old_lines=$(wc -l < "$old_file")
    local new_lines=$(wc -l < "$new_file")
    local diff=$((old_lines - new_lines))
    local percent=$((diff * 100 / old_lines))

    echo -e "  旧文件行数: ${RED}${old_lines}${NC}"
    echo -e "  新文件行数: ${GREEN}${new_lines}${NC}"
    echo -e "  减少: ${BLUE}${diff} 行 (${percent}%)${NC}"
    echo ""
}

# 主菜单
show_menu() {
    echo -e "${BLUE}请选择操作:${NC}"
    echo "  1. 查看迁移进度"
    echo "  2. 列出待迁移的 hooks"
    echo "  3. 查找 hook 使用情况"
    echo "  4. 创建迁移模板"
    echo "  5. 比较新旧 hook"
    echo "  0. 退出"
    echo ""
    read -p "请输入选项 (0-5): " choice

    case $choice in
        1)
            check_progress
            ;;
        2)
            list_pending_hooks
            ;;
        3)
            read -p "请输入 hook 名称 (如 useDevices): " hook_name
            find_hook_usage "$hook_name"
            ;;
        4)
            read -p "请输入 hook 名称 (如 useDevices): " hook_name
            create_migration_template "$hook_name"
            ;;
        5)
            read -p "请输入 hook 名称 (如 useDevices): " hook_name
            compare_hooks "$hook_name"
            ;;
        0)
            echo -e "${GREEN}👋 再见！${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 无效选项${NC}"
            ;;
    esac

    echo ""
    read -p "按 Enter 继续..."
    clear
    show_menu
}

# 如果有参数，直接执行
if [ $# -gt 0 ]; then
    case $1 in
        --progress|-p)
            check_progress
            ;;
        --list|-l)
            list_pending_hooks
            ;;
        --find|-f)
            if [ -z "$2" ]; then
                echo -e "${RED}❌ 请提供 hook 名称${NC}"
                exit 1
            fi
            find_hook_usage "$2"
            ;;
        --create|-c)
            if [ -z "$2" ]; then
                echo -e "${RED}❌ 请提供 hook 名称${NC}"
                exit 1
            fi
            create_migration_template "$2"
            ;;
        --compare)
            if [ -z "$2" ]; then
                echo -e "${RED}❌ 请提供 hook 名称${NC}"
                exit 1
            fi
            compare_hooks "$2"
            ;;
        --help|-h)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  -p, --progress     查看迁移进度"
            echo "  -l, --list         列出待迁移的 hooks"
            echo "  -f, --find <name>  查找 hook 使用情况"
            echo "  -c, --create <name> 创建迁移模板"
            echo "  --compare <name>   比较新旧 hook"
            echo "  -h, --help         显示帮助"
            ;;
        *)
            echo -e "${RED}❌ 未知选项: $1${NC}"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
else
    # 交互式菜单
    clear
    show_menu
fi
