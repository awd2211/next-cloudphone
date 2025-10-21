# 前端集成指南

## 📋 概述

本指南介绍如何将新创建的前端页面集成到管理后台和用户端应用中。

---

## 🎨 新增页面清单

### 1. 通知中心
- **组件**: `src/components/NotificationCenter.tsx`
- **功能**: 实时通知、WebSocket 连接、未读标记
- **依赖**: socket.io-client 4.8.1

### 2. 配额管理
- **页面**: `src/pages/Quota/QuotaList.tsx`
- **功能**: 配额列表、使用率图表、编辑配额
- **图表**: ECharts 饼图

### 3. 数据分析仪表板
- **页面**: `src/pages/Analytics/Dashboard.tsx`
- **功能**: 统计卡片、费用趋势、工单统计、资源使用
- **图表**: ECharts 折线图、饼图、柱状图

### 4. 余额与账单
- **页面**:
  - `src/pages/Billing/BalanceOverview.tsx` - 余额概览
  - `src/pages/Billing/TransactionHistory.tsx` - 交易记录
  - `src/pages/Billing/InvoiceList.tsx` - 账单管理
- **功能**: 余额统计、交易过滤、账单详情、导出功能
- **图表**: ECharts 折线图、柱状图、饼图

### 5. 工单系统
- **页面**:
  - `src/pages/Ticket/TicketList.tsx` - 工单列表
  - `src/pages/Ticket/TicketDetail.tsx` - 工单详情
- **功能**: 工单管理、回复功能、状态更新、内部备注

### 6. 审计日志
- **页面**: `src/pages/Audit/AuditLogList.tsx`
- **功能**: 操作日志、过滤搜索、导出日志

### 7. API 密钥管理
- **页面**: `src/pages/ApiKey/ApiKeyList.tsx`
- **功能**: 密钥创建、权限管理、使用统计、密钥删除

---

## 🔧 路由配置

### 添加到路由文件

编辑 `src/router/index.tsx` 或相应的路由配置文件：

```typescript
import { Routes, Route } from 'react-router-dom';

// 导入新页面
import NotificationCenter from '@/components/NotificationCenter';
import QuotaList from '@/pages/Quota/QuotaList';
import AnalyticsDashboard from '@/pages/Analytics/Dashboard';
import BalanceOverview from '@/pages/Billing/BalanceOverview';
import TransactionHistory from '@/pages/Billing/TransactionHistory';
import InvoiceList from '@/pages/Billing/InvoiceList';
import TicketList from '@/pages/Ticket/TicketList';
import TicketDetail from '@/pages/Ticket/TicketDetail';
import AuditLogList from '@/pages/Audit/AuditLogList';
import ApiKeyList from '@/pages/ApiKey/ApiKeyList';

// 路由配置
const routes = [
  {
    path: '/analytics',
    element: <AnalyticsDashboard />,
  },
  {
    path: '/quotas',
    element: <QuotaList />,
  },
  {
    path: '/billing/balance',
    element: <BalanceOverview />,
  },
  {
    path: '/billing/transactions',
    element: <TransactionHistory />,
  },
  {
    path: '/billing/invoices',
    element: <InvoiceList />,
  },
  {
    path: '/tickets',
    element: <TicketList />,
  },
  {
    path: '/tickets/:id',
    element: <TicketDetail />,
  },
  {
    path: '/audit-logs',
    element: <AuditLogList />,
  },
  {
    path: '/api-keys',
    element: <ApiKeyList />,
  },
];
```

---

## 📱 菜单配置

### 添加菜单项

编辑 `src/components/Layout/Sidebar.tsx` 或菜单配置文件：

```typescript
import {
  DashboardOutlined,
  TeamOutlined,
  MobileOutlined,
  BarChartOutlined,
  WalletOutlined,
  CustomerServiceOutlined,
  AuditOutlined,
  KeyOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const menuItems = [
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: '数据分析',
    path: '/analytics',
  },
  {
    key: 'quotas',
    icon: <DashboardOutlined />,
    label: '配额管理',
    path: '/quotas',
  },
  {
    key: 'billing',
    icon: <WalletOutlined />,
    label: '账单管理',
    children: [
      {
        key: 'billing-balance',
        label: '余额概览',
        path: '/billing/balance',
      },
      {
        key: 'billing-transactions',
        label: '交易记录',
        path: '/billing/transactions',
      },
      {
        key: 'billing-invoices',
        label: '账单列表',
        path: '/billing/invoices',
      },
    ],
  },
  {
    key: 'tickets',
    icon: <CustomerServiceOutlined />,
    label: '工单系统',
    path: '/tickets',
  },
  {
    key: 'audit',
    icon: <AuditOutlined />,
    label: '审计日志',
    path: '/audit-logs',
  },
  {
    key: 'apikeys',
    icon: <KeyOutlined />,
    label: 'API 密钥',
    path: '/api-keys',
  },
];
```

---

## 🔔 通知中心集成

### 添加到顶部导航栏

编辑 `src/components/Layout/Header.tsx`:

```typescript
import NotificationCenter from '@/components/NotificationCenter';

const Header: React.FC = () => {
  return (
    <div className="header">
      <div className="header-right">
        {/* 添加通知中心 */}
        <NotificationCenter />

        {/* 其他头部组件 */}
        <UserDropdown />
      </div>
    </div>
  );
};
```

---

## 🔌 WebSocket 连接配置

### 配置环境变量

创建或编辑 `.env` 文件：

