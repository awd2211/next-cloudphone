import { useState, useEffect } from 'react';
import { Table, Space, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getPermissions, createPermission, updatePermission, deletePermission } from '@/services/role';
import type { Permission } from '@/types';

const PermissionList = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [form] = Form.useForm();

  const loadPermissions = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const handleSubmit = async (values: { resource: string; action: string; description?: string }) => {
    try {
      if (editingPermission) {
        await updatePermission(editingPermission.id, values);
        message.success('更新权限成功');
      } else {
        await createPermission(values);
        message.success('创建权限成功');
      }
      setModalVisible(false);
      setEditingPermission(null);
      form.resetFields();
      loadPermissions();
    } catch (error) {
      message.error(editingPermission ? '更新权限失败' : '创建权限失败');
    }
  };

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission);
    form.setFieldsValue(permission);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePermission(id);
      message.success('删除权限成功');
      loadPermissions();
    } catch (error) {
      message.error('删除权限失败');
    }
  };

  // 按资源分组
  const groupedPermissions = (Array.isArray(permissions) ? permissions : []).reduce((acc, permission) => {
    const resource = permission.resource;
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const columns: ColumnsType<Permission> = [
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 200,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 150,
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
  ];

  return (
    <div>
      <h2>权限管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingPermission(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          创建权限
        </Button>
      </div>

      {/* 按资源分组显示 */}
      {Object.keys(groupedPermissions).map((resource) => (
        <div key={resource} style={{ marginBottom: 24 }}>
          <h3>{resource}</h3>
          <Table
            columns={columns}
            dataSource={groupedPermissions[resource]}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="small"
          />
        </div>
      ))}

      {/* 创建/编辑权限对话框 */}
      <Modal
        title={editingPermission ? '编辑权限' : '创建权限'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPermission(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
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
              {form.getFieldValue('resource') || 'resource'}:{form.getFieldValue('action') || 'action'}
            </p>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionList;
