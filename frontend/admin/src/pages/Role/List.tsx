import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Space,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Transfer,
  Tag,
  Tree,
  Tabs,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import type { Role, Permission } from '@/types';
import dayjs from 'dayjs';
import {
  useRoles,
  usePermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useAssignPermissions,
} from '@/hooks/useRoles';

interface TransferItem {
  key: string;
  title: string;
  description?: string;
}

/**
 * 角色列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 权限列表独立缓存（5分钟）
 * 5. ✅ 自动缓存失效和重新获取
 */
const RoleList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [form] = Form.useForm();

  // ✅ 使用 React Query hooks 替换手动状态管理
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = useRoles(params);
  const { data: permissions = [] } = usePermissions();

  // Mutations
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();
  const assignPermissionsMutation = useAssignPermissions();

  const roles = data?.data || [];
  const total = data?.total || 0;

  // ✅ useCallback 优化事件处理函数
  const handleSubmit = useCallback(
    async (values: { name: string; description?: string }) => {
      if (editingRole) {
        await updateMutation.mutateAsync({ id: editingRole.id, data: values });
      } else {
        await createMutation.mutateAsync({ ...values, permissionIds: [] });
      }
      setModalVisible(false);
      setEditingRole(null);
      form.resetFields();
    },
    [editingRole, createMutation, updateMutation, form]
  );

  const handleEdit = useCallback(
    (role: Role) => {
      setEditingRole(role);
      form.setFieldsValue(role);
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

  const handleManagePermissions = useCallback((role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions?.map((p) => p.id) || []);
    setPermissionModalVisible(true);
  }, []);

  const handleAssignPermissions = useCallback(async () => {
    if (!selectedRole) return;
    await assignPermissionsMutation.mutateAsync({
      roleId: selectedRole.id,
      permissionIds: selectedPermissions,
    });
    setPermissionModalVisible(false);
  }, [selectedRole, selectedPermissions, assignPermissionsMutation]);

  const handleCreate = useCallback(() => {
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  }, [form]);

  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
    setEditingRole(null);
    form.resetFields();
  }, [form]);

  const handlePermissionModalCancel = useCallback(() => {
    setPermissionModalVisible(false);
  }, []);

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<Role> = useMemo(
    () => [
      {
        title: '角色名称',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '权限数量',
        dataIndex: 'permissions',
        key: 'permissions',
        render: (permissions: Permission[]) => permissions?.length || 0,
        sorter: (a, b) => (a.permissions?.length || 0) - (b.permissions?.length || 0),
      },
      {
        title: '权限',
        dataIndex: 'permissions',
        key: 'permissionList',
        width: 400,
        render: (permissions: Permission[]) => (
          <div>
            {permissions?.slice(0, 3).map((p) => (
              <Tag key={p.id} style={{ marginBottom: 4 }}>
                {p.resource}:{p.action}
              </Tag>
            ))}
            {permissions && permissions.length > 3 && <Tag>+{permissions.length - 3} 更多</Tag>}
          </div>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      },
      {
        title: '操作',
        key: 'action',
        width: 250,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => handleManagePermissions(record)}
            >
              配置权限
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定要删除这个角色吗?"
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
    [handleManagePermissions, handleEdit, handleDelete]
  );

  // ✅ useMemo 优化 Transfer 数据源
  const transferDataSource: TransferItem[] = useMemo(
    () =>
      (Array.isArray(permissions) ? permissions : []).map((p) => ({
        key: p.id,
        title: `${p.resource}:${p.action}`,
        description: p.description,
      })),
    [permissions]
  );

  // ✅ useMemo 优化树形数据结构
  const treeData = useMemo((): DataNode[] => {
    if (!Array.isArray(permissions)) {
      return [];
    }

    const grouped = permissions.reduce(
      (acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      },
      {} as Record<string, Permission[]>
    );

    return Object.entries(grouped).map(([resource, perms]) => ({
      title: resource,
      key: resource,
      children: perms.map((p) => ({
        title: `${p.action} (${p.description || '无描述'})`,
        key: p.id,
      })),
    }));
  }, [permissions]);

  return (
    <div>
      <h2>角色管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建角色
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 1200 }}
      />

      {/* 创建/编辑角色对话框 */}
      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="例如：管理员" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="角色描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限配置对话框 */}
      <Modal
        title={`配置权限 - ${selectedRole?.name}`}
        open={permissionModalVisible}
        onCancel={handlePermissionModalCancel}
        onOk={handleAssignPermissions}
        confirmLoading={assignPermissionsMutation.isPending}
        width={800}
      >
        <Tabs
          items={[
            {
              key: 'tree',
              label: '树形视图',
              children: (
                <div>
                  <p style={{ marginBottom: 16, color: '#666' }}>
                    已选择 <strong>{selectedPermissions.length}</strong> 个权限
                  </p>
                  <Tree
                    checkable
                    defaultExpandAll
                    treeData={treeData}
                    checkedKeys={selectedPermissions}
                    onCheck={(checkedKeys) => {
                      // 只保留叶子节点（实际权限ID）
                      const keys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked;
                      const leafKeys = keys.filter((key) => permissions.some((p) => p.id === key));
                      setSelectedPermissions(leafKeys as string[]);
                    }}
                    style={{
                      maxHeight: 400,
                      overflow: 'auto',
                      border: '1px solid #d9d9d9',
                      padding: 16,
                      borderRadius: 4,
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'transfer',
              label: '列表视图',
              children: (
                <Transfer
                  dataSource={transferDataSource}
                  titles={['可用权限', '已分配权限']}
                  targetKeys={selectedPermissions}
                  onChange={setSelectedPermissions}
                  render={(item) => item.title}
                  listStyle={{
                    width: 350,
                    height: 400,
                  }}
                  showSearch
                  filterOption={(inputValue, option) =>
                    option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
                  }
                />
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default RoleList;
