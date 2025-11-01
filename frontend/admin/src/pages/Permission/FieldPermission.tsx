import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Form, Tag, Switch, message, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
  CreateFieldPermissionDto,
} from '@/types';
import {
  getAllFieldPermissions,
  getFieldPermissionById,
  createFieldPermission,
  updateFieldPermission,
  deleteFieldPermission,
  toggleFieldPermission,
  getAccessLevels,
  getOperationTypes,
} from '@/services/fieldPermission';
import {
  FieldPermissionStatsCards,
  FieldPermissionToolbar,
  CreateEditFieldPermissionModal,
  FieldPermissionDetailModal,
  getOperationColor,
  getOperationLabel,
} from '@/components/FieldPermission';

const FieldPermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);
  const [accessLevels, setAccessLevels] = useState<
    Array<{ value: FieldAccessLevel; label: string }>
  >([]);
  const [operationTypes, setOperationTypes] = useState<
    Array<{ value: OperationType; label: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<FieldPermission | null>(null);
  const [detailPermission, setDetailPermission] = useState<FieldPermission | null>(null);
  const [form] = Form.useForm();
  const [filterRoleId, setFilterRoleId] = useState<string>('');
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<OperationType | undefined>(undefined);

  useEffect(() => {
    loadPermissions();
    loadMetadata();
  }, [filterRoleId, filterResourceType, filterOperation]);

  const loadMetadata = async () => {
    try {
      const [accessLevelsRes, operationTypesRes] = await Promise.all([
        getAccessLevels(),
        getOperationTypes(),
      ]);
      if (accessLevelsRes.success) {
        setAccessLevels(accessLevelsRes.data);
      }
      if (operationTypesRes.success) {
        setOperationTypes(operationTypesRes.data);
      }
    } catch (error) {
      message.error('加载元数据失败');
    }
  };

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterRoleId) params.roleId = filterRoleId;
      if (filterResourceType) params.resourceType = filterResourceType;
      if (filterOperation) params.operation = filterOperation;

      const res = await getAllFieldPermissions(params);
      if (res.success) {
        setPermissions(res.data);
      }
    } catch (error) {
      message.error('加载字段权限配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPermission(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: FieldPermission) => {
    setEditingPermission(record);
    form.setFieldsValue({
      roleId: record.roleId,
      resourceType: record.resourceType,
      operation: record.operation,
      hiddenFields: record.hiddenFields?.join(', '),
      readOnlyFields: record.readOnlyFields?.join(', '),
      writableFields: record.writableFields?.join(', '),
      requiredFields: record.requiredFields?.join(', '),
      description: record.description,
      priority: record.priority,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteFieldPermission(id);
      if (res.success) {
        message.success(res.message);
        loadPermissions();
      }
    } catch (error) {
      message.error('删除字段权限配置失败');
    }
  };

  const handleToggle = async (record: FieldPermission) => {
    try {
      const res = await toggleFieldPermission(record.id);
      if (res.success) {
        message.success(res.message);
        loadPermissions();
      }
    } catch (error) {
      message.error('切换状态失败');
    }
  };

  const handleViewDetail = async (record: FieldPermission) => {
    try {
      const res = await getFieldPermissionById(record.id);
      if (res.success) {
        setDetailPermission(res.data);
        setIsDetailModalVisible(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const data: CreateFieldPermissionDto = {
        roleId: values.roleId,
        resourceType: values.resourceType,
        operation: values.operation,
        hiddenFields: values.hiddenFields
          ? values.hiddenFields.split(',').map((s: string) => s.trim())
          : undefined,
        readOnlyFields: values.readOnlyFields
          ? values.readOnlyFields.split(',').map((s: string) => s.trim())
          : undefined,
        writableFields: values.writableFields
          ? values.writableFields.split(',').map((s: string) => s.trim())
          : undefined,
        requiredFields: values.requiredFields
          ? values.requiredFields.split(',').map((s: string) => s.trim())
          : undefined,
        description: values.description,
        priority: values.priority,
      };

      if (editingPermission) {
        const res = await updateFieldPermission(editingPermission.id, data);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadPermissions();
        }
      } else {
        const res = await createFieldPermission(data);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadPermissions();
        }
      }
    } catch (error) {
      message.error(editingPermission ? '更新字段权限配置失败' : '创建字段权限配置失败');
    }
  };

  const statistics = {
    total: permissions.length,
    active: permissions.filter((p) => p.isActive).length,
    inactive: permissions.filter((p) => !p.isActive).length,
    byOperation: {
      create: permissions.filter((p) => p.operation === 'create').length,
      update: permissions.filter((p) => p.operation === 'update').length,
      view: permissions.filter((p) => p.operation === 'view').length,
      export: permissions.filter((p) => p.operation === 'export').length,
    },
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
    },
    {
      title: '角色ID',
      dataIndex: 'roleId',
      key: 'roleId',
      width: 120,
      ellipsis: true,
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120,
    },
    {
      title: '操作类型',
      dataIndex: 'operation',
      key: 'operation',
      width: 100,
      render: (operation: OperationType) => (
        <Tag color={getOperationColor(operation)}>{getOperationLabel(operation)}</Tag>
      ),
    },
    {
      title: '隐藏字段',
      dataIndex: 'hiddenFields',
      key: 'hiddenFields',
      width: 150,
      render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
    },
    {
      title: '只读字段',
      dataIndex: 'readOnlyFields',
      key: 'readOnlyFields',
      width: 150,
      render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
    },
    {
      title: '可写字段',
      dataIndex: 'writableFields',
      key: 'writableFields',
      width: 150,
      render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
    },
    {
      title: '必填字段',
      dataIndex: 'requiredFields',
      key: 'requiredFields',
      width: 150,
      render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a: FieldPermission, b: FieldPermission) => a.priority - b.priority,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean, record: FieldPermission) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggle(record)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: FieldPermission) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
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
            title="确定删除此配置吗?"
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
  ];

  return (
    <div style={{ padding: '24px' }}>
      <FieldPermissionStatsCards statistics={statistics} />

      <Card
        title="字段权限管理"
        extra={
          <FieldPermissionToolbar
            filterRoleId={filterRoleId}
            filterResourceType={filterResourceType}
            filterOperation={filterOperation}
            operationTypes={operationTypes}
            onFilterRoleIdChange={(e) => setFilterRoleId(e.target.value)}
            onFilterResourceTypeChange={(e) => setFilterResourceType(e.target.value)}
            onFilterOperationChange={setFilterOperation}
            onRefresh={loadPermissions}
            onCreate={handleCreate}
          />
        }
      >
        <Table
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <CreateEditFieldPermissionModal
        visible={isModalVisible}
        editingPermission={editingPermission}
        form={form}
        operationTypes={operationTypes}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
      />

      <FieldPermissionDetailModal
        visible={isDetailModalVisible}
        detailPermission={detailPermission}
        operationTypes={operationTypes}
        getOperationColor={getOperationColor}
        getOperationLabel={(op) => getOperationLabel(op, operationTypes)}
        onClose={() => setIsDetailModalVisible(false)}
      />
    </div>
  );
};

export default FieldPermissionManagement;
