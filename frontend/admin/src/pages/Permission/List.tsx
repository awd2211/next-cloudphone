import { useState, useMemo, useCallback } from 'react';
import { Table, Space, Button, Modal, Form, Input, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Permission } from '@/types';
import {
  usePermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from '@/hooks/useRoles';

/**
 * 权限列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算（分组显示）
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 权限列表缓存（5分钟）
 * 5. ✅ 按资源分组显示
 */
const PermissionList = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();

  // ✅ 使用 React Query hooks 替换手动状态管理
  const { data: permissions = [], isLoading } = usePermissions();

  // Mutations
  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();
  const deleteMutation = useDeletePermission();

  // ✅ useCallback 优化事件处理函数
  const handleSubmit = useCallback(
    async (values: { resource: string; action: string; description?: string }) => {
      if (editingPermission) {
        await updateMutation.mutateAsync({ id: editingPermission.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setModalVisible(false);
      setEditingPermission(null);
      form.resetFields();
    },
    [editingPermission, createMutation, updateMutation, form]
  );

  const handleEdit = useCallback(
    (permission: Permission) => {
      setEditingPermission(permission);
      form.setFieldsValue(permission);
      setModalVisible(true);
    },
    [form]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleCreate = useCallback(() => {
    setEditingPermission(null);
    form.resetFields();
    setModalVisible(true);
  }, [form]);

  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
    setEditingPermission(null);
    form.resetFields();
  }, [form]);

  // ✅ useMemo 优化按资源分组
  const groupedPermissions = useMemo(() => {
    return (Array.isArray(permissions) ? permissions : []).reduce(
      (acc, permission) => {
        const resource = permission.resource;
        if (!acc[resource]) {
          acc[resource] = [];
        }
        acc[resource].push(permission);
        return acc;
      },
      {} as Record<string, Permission[]>
    );
  }, [permissions]);

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<Permission> = useMemo(
    () => [
      {
        title: '资源',
        dataIndex: 'resource',
        key: 'resource',
        width: 200,
        sorter: (a, b) => a.resource.localeCompare(b.resource),
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 150,
        sorter: (a, b) => a.action.localeCompare(b.action),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '权限标识',
        key: 'identifier',
        render: (_, record) => `${record.resource}:${record.action}`,
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个权限吗?"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" icon={<DeleteOutlined />} danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete]
  );

  return (
    <div>
      <h2>权限管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建权限
        </Button>
      </div>

      {/* 按资源分组显示 */}
      {Object.keys(groupedPermissions)
        .sort()
        .map((resource) => (
          <div key={resource} style={{ marginBottom: 24 }}>
            <h3>
              {resource} ({groupedPermissions[resource].length} 个权限)
            </h3>
            <Table
              columns={columns}
              dataSource={groupedPermissions[resource]}
              rowKey="id"
              loading={isLoading}
              pagination={false}
              size="small"
            />
          </div>
        ))}

      {/* 创建/编辑权限对话框 */}
      <Modal
        title={editingPermission ? '编辑权限' : '创建权限'}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="资源"
            name="resource"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input placeholder="例如：users, devices, apps" />
          </Form.Item>

          <Form.Item
            label="操作"
            name="action"
            rules={[{ required: true, message: '请输入操作名称' }]}
          >
            <Input placeholder="例如：create, read, update, delete" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="权限描述" rows={3} />
          </Form.Item>

          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
              <strong>权限标识预览：</strong>
              <br />
              {form.getFieldValue('resource') || 'resource'}:
              {form.getFieldValue('action') || 'action'}
            </p>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionList;
