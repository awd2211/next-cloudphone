import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Switch,
  message,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Statistic,
  Tabs,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
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

const { TabPane } = Tabs;

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

  const getOperationColor = (operation: OperationType) => {
    const colors: Record<OperationType, string> = {
      create: 'green',
      update: 'blue',
      view: 'cyan',
      export: 'purple',
    };
    return colors[operation] || 'default';
  };

  const getOperationLabel = (operation: OperationType) => {
    const operationType = operationTypes.find((t) => t.value === operation);
    return operationType?.label || operation;
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
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总配置数"
              value={statistics.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="启用中" value={statistics.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已禁用"
              value={statistics.inactive}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="创建操作"
              value={statistics.byOperation.create}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="字段权限管理"
        extra={
          <Space>
            <Input
              placeholder="角色ID"
              value={filterRoleId}
              onChange={(e) => setFilterRoleId(e.target.value)}
              style={{ width: 150 }}
              allowClear
            />
            <Input
              placeholder="资源类型"
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              style={{ width: 150 }}
              allowClear
            />
            <Select
              placeholder="操作类型"
              value={filterOperation}
              onChange={setFilterOperation}
              style={{ width: 150 }}
              allowClear
              options={operationTypes}
            />
            <Button icon={<ReloadOutlined />} onClick={loadPermissions}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建配置
            </Button>
          </Space>
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

      <Modal
        title={editingPermission ? '编辑字段权限配置' : '新建字段权限配置'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="roleId"
            label="角色ID"
            rules={[{ required: true, message: '请输入角色ID' }]}
          >
            <Input placeholder="请输入角色ID" disabled={!!editingPermission} />
          </Form.Item>

          <Form.Item
            name="resourceType"
            label="资源类型"
            rules={[{ required: true, message: '请输入资源类型' }]}
          >
            <Input placeholder="如: user, device, app" disabled={!!editingPermission} />
          </Form.Item>

          <Form.Item
            name="operation"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型" options={operationTypes} />
          </Form.Item>

          <Tabs defaultActiveKey="basic">
            <TabPane tab="基础字段配置" key="basic">
              <Form.Item name="hiddenFields" label="隐藏字段" tooltip="多个字段用逗号分隔">
                <Input.TextArea placeholder="如: password, secret, 多个用逗号分隔" rows={2} />
              </Form.Item>

              <Form.Item name="readOnlyFields" label="只读字段" tooltip="多个字段用逗号分隔">
                <Input.TextArea placeholder="如: id, createdAt, 多个用逗号分隔" rows={2} />
              </Form.Item>

              <Form.Item name="writableFields" label="可写字段" tooltip="多个字段用逗号分隔">
                <Input.TextArea placeholder="如: name, email, 多个用逗号分隔" rows={2} />
              </Form.Item>

              <Form.Item name="requiredFields" label="必填字段" tooltip="多个字段用逗号分隔">
                <Input.TextArea placeholder="如: name, email, 多个用逗号分隔" rows={2} />
              </Form.Item>
            </TabPane>

            <TabPane tab="高级配置" key="advanced">
              <Form.Item
                name="priority"
                label="优先级"
                tooltip="数值越小优先级越高"
                initialValue={100}
              >
                <InputNumber min={1} max={999} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="description" label="描述">
                <Input.TextArea placeholder="请输入配置描述" rows={3} />
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>

      <Modal
        title="字段权限详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {detailPermission && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="ID" span={2}>
              {detailPermission.id}
            </Descriptions.Item>
            <Descriptions.Item label="角色ID">{detailPermission.roleId}</Descriptions.Item>
            <Descriptions.Item label="资源类型">{detailPermission.resourceType}</Descriptions.Item>
            <Descriptions.Item label="操作类型">
              <Tag color={getOperationColor(detailPermission.operation)}>
                {getOperationLabel(detailPermission.operation)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{detailPermission.priority}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              <Tag color={detailPermission.isActive ? 'success' : 'error'}>
                {detailPermission.isActive ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="隐藏字段" span={2}>
              {detailPermission.hiddenFields?.length ? (
                <Space wrap>
                  {detailPermission.hiddenFields.map((field) => (
                    <Tag key={field} color="red">
                      {field}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <span style={{ color: '#999' }}>无</span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="只读字段" span={2}>
              {detailPermission.readOnlyFields?.length ? (
                <Space wrap>
                  {detailPermission.readOnlyFields.map((field) => (
                    <Tag key={field} color="orange">
                      {field}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <span style={{ color: '#999' }}>无</span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="可写字段" span={2}>
              {detailPermission.writableFields?.length ? (
                <Space wrap>
                  {detailPermission.writableFields.map((field) => (
                    <Tag key={field} color="blue">
                      {field}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <span style={{ color: '#999' }}>无</span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="必填字段" span={2}>
              {detailPermission.requiredFields?.length ? (
                <Space wrap>
                  {detailPermission.requiredFields.map((field) => (
                    <Tag key={field} color="purple">
                      {field}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <span style={{ color: '#999' }}>无</span>
              )}
            </Descriptions.Item>
            {detailPermission.fieldAccessMap &&
              Object.keys(detailPermission.fieldAccessMap).length > 0 && (
                <Descriptions.Item label="字段访问映射" span={2}>
                  <Space wrap>
                    {Object.entries(detailPermission.fieldAccessMap).map(([field, level]) => (
                      <Tag key={field} color="cyan">
                        {field}: {level}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            {detailPermission.fieldTransforms &&
              Object.keys(detailPermission.fieldTransforms).length > 0 && (
                <Descriptions.Item label="字段转换规则" span={2}>
                  <Space direction="vertical">
                    {Object.entries(detailPermission.fieldTransforms).map(([field, transform]) => (
                      <div key={field}>
                        <Tag color="geekblue">{field}</Tag>
                        <span>类型: {transform.type}</span>
                      </div>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            <Descriptions.Item label="描述" span={2}>
              {detailPermission.description || <span style={{ color: '#999' }}>无</span>}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(detailPermission.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {new Date(detailPermission.updatedAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default FieldPermissionManagement;
