import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { TextArea } = Input;
const { Paragraph, Text } = Typography;

interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  type: string;
  title: string;
  body: string;
  emailTemplate?: string;
  smsTemplate?: string;
  channels: string[];
  language: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const NotificationTemplatesList = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询模板列表
  const { data, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const response = await request.get('/templates', {
        params: {
          limit: 100, // 获取所有模板
        },
      });
      return response.data;
    },
  });

  // 创建模板
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      return await request.post('/templates', values);
    },
    onSuccess: () => {
      message.success('模板创建成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: () => {
      message.error('模板创建失败');
    },
  });

  // 更新模板
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      return await request.patch(`/templates/${id}`, values);
    },
    onSuccess: () => {
      message.success('模板更新成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      setIsModalVisible(false);
      setEditingTemplate(null);
      form.resetFields();
    },
    onError: () => {
      message.error('模板更新失败');
    },
  });

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      message.success('模板删除成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: () => {
      message.error('模板删除失败');
    },
  });

  // 切换激活状态
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.patch(`/templates/${id}/toggle`);
    },
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
    },
    onError: () => {
      message.error('状态更新失败');
    },
  });

  const handleCreate = () => {
    setEditingTemplate(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: NotificationTemplate) => {
    setEditingTemplate(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handlePreview = (record: NotificationTemplate) => {
    setPreviewTemplate(record);
    setPreviewModalVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingTemplate) {
        updateMutation.mutate({ id: editingTemplate.id, values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns = [
    {
      title: '模板代码',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { color: string; label: string }> = {
          system: { color: 'blue', label: '系统通知' },
          user: { color: 'green', label: '用户通知' },
          device: { color: 'orange', label: '设备通知' },
          billing: { color: 'purple', label: '账单通知' },
          app: { color: 'cyan', label: '应用通知' },
        };
        const config = typeMap[type] || { color: 'default', label: type };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '通知渠道',
      dataIndex: 'channels',
      key: 'channels',
      width: 150,
      render: (channels: string[]) => (
        <>
          {channels.map((channel) => {
            const channelMap: Record<string, { color: string; label: string }> = {
              websocket: { color: 'blue', label: 'WebSocket' },
              email: { color: 'green', label: '邮件' },
              sms: { color: 'orange', label: '短信' },
            };
            const config = channelMap[channel] || { color: 'default', label: channel };
            return (
              <Tag key={channel} color={config.color}>
                {config.label}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 80,
      render: (language: string) => <Tag>{language}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) =>
        isActive ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            激活
          </Tag>
        ) : (
          <Tag color="default" icon={<StopOutlined />}>
            停用
          </Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right' as const,
      render: (_: any, record: NotificationTemplate) => (
        <Space size="small">
          <Tooltip title="预览">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? '停用' : '激活'}>
            <Button type="link" size="small" onClick={() => handleToggle(record.id)}>
              {record.isActive ? '停用' : '激活'}
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定删除此模板吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="通知模板管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建模板
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={data || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '创建模板'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTemplate(null);
          form.resetFields();
        }}
        width={800}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="模板代码"
                name="code"
                rules={[{ required: true, message: '请输入模板代码' }]}
              >
                <Input placeholder="例如: USER_REGISTERED" disabled={!!editingTemplate} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="模板名称"
                name="name"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="例如: 用户注册通知" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="通知类型"
                name="type"
                rules={[{ required: true, message: '请选择通知类型' }]}
              >
                <Select placeholder="请选择通知类型">
                  <Select.Option value="system">系统通知</Select.Option>
                  <Select.Option value="user">用户通知</Select.Option>
                  <Select.Option value="device">设备通知</Select.Option>
                  <Select.Option value="billing">账单通知</Select.Option>
                  <Select.Option value="app">应用通知</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="语言"
                name="language"
                initialValue="zh-CN"
                rules={[{ required: true, message: '请选择语言' }]}
              >
                <Select placeholder="请选择语言">
                  <Select.Option value="zh-CN">简体中文</Select.Option>
                  <Select.Option value="en-US">English</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="通知渠道"
            name="channels"
            rules={[{ required: true, message: '请选择至少一个通知渠道' }]}
          >
            <Select mode="multiple" placeholder="请选择通知渠道">
              <Select.Option value="websocket">WebSocket</Select.Option>
              <Select.Option value="email">邮件</Select.Option>
              <Select.Option value="sms">短信</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="支持 Handlebars 模板语法，如: {{username}}" />
          </Form.Item>

          <Form.Item label="内容" name="body" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea
              rows={4}
              placeholder="支持 Handlebars 模板语法，如: 欢迎 {{username}} 加入！"
            />
          </Form.Item>

          <Form.Item label="邮件模板" name="emailTemplate">
            <TextArea rows={4} placeholder="邮件专用 HTML 模板（可选）" />
          </Form.Item>

          <Form.Item label="短信模板" name="smsTemplate">
            <TextArea rows={3} placeholder="短信专用模板（可选）" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="模板用途说明" />
          </Form.Item>

          <Form.Item label="激活状态" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="激活" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        title="模板预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {previewTemplate && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>模板代码：</Text>
                <Paragraph code copyable>
                  {previewTemplate.code}
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>模板名称：</Text>
                <Paragraph>{previewTemplate.name}</Paragraph>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>类型：</Text>
                <div>{previewTemplate.type}</div>
              </Col>
              <Col span={12}>
                <Text strong>语言：</Text>
                <div>{previewTemplate.language}</div>
              </Col>
            </Row>

            <div style={{ marginTop: 16 }}>
              <Text strong>通知渠道：</Text>
              <div style={{ marginTop: 8 }}>
                {previewTemplate.channels.map((channel) => (
                  <Tag key={channel}>{channel}</Tag>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>标题：</Text>
              <Paragraph>{previewTemplate.title}</Paragraph>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>内容：</Text>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{previewTemplate.body}</Paragraph>
            </div>

            {previewTemplate.emailTemplate && (
              <div style={{ marginTop: 16 }}>
                <Text strong>邮件模板：</Text>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {previewTemplate.emailTemplate}
                </Paragraph>
              </div>
            )}

            {previewTemplate.smsTemplate && (
              <div style={{ marginTop: 16 }}>
                <Text strong>短信模板：</Text>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {previewTemplate.smsTemplate}
                </Paragraph>
              </div>
            )}

            {previewTemplate.description && (
              <div style={{ marginTop: 16 }}>
                <Text strong>描述：</Text>
                <Paragraph>{previewTemplate.description}</Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default NotificationTemplatesList;
