import { useState, useMemo, useCallback } from 'react';
import { Space, Button, Modal, Form, Input, Popconfirm, Select, Card, Row, Col, theme } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Permission } from '@/types';
import {
  usePermissions,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
} from '@/hooks/queries';

/**
 * 权限列表页面（优化版 - 使用 React Query + 分页）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 服务端分页，避免一次性加载所有权限
 * 3. ✅ 资源类型筛选
 * 4. ✅ 统一表格显示（替代分组显示）
 * 5. ✅ 使用 useMemo 优化重复计算
 * 6. ✅ 使用 useCallback 优化事件处理函数
 */
const PermissionList = () => {
  const { token } = theme.useToken();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();

  // ===== 分页和筛选状态 =====
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [resourceFilter, setResourceFilter] = useState<string>('');

  // ✅ 使用 React Query hooks 替换手动状态管理（支持分页）
  const { data, isLoading, refetch } = usePermissions({
    page,
    limit: pageSize,
    resource: resourceFilter || undefined,
  } as any);

  const permissions = data?.permissions || [];
  const total = data?.total || 0;

  // Mutations
  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();
  const deleteMutation = useDeletePermission();

  // ✅ 提取所有资源类型用于筛选器
  const resourceTypes = useMemo(() => {
    // 从所有权限中提取唯一的资源类型
    const types = new Set<string>();
    permissions.forEach((p) => {
      if (p.resource) {
        types.add(p.resource);
      }
    });
    return Array.from(types).sort();
  }, [permissions]);

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
      // ✅ 创建后回到第一页
      setPage(1);
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
      // ✅ 如果删除后当前页没有数据，回到上一页
      if (permissions.length === 1 && page > 1) {
        setPage(page - 1);
      }
    },
    [deleteMutation, permissions.length, page]
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

  // ✅ 分页变化处理
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  // ✅ 资源筛选变化处理
  const handleResourceFilterChange = useCallback((value: string) => {
    setResourceFilter(value);
    setPage(1); // 重置到第一页
  }, []);

  // 表格列定义
  const columns: ColumnsType<Permission> = useMemo(
    () => [
      {
        title: '权限名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        render: (text: string) => <code>{text}</code>,
      },
      {
        title: '资源类型',
        dataIndex: 'resource',
        key: 'resource',
        width: 150,
        render: (text: string) => <span style={{ color: token.colorPrimary }}>{text}</span>,
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 120,
        render: (text: string) => <span style={{ color: '#52c41a' }}>{text}</span>,
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (date: string) => new Date(date).toLocaleString('zh-CN'),
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
              title="确定删除此权限吗?"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
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
      <Card>
        <h2 style={{ marginBottom: 24 }}>权限管理</h2>

        {/* ✅ 工具栏：筛选 + 操作按钮 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space>
              <span>资源类型：</span>
              <Select
                style={{ width: 200 }}
                placeholder="全部资源"
                allowClear
                value={resourceFilter || undefined}
                onChange={handleResourceFilterChange}
              >
                {resourceTypes.map((type) => (
                  <Select.Option key={type} value={type}>
                    {type}
                  </Select.Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                刷新
              </Button>
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              创建权限
            </Button>
          </Col>
        </Row>

        {/* ✅ 统一表格（带分页） */}
        <AccessibleTable<Permission>
          ariaLabel="权限列表"
          loadingText="正在加载权限列表"
          emptyText="暂无权限数据，点击右上角创建权限"
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200, y: 600 }}
          virtual
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
          }}
        />
      </Card>

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
            <Input placeholder="例如：device, user, role" />
          </Form.Item>

          <Form.Item
            label="操作"
            name="action"
            rules={[{ required: true, message: '请输入操作名称' }]}
          >
            <Input placeholder="例如：create, read, update, delete" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="权限描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionList;