```bash
# Notification Service WebSocket URL
VITE_NOTIFICATION_WS_URL=http://localhost:30006/notifications

# API Gateway URL
VITE_API_BASE_URL=http://localhost:30000/api
```

### 更新 notification.ts 服务

编辑 `src/services/notification.ts`，使用环境变量：

```typescript
const WEBSOCKET_URL = import.meta.env.VITE_NOTIFICATION_WS_URL || 'http://localhost:30006/notifications';
```

---

## 📊 图表主题配置（可选）

### 自定义 ECharts 主题

创建 `src/utils/echarts-theme.ts`:

```typescript
export const echartsTheme = {
  color: [
    '#5470c6',
    '#91cc75',
    '#fac858',
    '#ee6666',
    '#73c0de',
    '#3ba272',
    '#fc8452',
    '#9a60b4',
  ],
  backgroundColor: 'transparent',
  textStyle: {},
  title: {
    textStyle: {
      color: '#464646',
    },
  },
  legend: {
    textStyle: {
      color: '#333',
    },
  },
};
```

在页面中使用：

```typescript
import ReactECharts from 'echarts-for-react';
import { echartsTheme } from '@/utils/echarts-theme';

<ReactECharts
  option={getChartOption()}
  theme={echartsTheme}
  style={{ height: 350 }}
/>
```

---

## 🔗 API 服务集成

### 连接后端 API

编辑或创建对应的服务文件：

**示例: `src/services/quota.ts`**

```typescript
import request from '@/utils/request';

export interface Quota {
  id: string;
  userId: string;
  limits: {
    maxDevices: number;
    totalCpuCores: number;
    totalMemoryGB: number;
    totalStorageGB: number;
  };
  usage: {
    currentDevices: number;
    usedCpuCores: number;
    usedMemoryGB: number;
    usedStorageGB: number;
  };
}

// 获取配额列表
export const getQuotas = (params?: any) => {
  return request.get<Quota[]>('/quotas', { params });
};

// 更新配额
export const updateQuota = (id: string, data: any) => {
  return request.put(`/quotas/${id}`, data);
};
```

**示例: `src/services/billing.ts`**

```typescript
import request from '@/utils/request';

export interface Transaction {
  id: string;
  type: 'recharge' | 'consumption' | 'refund';
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

// 获取交易记录
export const getTransactions = (params?: any) => {
  return request.get<Transaction[]>('/billing/transactions', { params });
};

// 获取余额
export const getBalance = () => {
  return request.get('/billing/balance');
};
```

### 在页面中使用 API

```typescript
import { useEffect, useState } from 'react';
import { getQuotas } from '@/services/quota';

const QuotaList: React.FC = () => {
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuotas();
  }, []);

  const loadQuotas = async () => {
    setLoading(true);
    try {
      const response = await getQuotas();
      setQuotas(response.data);
    } catch (error) {
      console.error('Failed to load quotas:', error);
    } finally {
      setLoading(false);
    }
  };

  // ...
};
```

---

## 🎭 权限控制（可选）

### 添加页面权限

创建权限检查组件 `src/components/PermissionGuard.tsx`:

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: string[];
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermissions,
}) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = requiredPermissions.every(permission =>
    hasPermission(permission)
  );

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
```

在路由中使用：

```typescript
<Route
  path="/api-keys"
  element={
    <PermissionGuard requiredPermissions={['admin:apikeys']}>
      <ApiKeyList />
    </PermissionGuard>
  }
/>
```

---

## 🧪 测试集成

### 测试清单

- [ ] 通知中心 WebSocket 连接正常
- [ ] 所有页面路由可访问
- [ ] 菜单导航正确跳转
- [ ] 图表正常渲染
- [ ] API 调用返回数据
- [ ] 响应式布局适配
- [ ] 浏览器通知权限请求

### 测试命令

```bash
# 开发环境测试
pnpm dev

# 构建测试
pnpm build

# 预览构建结果
pnpm preview
```

---

## 🚀 部署前检查

### 环境变量配置

生产环境 `.env.production`:

```bash
VITE_NOTIFICATION_WS_URL=https://your-domain.com/notifications
VITE_API_BASE_URL=https://your-domain.com/api
```

### 构建优化

确保 `vite.config.ts` 配置正确：

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd'],
          'vendor-echarts': ['echarts', 'echarts-for-react'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
```

---

## 📝 后续步骤

1. **连接实际 API**: 将所有页面的模拟数据替换为实际 API 调用
2. **错误处理**: 添加统一的错误处理和用户反馈
3. **加载状态**: 改进 loading 状态的用户体验
4. **国际化**: 如需支持多语言，集成 i18n
5. **单元测试**: 为关键组件添加测试用例
6. **性能优化**: 使用 React.memo、useMemo 等优化性能

---

## 🆘 常见问题

### Q1: WebSocket 连接失败？
**A**: 检查 notification-service 是否启动，端口 30006 是否开放，CORS 配置是否正确。

### Q2: ECharts 图表不显示？
**A**: 确保 `echarts-for-react` 已安装，容器有明确的高度设置。

### Q3: 路由 404 错误？
**A**: 检查路由配置是否正确，组件导入路径是否正确。

### Q4: API 调用跨域错误？
**A**: 检查 API Gateway 的 CORS 配置，确保允许前端域名。

---

## 📚 相关文档

- [通知系统快速开始](./NOTIFICATION_SYSTEM_QUICKSTART.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [React Router 文档](https://reactrouter.com/)
- [Ant Design 文档](https://ant.design/)
- [ECharts 文档](https://echarts.apache.org/)

---

*文档版本: v1.0*
*最后更新: 2025-10-20*
