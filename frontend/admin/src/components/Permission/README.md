# 权限控制组件使用指南

本目录包含了用于前端权限控制的 Hook 和组件。

## 📦 组件列表

### 1. usePermission Hook

权限检查的核心 Hook，提供各种权限判断方法。

### 2. PermissionButton

带权限控制的按钮组件，自动根据权限显示/隐藏或启用/禁用。

### 3. PermissionWrapper

权限包装组件，控制子组件的显示。

### 4. PermissionContainer

简化版的权限容器，只控制显示/隐藏。

---

## 🎯 使用示例

### 1. usePermission Hook

```tsx
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isSuperAdmin,
    getDataScope,
  } = usePermission();

  // 检查单个权限
  if (hasPermission('device:create')) {
    console.log('可以创建设备');
  }

  // 检查多个权限（满足任意一个）
  if (hasAnyPermission(['device:create', 'device:update'])) {
    console.log('可以创建或更新设备');
  }

  // 检查多个权限（必须全部满足）
  if (hasAllPermissions(['device:create', 'device:update'])) {
    console.log('可以创建和更新设备');
  }

  // 检查角色
  if (hasRole('admin')) {
    console.log('是管理员');
  }

  // 检查是否是超级管理员
  if (isSuperAdmin) {
    console.log('是超级管理员');
  }

  // 获取数据范围
  const deviceScope = getDataScope('device');
  console.log('设备数据范围:', deviceScope?.scopeType); // 'all', 'tenant', 'self' 等
}
```

### 2. PermissionButton 组件

```tsx
import { PermissionButton } from '@/components/Permission';

function DeviceList() {
  return (
    <div>
      {/* 基本使用 - 单个权限 */}
      <PermissionButton
        permission="device:create"
        type="primary"
        onClick={handleCreate}
      >
        创建设备
      </PermissionButton>

      {/* 多个权限（满足任意一个） */}
      <PermissionButton
        permissions={['device:update', 'device:delete']}
        onClick={handleEdit}
      >
        编辑
      </PermissionButton>

      {/* 多个权限（必须全部满足） */}
      <PermissionButton
        permissions={['device:update', 'device:snapshot:create']}
        requireAll
        onClick={handleSnapshot}
      >
        创建快照
      </PermissionButton>

      {/* 没有权限时禁用而不是隐藏 */}
      <PermissionButton
        permission="device:delete"
        hideWhenNoPermission={false}
        disableWhenNoPermission
        danger
        onClick={handleDelete}
      >
        删除
      </PermissionButton>

      {/* 自定义无权限提示 */}
      <PermissionButton
        permission="device:export"
        hideWhenNoPermission={false}
        noPermissionTooltip="您需要导出权限才能使用此功能"
      >
        导出数据
      </PermissionButton>
    </div>
  );
}
```

### 3. PermissionWrapper 组件

```tsx
import { PermissionWrapper } from '@/components/Permission';

function DeviceDetail() {
  return (
    <div>
      {/* 基本使用 */}
      <PermissionWrapper permission="device:update">
        <Button>编辑设备</Button>
      </PermissionWrapper>

      {/* 多个权限 */}
      <PermissionWrapper permissions={['device:create', 'device:update']}>
        <DeviceForm />
      </PermissionWrapper>

      {/* 必须满足所有权限 */}
      <PermissionWrapper
        permissions={['device:update', 'device:snapshot:create']}
        requireAll
      >
        <SnapshotManager />
      </PermissionWrapper>

      {/* 角色控制 */}
      <PermissionWrapper roles={['admin', 'super_admin']}>
        <AdminPanel />
      </PermissionWrapper>

      {/* 自定义无权限提示 */}
      <PermissionWrapper
        permission="device:delete"
        fallback={<Alert message="您没有删除权限" type="warning" />}
      >
        <DeleteButton />
      </PermissionWrapper>

      {/* 完全隐藏 */}
      <PermissionWrapper permission="device:export" hideWhenNoPermission>
        <ExportButton />
      </PermissionWrapper>
    </div>
  );
}
```

### 4. PermissionContainer 组件

```tsx
import { PermissionContainer } from '@/components/Permission';

function DeviceActions() {
  return (
    <div>
      {/* 简单的显示/隐藏控制 */}
      <PermissionContainer permission="device:create">
        <Button type="primary">创建设备</Button>
      </PermissionContainer>

      <PermissionContainer permissions={['device:update', 'device:delete']}>
        <Space>
          <Button>编辑</Button>
          <Button danger>删除</Button>
        </Space>
      </PermissionContainer>
    </div>
  );
}
```

### 5. 装饰器模式

```tsx
import { withPermission, withRole } from '@/hooks/usePermission';

// 权限装饰器
const DeviceForm = () => {
  return <Form>...</Form>;
};

export default withPermission(['device:create', 'device:update'])(DeviceForm);

// 角色装饰器
const AdminPanel = () => {
  return <div>管理面板</div>;
};

export default withRole(['admin', 'super_admin'])(AdminPanel);
```

