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
  Tabs,
  Divider,
  Alert,
  Collapse,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useFieldPermission,
  type FieldPermission,
  type CreateFieldPermissionDto,
  FieldAccessLevel,
  OperationType,
} from '@/hooks/useFieldPermission';
import { getRoles } from '@/services/role';
import type { Role } from '@/types';
import dayjs from 'dayjs';

const { Panel } = Collapse;

/**
 * 字段权限配置页面
 * 管理角色对不同资源字段的访问权限
 */
const FieldPermissionConfig = () => {
  const {
    fieldPermissions,
    loading: hookLoading,
    fetchFieldPermissions,
    createFieldPermission,
    updateFieldPermission,
    deleteFieldPermission,
    toggleFieldPermission,
    getAccessLevels,
    getOperationTypes,
    getTransformExamples,
  } = useFieldPermission();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<FieldPermission | null>(null);
  const [viewingPermission, setViewingPermission] = useState<FieldPermission | null>(null);
  const [transformExamples, setTransformExamples] = useState<any>(null);
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
  ];

  // 操作类型
  const operationTypes = [
    { value: OperationType.CREATE, label: '创建' },
    { value: OperationType.UPDATE, label: '更新' },
    { value: OperationType.VIEW, label: '查看' },
    { value: OperationType.EXPORT, label: '导出' },
  ];

  /**
   * 加载数据
   */
  const loadData = async () => {
    setLoading(true);
    try {
      await fetchFieldPermissions({
        roleId: filterRoleId,
        resourceType: filterResourceType,
      });
    } catch (error) {
      message.error('加载字段权限配置失败');
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

  /**
   * 加载转换示例
   */
  const loadTransformExamples = async () => {
    try {
      const examples = await getTransformExamples();
      setTransformExamples(examples);
    } catch (error) {
      console.error('Failed to load transform examples:', error);
    }
  };

  useEffect(() => {
    loadData();
    loadRoles();
    loadTransformExamples();
  }, [filterRoleId, filterResourceType]);

  /**
   * 提交表单
   */
  const handleSubmit = async (values: any) => {
    try {
      // 解析 JSON 字段
      const processedValues = { ...values };
      if (values.fieldAccessMap && typeof values.fieldAccessMap === 'string') {
        processedValues.fieldAccessMap = JSON.parse(values.fieldAccessMap);
      }
      if (values.fieldTransforms && typeof values.fieldTransforms === 'string') {
        processedValues.fieldTransforms = JSON.parse(values.fieldTransforms);
      }

      // 将数组字段转换
      if (values.hiddenFields && typeof values.hiddenFields === 'string') {
        processedValues.hiddenFields = values.hiddenFields.split(',').map((s: string) => s.trim());
      }
      if (values.readOnlyFields && typeof values.readOnlyFields === 'string') {
        processedValues.readOnlyFields = values.readOnlyFields
          .split(',')
          .map((s: string) => s.trim());
      }
      if (values.writableFields && typeof values.writableFields === 'string') {
        processedValues.writableFields = values.writableFields
          .split(',')
          .map((s: string) => s.trim());
      }
      if (values.requiredFields && typeof values.requiredFields === 'string') {
        processedValues.requiredFields = values.requiredFields
          .split(',')
          .map((s: string) => s.trim());
      }

      if (editingPermission) {
        await updateFieldPermission(editingPermission.id, processedValues);
        message.success('更新字段权限配置成功');
      } else {
        await createFieldPermission(processedValues as CreateFieldPermissionDto);
        message.success('创建字段权限配置成功');
      }
      setModalVisible(false);
      setEditingPermission(null);
      form.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.message || (editingPermission ? '更新失败' : '创建失败'));
    }
  };

  /**
   * 编辑
   */
  const handleEdit = (permission: FieldPermission) => {
    setEditingPermission(permission);
    form.setFieldsValue({
      ...permission,
      hiddenFields: permission.hiddenFields?.join(', ') || '',
      readOnlyFields: permission.readOnlyFields?.join(', ') || '',
      writableFields: permission.writableFields?.join(', ') || '',
      requiredFields: permission.requiredFields?.join(', ') || '',
      fieldAccessMap: permission.fieldAccessMap
        ? JSON.stringify(permission.fieldAccessMap, null, 2)
        : '',
      fieldTransforms: permission.fieldTransforms
        ? JSON.stringify(permission.fieldTransforms, null, 2)
        : '',
      priority: permission.priority ?? 100,
    });
    setModalVisible(true);
  };

  /**
   * 删除
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteFieldPermission(id);
      message.success('删除字段权限配置成功');
      loadData();
    } catch (error) {
      message.error('删除字段权限配置失败');
    }
  };

  /**
   * 切换启用状态
   */
  const handleToggle = async (id: string) => {
    try {
      await toggleFieldPermission(id);
      message.success('切换状态成功');
      loadData();
    } catch (error) {
      message.error('切换状态失败');
    }
  };

  /**
   * 查看详情
   */
  const handleView = (permission: FieldPermission) => {
    setViewingPermission(permission);
    setDetailModalVisible(true);
  };

  const columns: ColumnsType<FieldPermission> = [
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
      title: '操作类型',
      dataIndex: 'operation',
      key: 'operation',
      width: 100,
      render: (operation: OperationType) => {
        const op = operationTypes.find((o) => o.value === operation);
        return <Tag color="green">{op?.label || operation}</Tag>;
      },
    },
    {
      title: '字段规则',
      key: 'rules',
      width: 300,
      render: (_, record: FieldPermission) => (
        <div>
          {record.hiddenFields && record.hiddenFields.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <Tag color="red">隐藏 ({record.hiddenFields.length})</Tag>
              <span style={{ fontSize: 12, color: '#666' }}>
                {record.hiddenFields.slice(0, 2).join(', ')}
                {record.hiddenFields.length > 2 && '...'}
              </span>
            </div>
          )}
          {record.readOnlyFields && record.readOnlyFields.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <Tag color="orange">只读 ({record.readOnlyFields.length})</Tag>
              <span style={{ fontSize: 12, color: '#666' }}>
                {record.readOnlyFields.slice(0, 2).join(', ')}
                {record.readOnlyFields.length > 2 && '...'}
              </span>
            </div>
          )}
          {record.writableFields && record.writableFields.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <Tag color="green">可写 ({record.writableFields.length})</Tag>
            </div>
          )}
          {record.requiredFields && record.requiredFields.length > 0 && (
            <div>
              <Tag color="purple">必填 ({record.requiredFields.length})</Tag>
            </div>
          )}
        </div>
      ),
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
      render: (isActive: boolean, record: FieldPermission) => (
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
        <h2>字段权限配置</h2>
        <p style={{ color: '#666', marginBottom: 16 }}>
          配置不同角色在不同操作下对资源字段的访问权限，支持字段隐藏、只读、可写、必填等精细化控制
        </p>

        <Alert
          message="字段权限说明"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>
                <strong>隐藏字段</strong>：完全不显示给用户
              </li>
              <li>
                <strong>只读字段</strong>：可以查看但不能修改
              </li>
              <li>
                <strong>可写字段</strong>：可以查看和修改
              </li>
              <li>
                <strong>必填字段</strong>：在创建/更新时必须提供
              </li>
              <li>
                <strong>字段转换</strong>：支持数据脱敏（如手机号、邮箱、身份证等）
              </li>
            </ul>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          closable
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="link" onClick={() => setHelpModalVisible(true)}>
              查看示例
            </Button>
          }
        />

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
              setEditingPermission(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            创建配置
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={fieldPermissions}
          rowKey="id"
          loading={loading || hookLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1600 }}
        />
      </Card>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingPermission ? '编辑字段权限配置' : '创建字段权限配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPermission(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            label="角色"
            name="roleId"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色" disabled={!!editingPermission}>
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
            <Select placeholder="选择资源类型" disabled={!!editingPermission}>
              {resourceTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  {type.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="操作类型"
            name="operation"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="选择操作类型" disabled={!!editingPermission}>
              {operationTypes.map((type) => (
                <Select.Option key={type.value} value={type.value}>
                  {type.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Tabs
            items={[
              {
                key: 'simple',
                label: '简单配置',
                children: (
                  <>
                    <Form.Item
                      label="隐藏字段"
                      name="hiddenFields"
                      tooltip="这些字段将完全不显示给用户，多个字段用逗号分隔"
                    >
                      <Input.TextArea placeholder="例如：password, secret" rows={2} />
                    </Form.Item>

                    <Form.Item
                      label="只读字段"
                      name="readOnlyFields"
                      tooltip="这些字段可以查看但不能修改，多个字段用逗号分隔"
                    >
                      <Input.TextArea placeholder="例如：id, createdAt, updatedAt" rows={2} />
                    </Form.Item>

                    <Form.Item
                      label="可写字段"
                      name="writableFields"
                      tooltip="这些字段可以查看和修改，多个字段用逗号分隔"
                    >
                      <Input.TextArea placeholder="例如：name, email, phone" rows={2} />
                    </Form.Item>

                    <Form.Item
                      label="必填字段"
                      name="requiredFields"
                      tooltip="在创建/更新时必须提供这些字段，多个字段用逗号分隔"
                    >
                      <Input.TextArea placeholder="例如：name, email" rows={2} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'advanced',
                label: '高级配置',
                children: (
                  <>
                    <Form.Item
                      label="字段访问映射 (JSON)"
                      name="fieldAccessMap"
                      tooltip="使用 JSON 格式精确控制每个字段的访问级别"
                    >
                      <Input.TextArea
                        placeholder='{"phone": "read", "email": "write", "password": "hidden"}'
                        rows={4}
                      />
                    </Form.Item>

                    <Form.Item
                      label="字段转换规则 (JSON)"
                      name="fieldTransforms"
                      tooltip="配置字段数据脱敏规则，支持手机号、邮箱、身份证等脱敏"
                    >
                      <Input.TextArea
                        placeholder='{"phone": {"type": "mask", "pattern": "***-****-{4}"}}'
                        rows={4}
                      />
                    </Form.Item>

                    <Button
                      type="link"
                      size="small"
                      onClick={() => setHelpModalVisible(true)}
                    >
                      查看脱敏示例
                    </Button>
                  </>
                ),
              },
            ]}
          />

          <Divider />

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
        title="字段权限配置详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {viewingPermission && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="角色">
              {roles.find((r) => r.id === viewingPermission.roleId)?.name ||
                viewingPermission.roleId}
            </Descriptions.Item>
            <Descriptions.Item label="资源类型">
              {resourceTypes.find((r) => r.value === viewingPermission.resourceType)?.label ||
                viewingPermission.resourceType}
            </Descriptions.Item>
            <Descriptions.Item label="操作类型">
              <Tag color="green">
                {operationTypes.find((o) => o.value === viewingPermission.operation)?.label ||
                  viewingPermission.operation}
              </Tag>
            </Descriptions.Item>
            {viewingPermission.hiddenFields && viewingPermission.hiddenFields.length > 0 && (
              <Descriptions.Item label="隐藏字段">
                {viewingPermission.hiddenFields.map((field) => (
                  <Tag key={field} color="red">
                    {field}
                  </Tag>
                ))}
              </Descriptions.Item>
            )}
            {viewingPermission.readOnlyFields && viewingPermission.readOnlyFields.length > 0 && (
              <Descriptions.Item label="只读字段">
                {viewingPermission.readOnlyFields.map((field) => (
                  <Tag key={field} color="orange">
                    {field}
                  </Tag>
                ))}
              </Descriptions.Item>
            )}
            {viewingPermission.writableFields && viewingPermission.writableFields.length > 0 && (
              <Descriptions.Item label="可写字段">
                {viewingPermission.writableFields.map((field) => (
                  <Tag key={field} color="green">
                    {field}
                  </Tag>
                ))}
              </Descriptions.Item>
            )}
            {viewingPermission.requiredFields && viewingPermission.requiredFields.length > 0 && (
              <Descriptions.Item label="必填字段">
                {viewingPermission.requiredFields.map((field) => (
                  <Tag key={field} color="purple">
                    {field}
                  </Tag>
                ))}
              </Descriptions.Item>
            )}
            {viewingPermission.fieldAccessMap && (
              <Descriptions.Item label="字段访问映射">
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(viewingPermission.fieldAccessMap, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            {viewingPermission.fieldTransforms && (
              <Descriptions.Item label="字段转换规则">
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(viewingPermission.fieldTransforms, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="优先级">{viewingPermission.priority}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={viewingPermission.isActive ? 'green' : 'red'}>
                {viewingPermission.isActive ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="描述">
              {viewingPermission.description || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 帮助/示例对话框 */}
      <Modal
        title="字段脱敏示例"
        open={helpModalVisible}
        onCancel={() => setHelpModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHelpModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {transformExamples && (
          <Collapse defaultActiveKey={['mask']}>
            {Object.entries(transformExamples).map(([key, value]: [string, any]) => (
              <Panel header={value.description || key} key={key}>
                {value.examples ? (
                  <div>
                    {value.examples.map((ex: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: 12 }}>
                        <div>
                          <strong>字段：</strong>
                          {ex.field}
                        </div>
                        <div>
                          <strong>配置：</strong>
                          <pre style={{ margin: '4px 0', fontSize: 12, background: '#f5f5f5', padding: 8 }}>
                            {JSON.stringify(ex.transform, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <strong>效果：</strong>
                          {ex.example}
                        </div>
                        {idx < value.examples.length - 1 && <Divider />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div>
                      <strong>配置：</strong>
                      <pre style={{ margin: '4px 0', fontSize: 12, background: '#f5f5f5', padding: 8 }}>
                        {JSON.stringify(value.example, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <strong>效果：</strong>
                      {value.result}
                    </div>
                  </div>
                )}
              </Panel>
            ))}
          </Collapse>
        )}
      </Modal>
    </div>
  );
};

export default FieldPermissionConfig;
