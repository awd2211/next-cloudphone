import { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
  Select,
  Badge,
  Tooltip,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  AppstoreAddOutlined,
  FireOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getTemplates,
  getPopularTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createDeviceFromTemplate,
  batchCreateDevicesFromTemplate,
  getTemplateStats,
} from '@/services/template';
import { getUsers } from '@/services/user';
import type { DeviceTemplate, CreateTemplateDto, User } from '@/types';
import dayjs from 'dayjs';

const { Search, TextArea } = Input;
const { Option } = Select;

const TemplateList = () => {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [popularTemplates, setPopularTemplates] = useState<DeviceTemplate[]>([]);
  const [stats, setStats] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [createDeviceModalVisible, setCreateDeviceModalVisible] = useState(false);
  const [batchCreateModalVisible, setBatchCreateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [isPublicFilter, setIsPublicFilter] = useState<boolean | undefined>();
  const [users, setUsers] = useState<User[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createDeviceForm] = Form.useForm();
  const [batchCreateForm] = Form.useForm();

  // 加载模板列表
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (searchKeyword) params.search = searchKeyword;
      if (categoryFilter) params.category = categoryFilter;
      if (isPublicFilter !== undefined) params.isPublic = isPublicFilter;

      const res = await getTemplates(params);
      setTemplates(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载热门模板
  const loadPopularTemplates = async () => {
    try {
      const data = await getPopularTemplates();
      setPopularTemplates(data);
    } catch (error) {
      console.error('加载热门模板失败', error);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const data = await getTemplateStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const res = await getUsers({ page: 1, pageSize: 1000 });
      setUsers(res.data);
    } catch (error) {
      console.error('加载用户列表失败', error);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadPopularTemplates();
    loadStats();
    loadUsers();
  }, [page, pageSize, searchKeyword, categoryFilter, isPublicFilter]);

  // 创建模板
  const handleCreate = async (values: CreateTemplateDto) => {
    try {
      await createTemplate(values);
      message.success('模板创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadTemplates();
      loadStats();
    } catch (error: any) {
      message.error(error.message || '创建模板失败');
    }
  };

  // 更新模板
  const handleEdit = async (values: any) => {
    if (!selectedTemplate) return;
    try {
      await updateTemplate(selectedTemplate.id, values);
      message.success('模板更新成功');
      setEditModalVisible(false);
      editForm.resetFields();
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error: any) {
      message.error(error.message || '更新模板失败');
    }
  };

  // 删除模板
  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      message.success('模板删除成功');
      loadTemplates();
      loadStats();
    } catch (error: any) {
      message.error(error.message || '删除模板失败');
    }
  };

  // 从模板创建设备
  const handleCreateDevice = async (values: any) => {
    if (!selectedTemplate) return;
    try {
      await createDeviceFromTemplate(selectedTemplate.id, values);
      message.success('设备创建成功');
      setCreateDeviceModalVisible(false);
      createDeviceForm.resetFields();
      setSelectedTemplate(null);
    } catch (error: any) {
      message.error(error.message || '创建设备失败');
    }
  };

  // 批量创建设备
  const handleBatchCreate = async (values: any) => {
    if (!selectedTemplate) return;
    try {
      const devices = await batchCreateDevicesFromTemplate(selectedTemplate.id, values);
      message.success(`成功创建 ${devices.length} 个设备`);
      setBatchCreateModalVisible(false);
      batchCreateForm.resetFields();
      setSelectedTemplate(null);
    } catch (error: any) {
      message.error(error.message || '批量创建设备失败');
    }
  };

  // 打开编辑模态框
  const openEditModal = (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    editForm.setFieldsValue({
      name: template.name,
      description: template.description,
      category: template.category,
      isPublic: template.isPublic,
      tags: template.tags,
    });
    setEditModalVisible(true);
  };

  // 打开创建设备模态框
  const openCreateDeviceModal = (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setCreateDeviceModalVisible(true);
  };

  // 打开批量创建模态框
  const openBatchCreateModal = (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setBatchCreateModalVisible(true);
  };

  const columns: ColumnsType<DeviceTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {!record.isPublic && (
            <Tooltip title="私有模板">
              <LockOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (text) => (text ? <Tag color="blue">{text}</Tag> : '-'),
    },
    {
      title: '配置',
      key: 'config',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>Android {record.androidVersion}</span>
          <span style={{ fontSize: '12px', color: '#999' }}>
            {record.cpuCores} 核 / {record.memoryMB}MB / {record.storageMB}MB
          </span>
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) =>
        tags && tags.length > 0 ? (
          <Space wrap>
            {tags.map((tag) => (
              <Tag key={tag} style={{ margin: 0 }}>
                {tag}
              </Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.usageCount - b.usageCount,
      render: (count) => <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '可见性',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      align: 'center',
      filters: [
        { text: '公开', value: true },
        { text: '私有', value: false },
      ],
      render: (isPublic) =>
        isPublic ? (
          <Tag icon={<UnlockOutlined />} color="success">
            公开
          </Tag>
        ) : (
          <Tag icon={<LockOutlined />} color="warning">
            私有
          </Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="创建单个设备">
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => openCreateDeviceModal(record)}
            >
              创建设备
            </Button>
          </Tooltip>
          <Tooltip title="批量创建设备">
            <Button
              type="link"
              size="small"
              icon={<AppstoreAddOutlined />}
              onClick={() => openBatchCreateModal(record)}
            >
              批量创建
            </Button>
          </Tooltip>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确定要删除这个模板吗？" onConfirm={() => handleDelete(record.id)}>
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
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总模板数" value={stats?.totalTemplates || 0} />
          </Col>
          <Col span={6}>
            <Statistic
              title="公开模板"
              value={stats?.publicTemplates || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="私有模板"
              value={stats?.privateTemplates || 0}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总使用次数"
              value={stats?.totalUsage || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>
      </Card>

      {popularTemplates.length > 0 && (
        <Card
          title={
            <span>
              <FireOutlined /> 热门模板
            </span>
          }
          style={{ marginBottom: '16px' }}
        >
          <Space wrap>
            {popularTemplates.map((template) => (
              <Tag
                key={template.id}
                color="orange"
                style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px' }}
                onClick={() => openCreateDeviceModal(template)}
              >
                {template.name} ({template.usageCount} 次使用)
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      <Card>
        <Space style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建模板
          </Button>
          <Search
            placeholder="搜索模板名称或描述"
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => setSearchKeyword(value)}
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => setCategoryFilter(value)}
          >
            <Option value="开发测试">开发测试</Option>
            <Option value="游戏">游戏</Option>
            <Option value="社交">社交</Option>
            <Option value="办公">办公</Option>
            <Option value="其他">其他</Option>
          </Select>
          <Select
            placeholder="可见性"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setIsPublicFilter(value)}
          >
            <Option value={true}>公开</Option>
            <Option value={false}>私有</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
        />
      </Card>

      {/* 创建模板模态框 */}
      <Modal
        title="新建设备模板"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item label="模板描述" name="description">
            <TextArea rows={3} placeholder="请输入模板描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="分类" name="category">
                <Select placeholder="请选择分类">
                  <Option value="开发测试">开发测试</Option>
                  <Option value="游戏">游戏</Option>
                  <Option value="社交">社交</Option>
                  <Option value="办公">办公</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="可见性" name="isPublic" initialValue={true}>
                <Select>
                  <Option value={true}>公开（所有用户可见）</Option>
                  <Option value={false}>私有（仅自己可见）</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Divider>设备配置</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Android 版本"
                name="androidVersion"
                rules={[{ required: true, message: '请输入 Android 版本' }]}
                initialValue="11"
              >
                <Select>
                  <Option value="9">Android 9</Option>
                  <Option value="10">Android 10</Option>
                  <Option value="11">Android 11</Option>
                  <Option value="12">Android 12</Option>
                  <Option value="13">Android 13</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="CPU 核心数"
                name="cpuCores"
                rules={[{ required: true, message: '请输入 CPU 核心数' }]}
                initialValue={2}
              >
                <InputNumber min={1} max={8} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="内存 (MB)"
                name="memoryMB"
                rules={[{ required: true, message: '请输入内存大小' }]}
                initialValue={2048}
              >
                <InputNumber min={512} max={16384} step={512} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="存储 (MB)"
                name="storageMB"
                rules={[{ required: true, message: '请输入存储大小' }]}
                initialValue={8192}
              >
                <InputNumber min={1024} max={102400} step={1024} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="输入标签后按回车添加" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑模板模态框 */}
      <Modal
        title="编辑模板"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedTemplate(null);
        }}
        onOk={() => editForm.submit()}
      >
        <Form form={editForm} onFinish={handleEdit} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item label="模板描述" name="description">
            <TextArea rows={3} placeholder="请输入模板描述" />
          </Form.Item>
          <Form.Item label="分类" name="category">
            <Select placeholder="请选择分类">
              <Option value="开发测试">开发测试</Option>
              <Option value="游戏">游戏</Option>
              <Option value="社交">社交</Option>
              <Option value="办公">办公</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item label="可见性" name="isPublic">
            <Select>
              <Option value={true}>公开（所有用户可见）</Option>
              <Option value={false}>私有（仅自己可见）</Option>
            </Select>
          </Form.Item>
          <Form.Item label="标签" name="tags">
            <Select mode="tags" placeholder="输入标签后按回车添加" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建设备模态框 */}
      <Modal
        title={`从模板创建设备: ${selectedTemplate?.name}`}
        open={createDeviceModalVisible}
        onCancel={() => {
          setCreateDeviceModalVisible(false);
          createDeviceForm.resetFields();
          setSelectedTemplate(null);
        }}
        onOk={() => createDeviceForm.submit()}
      >
        <Form form={createDeviceForm} onFinish={handleCreateDevice} layout="vertical">
          <Form.Item label="设备名称" name="name">
            <Input placeholder="留空将自动生成" />
          </Form.Item>
          <Form.Item
            label="分配给用户"
            name="userId"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select
              showSearch
              placeholder="请选择用户"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users.map((user) => ({
                label: `${user.username} (${user.email})`,
                value: user.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量创建设备模态框 */}
      <Modal
        title={`批量创建设备: ${selectedTemplate?.name}`}
        open={batchCreateModalVisible}
        onCancel={() => {
          setBatchCreateModalVisible(false);
          batchCreateForm.resetFields();
          setSelectedTemplate(null);
        }}
        onOk={() => batchCreateForm.submit()}
      >
        <Form form={batchCreateForm} onFinish={handleBatchCreate} layout="vertical">
          <Form.Item
            label="创建数量"
            name="count"
            rules={[{ required: true, message: '请输入创建数量' }]}
            initialValue={5}
          >
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="分配给用户"
            name="userId"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <Select
              showSearch
              placeholder="请选择用户"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users.map((user) => ({
                label: `${user.username} (${user.email})`,
                value: user.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="设备名称前缀" name="name">
            <Input placeholder="留空将使用模板名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TemplateList;