---

## 🎨 高级用法

### 1. 页面级权限控制

```tsx
// src/pages/DeviceManagement/index.tsx
import { PermissionWrapper } from '@/components/Permission';

export default function DeviceManagement() {
  return (
    <PermissionWrapper
      permissions={['device:read', 'device:list']}
      fallback={
        <Result
          status="403"
          title="无权限访问"
          subTitle="您需要设备管理权限才能访问此页面"
        />
      }
    >
      <DeviceList />
    </PermissionWrapper>
  );
}
```

### 2. 表格操作列权限控制

```tsx
import { PermissionContainer } from '@/components/Permission';

const columns = [
  // ... 其他列
  {
    title: '操作',
    key: 'action',
    render: (_, record) => (
      <Space>
        <PermissionContainer permission="device:update">
          <a onClick={() => handleEdit(record)}>编辑</a>
        </PermissionContainer>

        <PermissionContainer permission="device:delete">
          <a onClick={() => handleDelete(record)}>删除</a>
        </PermissionContainer>

        <PermissionContainer permissions={['device:snapshot:create']}>
          <a onClick={() => handleSnapshot(record)}>创建快照</a>
        </PermissionContainer>
      </Space>
    ),
  },
];
```

### 3. 根据数据范围过滤数据

```tsx
import { usePermission } from '@/hooks/usePermission';

function DeviceList() {
  const { getDataScope, isSuperAdmin } = usePermission();
  const deviceScope = getDataScope('device');

  // 根据数据范围构建查询参数
  const fetchDevices = async () => {
    const params: any = {
      page: 1,
      pageSize: 10,
    };

    // 根据不同的数据范围添加过滤条件
    switch (deviceScope?.scopeType) {
      case 'all':
        // 超级管理员或有全局权限，不需要过滤
        break;
      case 'tenant':
        // 租户范围，自动由后端根据用户租户过滤
        break;
      case 'self':
        // 只查询自己创建的设备
        params.userId = currentUser?.id;
        break;
      default:
        break;
    }

    return api.getDevices(params);
  };

  // ...
}
```

### 4. 动态菜单权限控制

```tsx
import { usePermission } from '@/hooks/usePermission';

function DynamicMenu() {
  const { hasPermission } = usePermission();

  const menuItems = [
    {
      key: 'devices',
      label: '设备管理',
      permission: 'device:read',
    },
    {
      key: 'users',
      label: '用户管理',
      permission: 'user:read',
    },
    {
      key: 'billing',
      label: '账单管理',
      permission: 'billing:read',
    },
  ].filter(item => hasPermission(item.permission));

  return <Menu items={menuItems} />;
}
```

---

## 🔐 权限命名规范

权限名称遵循以下格式：

```
resource:action  或  resource.action
```

**常见资源（resource）:**
- `device` - 设备
- `user` - 用户
- `app` - 应用
- `billing` - 账单
- `ticket` - 工单
- `notification` - 通知
- `proxy` - 代理

**常见操作（action）:**
- `create` - 创建
- `read` - 读取
- `update` - 更新
- `delete` - 删除
- `list` - 列表
- `control` - 控制
- `approve` - 审批

**示例:**
- `device:create` - 创建设备
- `user:read` - 查看用户
- `billing:delete` - 删除账单
- `app:approve` - 审批应用

---

## 🎯 数据范围类型

| 范围类型 | 说明 | 适用场景 |
|---------|------|---------|
| `all` | 全部数据 | 超级管理员、系统管理员 |
| `tenant` | 本租户数据 | 租户管理员、普通用户 |
| `department` | 本部门及子部门数据 | 部门管理员 |
| `department_only` | 仅本部门数据 | 部门主管 |
| `self` | 仅本人数据 | 普通用户、API用户 |
| `custom` | 自定义过滤 | 特殊业务场景 |

---

## ⚠️ 注意事项

1. **前后端权限一致性**: 前端权限控制仅用于UI展示，后端必须进行权限验证
2. **超级管理员**: `super_admin` 角色拥有所有权限，无需单独配置
3. **权限格式**: 支持 `device:create` 和 `device.create` 两种格式
4. **性能优化**: Hook 内部使用了 `useMemo` 优化性能
5. **数据范围**: 后端应根据用户的数据范围自动过滤数据

---

## 🐛 调试技巧

```tsx
import { usePermission } from '@/hooks/usePermission';

function DebugPermissions() {
  const { permissions, roles, getRoleNames } = usePermission();

  console.log('当前用户角色:', getRoleNames());
  console.log('当前用户权限:', Array.from(permissions));
  console.log('角色详情:', roles);

  return null;
}
```

---

## 📚 相关文档

- 角色配置: `src/constants/rolePermissions.ts`
- 后端权限验证: `backend/user-service/src/auth/`
- 数据库迁移: `database/migrations/20251124_update_new_roles_permissions.sql`
