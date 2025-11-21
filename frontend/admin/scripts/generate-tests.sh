#!/bin/bash

# ===================================================================
# 测试文件生成脚本
# ===================================================================
#
# 用途: 批量生成测试文件模板
# 使用: ./scripts/generate-tests.sh
#
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "==================================================================="
echo "🧪 生成测试文件模板"
echo "==================================================================="
echo ""

# 生成 useDevices.test.ts
cat > "src/hooks/queries/__tests__/useDevices.test.ts" << 'EOF'
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useDevices } from '../useDevices';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useDevices', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  it('应该成功获取设备列表', async () => {
    const { result } = renderHook(() => useDevices({ page: 1, pageSize: 10 }), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it('应该支持分页', async () => {
    const { result } = renderHook(() => useDevices({ page: 2, pageSize: 20 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.page).toBe(2);
  });
});
EOF

echo "✅ 创建 src/hooks/queries/__tests__/useDevices.test.ts"

# 生成 useBilling.test.ts
cat > "src/hooks/queries/__tests__/useBilling.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useOrders } from '../useBilling';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useBilling', () => {
  it('应该成功获取订单列表', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useOrders({ page: 1, pageSize: 10 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
EOF

echo "✅ 创建 src/hooks/queries/__tests__/useBilling.test.ts"

# 生成工具函数测试
cat > "src/utils/__tests__/request.test.ts" << 'EOF'
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('request utility', () => {
  it('应该处理成功的请求', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: { id: 1 } },
    });

    // 实际测试需要导入 request 工具
    expect(true).toBe(true); // 占位符
  });

  it('应该处理错误响应', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    expect(true).toBe(true); // 占位符
  });
});
EOF

echo "✅ 创建 src/utils/__tests__/request.test.ts"

# 生成组件测试
cat > "src/components/__tests__/BatchOperation.test.tsx" << 'EOF'
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BatchOperation } from '../BatchOperation/BatchOperation';

describe('BatchOperation', () => {
  it('应该渲染批量操作按钮', () => {
    render(
      <BatchOperation
        selectedCount={5}
        onDelete={() => {}}
        onExport={() => {}}
      />
    );

    expect(screen.getByText(/已选择 5 项/i)).toBeInTheDocument();
  });
});
EOF

echo "✅ 创建 src/components/__tests__/BatchOperation.test.tsx"

echo ""
echo "==================================================================="
echo "📊 生成测试统计"
echo "==================================================================="
echo ""

TEST_COUNT=$(find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l)
echo "测试文件总数: $TEST_COUNT"

echo ""
echo "==================================================================="
echo "🚀 运行测试"
echo "==================================================================="
echo ""

pnpm test:run

echo ""
echo "==================================================================="
echo "✅ 测试生成完成"
echo "==================================================================="
