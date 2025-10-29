# 新增页面快速启动指南

## 🚀 快速访问

### 设备模板管理
```bash
URL: http://localhost:5173/templates
功能: 创建、管理和使用设备模板
```

### 设备快照管理
```bash
URL: http://localhost:5173/snapshots
功能: 创建设备备份、恢复快照
```

---

## 📋 功能速览

### 设备模板 - 使用场景

**场景 1: 创建标准设备模板**
1. 访问 `/templates`
2. 点击"新建模板"
3. 填写配置（名称、Android 版本、CPU、内存、存储）
4. 选择公开/私有
5. 保存模板

**场景 2: 从模板快速创建设备**
1. 在模板列表中找到目标模板
2. 点击"创建设备"按钮
3. 选择分配给哪个用户
4. 可选：自定义设备名称
5. 确认创建

**场景 3: 批量创建相同配置的设备**
1. 点击模板的"批量创建"按钮
2. 输入创建数量（1-50）
3. 选择用户
4. 系统自动创建多个设备

### 设备快照 - 使用场景

**场景 1: 创建设备备份**
1. 访问 `/snapshots`
2. 点击"创建快照"
3. 选择要备份的设备
4. 输入快照名称和描述
5. 提交（后台异步创建）

**场景 2: 恢复设备到之前的状态**
1. 在快照列表找到目标快照
2. 点击"恢复"按钮
3. 确认恢复操作（会覆盖当前状态）
4. 等待恢复完成

**场景 3: 压缩快照节省空间**
1. 找到未压缩的快照
2. 点击"压缩"按钮
3. 系统后台压缩（减少存储占用）

---

## 🔧 开发者指南

### 如何添加新的前端页面

基于已完成的模板页面和快照页面，这里是标准流程：

#### 步骤 1: 添加类型定义

编辑 `frontend/admin/src/types/index.ts`:

```typescript
// 添加新的接口定义
export interface YourNewType {
  id: string;
  name: string;
  // ... 其他字段
  createdAt: string;
  updatedAt: string;
}

export interface CreateYourNewTypeDto {
  name: string;
  // ... 必填字段
}
```

#### 步骤 2: 创建 API 服务

创建 `frontend/admin/src/services/your-service.ts`:

```typescript
import request from '@/utils/request';
import type { YourNewType, PaginatedResponse } from '@/types';

export const getItems = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<YourNewType>>('/your-endpoint', { params });
};

export const createItem = (data: CreateYourNewTypeDto) => {
  return request.post<YourNewType>('/your-endpoint', data);
};

// ... 其他 CRUD 操作
```

#### 步骤 3: 创建页面组件

创建 `frontend/admin/src/pages/YourModule/List.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, message } from 'antd';
import { getItems, createItem } from '@/services/your-service';
import type { YourNewType } from '@/types';

const YourList = () => {
  const [items, setItems] = useState<YourNewType[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await getItems();
      setItems(res.data);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Table
        dataSource={items}
        loading={loading}
        // ... 配置列和其他属性
      />
    </div>
  );
};

export default YourList;
```

#### 步骤 4: 添加路由

编辑 `frontend/admin/src/router/index.tsx`:

```typescript
// 1. 添加懒加载
const YourList = lazy(() => import('@/pages/YourModule/List'));

// 2. 在路由配置中添加
{
  path: 'your-path',
  element: withSuspense(YourList),
}
```

#### 步骤 5: 添加菜单项（如需要）

编辑侧边栏菜单配置文件，添加导航项。

---

## 🎨 UI 组件参考

### 常用 Ant Design 组件

```typescript
import {
  Table,        // 表格
  Button,       // 按钮
  Modal,        // 模态框
  Form,         // 表单
  Input,        // 输入框
  Select,       // 选择器
  message,      // 消息提示
  Card,         // 卡片
  Statistic,    // 统计数值
  Tag,          // 标签
  Popconfirm,   // 气泡确认框
  Space,        // 间距
} from 'antd';
```

