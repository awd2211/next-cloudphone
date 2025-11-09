/**
 * 无障碍迁移示例
 *
 * 展示如何将现有组件迁移到无障碍版本
 */

import { useState } from 'react';
import { Form, Input, Space, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import {
  AccessibleTable,
  AccessibleModal,
  AccessibleButton,
  VisuallyHidden,
} from '@/components/Accessible';
import type { ColumnsType } from 'antd/es/table';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

/**
 * ❌ 迁移前：缺少无障碍支持
 */
export const BeforeMigration = () => {
  const [visible, setVisible] = useState(false);
  const [users] = useState<User[]>([
    { id: '1', name: '张三', email: 'zhang@example.com', role: 'admin', status: 'active' },
    { id: '2', name: '李四', email: 'li@example.com', role: 'user', status: 'inactive' },
  ]);

  const columns: ColumnsType<User> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        // ❌ 问题：只用颜色区分状态
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        // ❌ 问题：只用颜色传达信息
        <span style={{ color: status === 'active' ? 'green' : 'red' }}>
          {status === 'active' ? '激活' : '未激活'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space>
          {/* ❌ 问题：图标按钮没有 aria-label */}
          <button>
            <EyeOutlined />
          </button>
          <button>
            <EditOutlined />
          </button>
          <button>
            <DeleteOutlined />
          </button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ❌ 问题：Table 缺少 aria-label */}
      <table>
        {/* ... */}
      </table>

      {/* ❌ 问题：Modal 没有焦点管理 */}
      <div className="modal" style={{ display: visible ? 'block' : 'none' }}>
        <h2>编辑用户</h2>
        {/* ❌ 问题：表单字段只有 placeholder */}
        <input placeholder="请输入姓名" />
        <input placeholder="请输入邮箱" />
      </div>
    </div>
  );
};

/**
 * ✅ 迁移后：完整的无障碍支持
 */
export const AfterMigration = () => {
  const [visible, setVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users] = useState<User[]>([
    { id: '1', name: '张三', email: 'zhang@example.com', role: 'admin', status: 'active' },
    { id: '2', name: '李四', email: 'li@example.com', role: 'user', status: 'inactive' },
  ]);
  const [form] = Form.useForm();

  const columns: ColumnsType<User> = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        // ✅ 改进：使用 ARIA 标签补充颜色信息
        <Tag
          color={role === 'admin' ? 'red' : 'blue'}
          aria-label={`角色：${role === 'admin' ? '管理员' : '普通用户'}`}
        >
          {role === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const isActive = status === 'active';
        return (
          // ✅ 改进：添加屏幕阅读器文本
          <span>
            <VisuallyHidden>
              {isActive ? '状态：激活' : '状态：未激活'}
            </VisuallyHidden>
            <span
              aria-hidden="true"
              style={{ color: isActive ? 'green' : 'red' }}
            >
              {isActive ? '●' : '○'} {isActive ? '激活' : '未激活'}
            </span>
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: User) => (
        <Space>
          {/* ✅ 改进：使用 AccessibleButton，提供清晰的标签 */}
          <AccessibleButton
            type="link"
            icon={<EyeOutlined />}
            ariaLabel={`查看 ${record.name} 的详情`}
            onClick={() => console.log('查看', record)}
          />
          <AccessibleButton
            type="link"
            icon={<EditOutlined />}
            ariaLabel={`编辑 ${record.name} 的信息`}
            onClick={() => {
              setSelectedUser(record);
              form.setFieldsValue(record);
              setVisible(true);
            }}
          />
          <AccessibleButton
            type="link"
            danger
            icon={<DeleteOutlined />}
            ariaLabel={`删除用户 ${record.name}`}
            ariaDescription="此操作不可恢复"
            onClick={() => console.log('删除', record)}
          />
        </Space>
      ),
    },
  ];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('提交', values);
      setVisible(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('验证失败', error);
    }
  };

  return (
    <div>
      {/* ✅ 改进：使用 AccessibleTable，提供 ARIA 支持 */}
      <AccessibleTable<User>
        ariaLabel="用户列表"
        columns={columns}
        dataSource={users}
        loading={false}
        loadingText="正在加载用户列表"
        emptyText="暂无用户数据"
        showRowNumber  // 显示行号
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* ✅ 改进：使用 AccessibleModal，自动管理焦点 */}
      <AccessibleModal
        open={visible}
        title={selectedUser ? `编辑用户 - ${selectedUser.name}` : '编辑用户'}
        description="修改用户的基本信息，包括姓名和邮箱地址"
        onClose={() => {
          setVisible(false);
          setSelectedUser(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        onCancel={() => {
          setVisible(false);
          setSelectedUser(null);
          form.resetFields();
        }}
        trapFocus  // 启用焦点捕获
      >
        {/* ✅ 改进：使用 Form.Item 提供正确的标签 */}
        <Form form={form} layout="vertical">
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <select aria-label="用户角色">
              <option value="">请选择</option>
              <option value="admin">管理员</option>
              <option value="user">普通用户</option>
            </select>
          </Form.Item>
        </Form>
      </AccessibleModal>
    </div>
  );
};

/**
 * 对比总结
 *
 * 迁移前的问题：
 * ❌ 表格没有 aria-label，屏幕阅读器无法理解表格内容
 * ❌ 图标按钮没有文字标签，屏幕阅读器无法识别
 * ❌ 只用颜色传达状态信息，色盲用户无法区分
 * ❌ 表单字段只有 placeholder，没有正确的 label
 * ❌ 模态框没有焦点管理，键盘用户无法正常导航
 * ❌ 缺少加载和空状态的屏幕阅读器提示
 *
 * 迁移后的改进：
 * ✅ 表格有清晰的 aria-label，描述表格内容
 * ✅ 所有图标按钮都有具体的 aria-label
 * ✅ 状态信息除了颜色外，还有屏幕阅读器文本
 * ✅ 表单字段使用 Form.Item 提供正确的 label
 * ✅ 模态框自动管理焦点，支持 Escape 键关闭
 * ✅ 加载和空状态有 aria-live 通知
 * ✅ 支持完整的键盘导航
 * ✅ 符合 WCAG 2.1 AA 标准
 */
