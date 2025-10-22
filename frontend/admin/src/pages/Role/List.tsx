import { useState, useEffect } from 'react';
import { Table, Space, Button, Modal, Form, Input, message, Popconfirm, Transfer, Tag, Tree, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import { getRoles, createRole, updateRole, deleteRole, getPermissions, assignPermissionsToRole } from '@/services/role';
import type { Role, Permission } from '@/types';
import dayjs from 'dayjs';

interface TransferItem {
  key: string;
  title: string;
  description?: string;
}

const RoleList = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [form] = Form.useForm();

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await getRoles({ page, pageSize });
      setRoles(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await getPermissions();
      // 智能处理不同的响应格式
      let data = response;
      
      // 如果有 success 字段，提取 data
      if (response && typeof response === 'object' && 'success' in response) {
        data = response.data;
      }
      
      // 确保 data 是数组
      if (Array.isArray(data)) {
        setPermissions(data);
      } else if (data && Array.isArray(data.data)) {
        // 如果返回的是 {data: [...]} 格式
        setPermissions(data.data);
      } else {
        console.error('权限数据格式错误:', response);
        setPermissions([]);
      }
    } catch (error) {
      console.error('加载权限失败:', error);
      message.error('加载权限列表失败');
      setPermissions([]);
    }
  };

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, [page, pageSize]);

  const handleSubmit = async (values: { name: string; description?: string }) => {
    try {
      if (editingRole) {
        await updateRole(editingRole.id, values);
        message.success('更新角色成功');
      } else {
        await createRole({ ...values, permissionIds: [] });
        message.success('创建角色成功');
      }
      setModalVisible(false);
      setEditingRole(null);
      form.resetFields();
      loadRoles();
    } catch (error) {
      message.error(editingRole ? '更新角色失败' : '创建角色失败');
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue(role);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRole(id);
      message.success('删除角色成功');
      loadRoles();
    } catch (error) {
      message.error('删除角色失败');
    }
  };

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions?.map(p => p.id) || []);
    setPermissionModalVisible(true);
  };

  const handleAssignPermissions = async () => {
    if (!selectedRole) return;
    try {
      await assignPermissionsToRole(selectedRole.id, selectedPermissions);
      message.success('权限分配成功');
      setPermissionModalVisible(false);
      loadRoles();
    } catch (error) {
      message.error('权限分配失败');
    }
  };

  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
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
          {permissions && permissions.length > 3 && (
            <Tag>+{permissions.length - 3} 更多</Tag>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
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
  ];

  const transferDataSource: TransferItem[] = (Array.isArray(permissions) ? permissions : []).map(p => ({
    key: p.id,
    title: `${p.resource}:${p.action}`,
    description: p.description,
  }));

  // 将权限转换为树形结构
  const permissionsToTree = (): DataNode[] => {
    if (!Array.isArray(permissions)) {
      return [];
    }
    
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);

    return Object.entries(grouped).map(([resource, perms]) => ({
      title: resource,
      key: resource,
      children: perms.map(p => ({
        title: `${p.action} (${p.description || '无描述'})`,
        key: p.id,
      })),
    }));
  };

  const treeData = permissionsToTree();

  return (
    <div>
      <h2>角色管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRole(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          创建角色
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={loading}
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
        onCancel={() => {
          setModalVisible(false);
          setEditingRole(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
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
        onCancel={() => setPermissionModalVisible(false)}
        onOk={handleAssignPermissions}
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
                      const leafKeys = keys.filter(key =>
                        permissions.some(p => p.id === key)
                      );
                      setSelectedPermissions(leafKeys as string[]);
                    }}
                    style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #d9d9d9', padding: 16, borderRadius: 4 }}
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
