import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Alert,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Descriptions
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import {
  getAllDataScopes,
  getScopeTypes,
  getDataScopesByRole,
  createDataScope,
  updateDataScope,
  deleteDataScope,
  toggleDataScope
} from '@/services/dataScope';
import type { DataScope, ScopeType, CreateDataScopeDto, UpdateDataScopeDto } from '@/types';
import dayjs from 'dayjs';

const { TextArea } = Input;

const DataScopeManagement = () => {
  const [dataScopes, setDataScopes] = useState<DataScope[]>([]);
  const [scopeTypes, setScopeTypes] = useState<Array<{ value: ScopeType; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedScope, setSelectedScope] = useState<DataScope | null>(null);

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // 加载范围类型元数据
  const loadScopeTypes = async () => {
    try {
      const res = await getScopeTypes();
      if (res.success) {
        setScopeTypes(res.data);
      }
    } catch (error) {
      message.error('加载范围类型失败');
    }
  };

  // 加载数据范围配置
  const loadDataScopes = async () => {
    setLoading(true);
    try {
      const res = await getAllDataScopes();
      if (res.success) {
        setDataScopes(res.data);
      }
    } catch (error) {
      message.error('加载数据范围配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScopeTypes();
    loadDataScopes();
  }, []);

  // 创建数据范围配置
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const res = await createDataScope(values as CreateDataScopeDto);
      if (res.success) {
        message.success(res.message || '创建成功');
        createForm.resetFields();
        setCreateModalVisible(false);
        loadDataScopes();
      } else {
        message.error(res.message || '创建失败');
      }
    } catch (error) {
      message.error('创建失败');
    }
  };

  // 编辑数据范围配置
  const handleEdit = async () => {
    if (!selectedScope) return;

    try {
      const values = await editForm.validateFields();
      const res = await updateDataScope(selectedScope.id, values as UpdateDataScopeDto);
      if (res.success) {
        message.success(res.message || '更新成功');
        editForm.resetFields();
        setEditModalVisible(false);
        setSelectedScope(null);
        loadDataScopes();
      } else {
        message.error(res.message || '更新失败');
      }
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 删除数据范围配置
  const handleDelete = async (id: string) => {
    try {
      const res = await deleteDataScope(id);
      if (res.success) {
        message.success(res.message || '删除成功');
        loadDataScopes();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 启用/禁用
  const handleToggle = async (id: string) => {
    try {
      const res = await toggleDataScope(id);
      if (res.success) {
        message.success(res.message);
        loadDataScopes();
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 打开编辑模态框
  const openEditModal = (record: DataScope) => {
    setSelectedScope(record);
    editForm.setFieldsValue({
      scopeType: record.scopeType,
      description: record.description,
      isActive: record.isActive,
      priority: record.priority,
      includeSubDepartments: record.includeSubDepartments
    });
    setEditModalVisible(true);
  };

  // 查看详情
  const viewDetail = (record: DataScope) => {
    setSelectedScope(record);
    setDetailModalVisible(true);
  };

  // 获取范围类型标签颜色
  const getScopeTypeColor = (type: ScopeType) => {
    const colors: Record<ScopeType, string> = {
      'all': 'red',
      'tenant': 'orange',
      'department': 'blue',
      'department_only': 'cyan',
      'self': 'green',
      'custom': 'purple'
    };
    return colors[type] || 'default';
  };

  // 统计数据
  const stats = {
    total: dataScopes.length,
    active: dataScopes.filter(s => s.isActive).length,
    inactive: dataScopes.filter(s => !s.isActive).length,
    byType: dataScopes.reduce((acc, s) => {
      acc[s.scopeType] = (acc[s.scopeType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  // 表格列
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => id.substring(0, 8)
    },
    {
      title: '角色ID',
      dataIndex: 'roleId',
      key: 'roleId',
      width: 120,
      render: (roleId: string) => roleId.substring(0, 8)
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 120
    },
    {
      title: '范围类型',
      dataIndex: 'scopeType',
      key: 'scopeType',
      width: 150,
      render: (type: ScopeType) => {
        const typeObj = scopeTypes.find(t => t.value === type);
        return (
          <Tag color={getScopeTypeColor(type)}>
            {typeObj?.label || type}
          </Tag>
        );
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      align: 'center' as const
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'} icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (time: string) => dayjs(time).format('MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: DataScope) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggle(record.id)}
          >
            {record.isActive ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确定删除此数据范围配置？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="数据范围权限管理"
          description="配置角色对不同资源类型的数据访问范围。支持全部数据、租户数据、部门数据、本人数据和自定义范围。"
          type="info"
          showIcon
        />

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总配置数"
                value={stats.total}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已启用"
                value={stats.active}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已禁用"
                value={stats.inactive}
                valueStyle={{ color: '#999' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="自定义范围"
                value={stats.byType['custom'] || 0}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 操作按钮和表格 */}
        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建配置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadDataScopes}
            >
              刷新
            </Button>
          </Space>

          <Table
            columns={columns}
            dataSource={dataScopes}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1400 }}
          />
        </Card>
      </Space>

      {/* 创建模态框 */}
      <Modal
        title="创建数据范围配置"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        okText="创建"
        cancelText="取消"
        width={600}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="roleId"
            label="角色ID"
            rules={[{ required: true, message: '请输入角色ID' }]}
          >
            <Input placeholder="请输入角色ID" />
          </Form.Item>

          <Form.Item
            name="resourceType"
            label="资源类型"
            rules={[{ required: true, message: '请输入资源类型' }]}
          >
            <Select placeholder="请选择资源类型">
              <Select.Option value="user">用户 (user)</Select.Option>
              <Select.Option value="device">设备 (device)</Select.Option>
              <Select.Option value="order">订单 (order)</Select.Option>
              <Select.Option value="billing">账单 (billing)</Select.Option>
              <Select.Option value="ticket">工单 (ticket)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="scopeType"
            label="范围类型"
            rules={[{ required: true, message: '请选择范围类型' }]}
          >
            <Select placeholder="请选择范围类型">
              {scopeTypes.map(type => (
                <Select.Option key={type.value} value={type.value}>
                  <Tag color={getScopeTypeColor(type.value)}>{type.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="includeSubDepartments"
            label="包含子部门"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            initialValue={100}
            tooltip="数字越小优先级越高"
          >
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="请输入配置描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        title="编辑数据范围配置"
        open={editModalVisible}
        onOk={handleEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedScope(null);
          editForm.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="scopeType"
            label="范围类型"
          >
            <Select placeholder="请选择范围类型">
              {scopeTypes.map(type => (
                <Select.Option key={type.value} value={type.value}>
                  <Tag color={getScopeTypeColor(type.value)}>{type.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="includeSubDepartments"
            label="包含子部门"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="priority"
            label="优先级"
            tooltip="数字越小优先级越高"
          >
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="启用状态"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="请输入配置描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情模态框 */}
      <Modal
        title="数据范围配置详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedScope(null);
        }}
        footer={null}
        width={700}
      >
        {selectedScope && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{selectedScope.id}</Descriptions.Item>
            <Descriptions.Item label="角色ID">{selectedScope.roleId}</Descriptions.Item>
            <Descriptions.Item label="资源类型">{selectedScope.resourceType}</Descriptions.Item>
            <Descriptions.Item label="范围类型">
              <Tag color={getScopeTypeColor(selectedScope.scopeType)}>
                {scopeTypes.find(t => t.value === selectedScope.scopeType)?.label || selectedScope.scopeType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="包含子部门">
              {selectedScope.includeSubDepartments ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{selectedScope.priority}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedScope.isActive ? 'success' : 'default'}>
                {selectedScope.isActive ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="描述">{selectedScope.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedScope.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(selectedScope.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {selectedScope.filter && (
              <Descriptions.Item label="自定义过滤条件">
                <pre style={{
                  maxHeight: '200px',
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: '8px',
                  borderRadius: '4px',
                  margin: 0
                }}>
                  {JSON.stringify(selectedScope.filter, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default DataScopeManagement;
