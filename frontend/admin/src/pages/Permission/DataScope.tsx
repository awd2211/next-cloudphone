import { useState, useEffect } from 'react';
import {
  Table,
  Space,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Tag,
  Switch,
  InputNumber,
  Card,
  Descriptions,
  TreeSelect,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useDataScope, type DataScope, ScopeType, type CreateDataScopeDto } from '@/hooks/useDataScope';
import { getRoles } from '@/services/role';
import type { Role } from '@/types';
import dayjs from 'dayjs';

/**
 * 数据范围配置页面
 * 管理角色对不同资源的数据访问范围
 */
const DataScopeConfig = () => {
  const {
    dataScopes,
    scopeTypes,
    loading: hookLoading,
    fetchDataScopes,
    createDataScope,
    updateDataScope,
    deleteDataScope,
    toggleDataScope,
    getScopeDescription,
  } = useDataScope();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingScope, setEditingScope] = useState<DataScope | null>(null);
  const [viewingScope, setViewingScope] = useState<DataScope | null>(null);
  const [form] = Form.useForm();

  // 查询参数
  const [filterRoleId, setFilterRoleId] = useState<string | undefined>();
  const [filterResourceType, setFilterResourceType] = useState<string | undefined>();

  // 资源类型列表
  const resourceTypes = [
    { value: 'device', label: '云手机设备' },
    { value: 'user', label: '用户' },
    { value: 'app', label: '应用' },
    { value: 'order', label: '订单' },
    { value: 'billing', label: '账单' },
    { value: 'plan', label: '套餐' },
    { value: 'payment', label: '支付' },
    { value: 'audit_log', label: '审计日志' },
  ];

  /**
   * 加载数据
   */
  const loadData = async () => {
    setLoading(true);
    try {
      await fetchDataScopes({
        roleId: filterRoleId,
        resourceType: filterResourceType,
        isActive: true,
      });
    } catch (error) {
      message.error('加载数据范围配置失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载角色列表
   */
  const loadRoles = async () => {
    try {
      const res = await getRoles({ page: 1, pageSize: 100 });
      setRoles(res.data);
    } catch (error) {
      message.error('加载角色列表失败');
    }
  };

  useEffect(() => {
    loadData();
    loadRoles();
  }, [filterRoleId, filterResourceType]);

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      if (editingScope) {
        await updateDataScope(editingScope.id, values);
        message.success('更新数据范围配置成功');
      } else {
        await createDataScope(values as CreateDataScopeDto);
        message.success('创建数据范围配置成功');
      }
      setModalVisible(false);
      setEditingScope(null);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || (editingScope ? '更新失败' : '创建失败'));
    }
  };

  /**
   * 编辑
   */
  const handleEdit = (scope: DataScope) => {
    setEditingScope(scope);
    form.setFieldsValue({
      ...scope,
      departmentIds: scope.departmentIds || [],
      includeSubDepartments: scope.includeSubDepartments ?? true,
      priority: scope.priority ?? 100,
    });
    setModalVisible(true);
  };

  /**
   * 删除
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteDataScope(id);
      message.success('删除数据范围配置成功');
      loadData();
    } catch (error) {
      message.error('删除数据范围配置失败');
    }
  };

  /**
   * 切换启用状态
   */
  const handleToggle = async (id: string) => {
    try {
      await toggleDataScope(id);
      message.success('切换状态成功');
      loadData();
    } catch (error) {
      message.error('切换状态失败');
    }
  };

  /**
   * 查看详情
   */
  const handleView = (scope: DataScope) => {
    setViewingScope(scope);
    setDetailModalVisible(true);
  };

  const columns: ColumnsType<DataScope> = [
    {
      title: '角色',
      dataIndex: 'roleId',
      key: 'roleId',
      width: 150,
      render: (roleId: string) => {
        const role = roles.find((r) => r.id === roleId);
        return role?.name || roleId;
      },
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 150,
      render: (resourceType: string) => {
        const resource = resourceTypes.find((r) => r.value === resourceType);
        return <Tag color="blue">{resource?.label || resourceType}</Tag>;
      },
    },
    {
      title: '范围类型',
      dataIndex: 'scopeType',
      key: 'scopeType',
      width: 200,
      render: (scopeType: ScopeType, record: DataScope) => {
        const scopeType_ = scopeTypes.find((s) => s.value === scopeType);
        return (
          <div>
            <Tag color="green">{scopeType_?.label || scopeType}</Tag>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {getScopeDescription(record)}
            </div>
          </div>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => (a.priority || 100) - (b.priority || 100),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: DataScope) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggle(record.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
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
      width: 160,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
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
            title="确定要删除这个配置吗?"
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
      <Card>
        <h2>数据范围配置</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          配置不同角色对各类资源的数据访问范围，支持全部数据、租户数据、部门数据、本人数据等多种范围类型
        </p>

        {/* 筛选栏 */}
        <Space style={{ marginBottom: 16 }} size="middle">
          <Select
            placeholder="选择角色筛选"
            style={{ width: 200 }}
            allowClear
            value={filterRoleId}
            onChange={setFilterRoleId}
          >
            {roles.map((role) => (
              <Select.Option key={role.id} value={role.id}>
                {role.name}
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="选择资源类型筛选"
            style={{ width: 200 }}
            allowClear
            value={filterResourceType}
            onChange={setFilterResourceType}
          >
            {resourceTypes.map((type) => (
              <Select.Option key={type.value} value={type.value}>
                {type.label}
              </Select.Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingScope(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            创建配置
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={dataScopes}
          rowKey="id"
          loading={loading || hookLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingScope ? '编辑数据范围配置' : '创建数据范围配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingScope(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="角色"
            name="roleId"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色" disabled={!!editingScope}>
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="资源类型"
            name="resourceType"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select placeholder="选择资源类型" disabled={!!editingScope}>
              {resourceTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  {type.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="范围类型"
            name="scopeType"
            rules={[{ required: true, message: '请选择范围类型' }]}
          >
            <Select placeholder="选择范围类型">
              {scopeTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  <div>
                    <div>{type.label}</div>
                    {type.description && (
                      <div style={{ fontSize: 12, color: '#999' }}>{type.description}</div>
                    )}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.scopeType !== currentValues.scopeType
            }
          >
            {({ getFieldValue }) => {
              const scopeType = getFieldValue('scopeType');

              return (
                <>
                  {scopeType === ScopeType.CUSTOM && (
                    <Form.Item label="自定义过滤器" name="filter">
                      <Input.TextArea
                        placeholder='JSON 格式，例如：{"status": "active", "region": "cn"}'
                        rows={4}
                      />
                    </Form.Item>
                  )}

                  {(scopeType === ScopeType.DEPARTMENT ||
                    scopeType === ScopeType.DEPARTMENT_ONLY) && (
                    <>
                      <Form.Item label="部门ID列表" name="departmentIds">
                        <Select mode="tags" placeholder="输入部门ID，回车添加" />
                      </Form.Item>

                      <Form.Item
                        label="包含子部门"
                        name="includeSubDepartments"
                        valuePropName="checked"
                      >
                        <Switch checkedChildren="是" unCheckedChildren="否" />
                      </Form.Item>
                    </>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item label="优先级" name="priority" initialValue={100}>
            <InputNumber
              min={0}
              max={999}
              style={{ width: '100%' }}
              placeholder="数值越小优先级越高"
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="配置描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情对话框 */}
      <Modal
        title="数据范围配置详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {viewingScope && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="角色">
              {roles.find((r) => r.id === viewingScope.roleId)?.name || viewingScope.roleId}
            </Descriptions.Item>
            <Descriptions.Item label="资源类型">
              {resourceTypes.find((r) => r.value === viewingScope.resourceType)?.label ||
                viewingScope.resourceType}
            </Descriptions.Item>
            <Descriptions.Item label="范围类型">
              <Tag color="green">
                {scopeTypes.find((s) => s.value === viewingScope.scopeType)?.label ||
                  viewingScope.scopeType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="范围描述">
              {getScopeDescription(viewingScope)}
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{viewingScope.priority}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={viewingScope.isActive ? 'green' : 'red'}>
                {viewingScope.isActive ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            {viewingScope.departmentIds && viewingScope.departmentIds.length > 0 && (
              <Descriptions.Item label="部门ID列表">
                {viewingScope.departmentIds.join(', ')}
              </Descriptions.Item>
            )}
            {viewingScope.filter && (
              <Descriptions.Item label="自定义过滤器">
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(viewingScope.filter, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="描述">
              {viewingScope.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {viewingScope.createdAt
                ? dayjs(viewingScope.createdAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {viewingScope.updatedAt
                ? dayjs(viewingScope.updatedAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default DataScopeConfig;