### 常用图标

```typescript
import {
  PlusOutlined,      // 添加
  EditOutlined,      // 编辑
  DeleteOutlined,    // 删除
  SearchOutlined,    // 搜索
  ReloadOutlined,    // 刷新
  DownloadOutlined,  // 下载
  UploadOutlined,    // 上传
} from '@ant-design/icons';
```

---

## 📊 数据流

```
用户操作 → 页面组件 → 服务层 → API 请求 → 后端
                ↓
           状态更新
                ↓
           UI 重新渲染
```

### 示例：创建新项目的数据流

```typescript
// 1. 用户点击"创建"按钮
<Button onClick={() => setModalVisible(true)}>创建</Button>

// 2. 用户填写表单并提交
const handleCreate = async (values) => {
  try {
    // 3. 调用服务层 API
    await createItem(values);

    // 4. 显示成功消息
    message.success('创建成功');

    // 5. 重新加载列表
    loadItems();

    // 6. 关闭模态框
    setModalVisible(false);
  } catch (error) {
    // 7. 错误处理
    message.error('创建失败');
  }
};
```

---

## 🐛 常见问题

### Q1: 页面无法访问？
**A**: 检查路由是否正确配置在 `router/index.tsx` 中

### Q2: API 请求失败？
**A**:
1. 检查后端服务是否运行
2. 检查 API 端点路径是否正确
3. 查看浏览器 Network 面板
4. 检查 CORS 配置

### Q3: TypeScript 类型错误？
**A**: 确保在 `types/index.ts` 中定义了所有接口

### Q4: 表格数据不显示？
**A**:
1. 检查 `dataSource` 是否正确
2. 确认 `rowKey` 属性已设置
3. 检查列定义的 `dataIndex`

### Q5: 模态框表单不提交？
**A**: 确保模态框的 `onOk` 调用了 `form.submit()`

---

## 💡 最佳实践

### 1. 错误处理

```typescript
try {
  const res = await someApiCall();
  // 成功处理
} catch (error: any) {
  message.error(error.message || '操作失败');
}
```

### 2. 加载状态

```typescript
const [loading, setLoading] = useState(false);

const loadData = async () => {
  setLoading(true);
  try {
    // API 调用
  } finally {
    setLoading(false); // 确保 loading 状态被重置
  }
};
```

### 3. 表单重置

```typescript
const [form] = Form.useForm();

// 关闭模态框时重置表单
const handleCancel = () => {
  setModalVisible(false);
  form.resetFields();
};
```

### 4. 确认对话框

```typescript
<Popconfirm
  title="确定要删除吗？"
  description="此操作不可撤销"
  onConfirm={() => handleDelete(record.id)}
>
  <Button danger>删除</Button>
</Popconfirm>
```

### 5. 分页配置

```typescript
<Table
  pagination={{
    current: page,
    pageSize: pageSize,
    total: total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total) => `共 ${total} 条`,
    onChange: (page, pageSize) => {
      setPage(page);
      setPageSize(pageSize);
    },
  }}
/>
```

---

## 📚 参考资源

- **Ant Design 文档**: https://ant.design/components/overview-cn/
- **React 文档**: https://react.dev/
- **TypeScript 文档**: https://www.typescriptlang.org/docs/
- **项目后端 API 文档**: http://localhost:30000/api/docs

---

## 🎓 学习路径

### 新手
1. 阅读已完成的模板页面代码
2. 理解组件结构和数据流
3. 尝试修改简单的 UI 元素

### 进阶
1. 创建新的简单页面（参考模板）
2. 添加复杂的交互逻辑
3. 优化性能和用户体验

### 高级
1. 实现复杂的业务逻辑
2. 添加实时功能（WebSocket）
3. 性能优化和代码重构

---

**文档版本**: v1.0
**最后更新**: 2025-10-29
