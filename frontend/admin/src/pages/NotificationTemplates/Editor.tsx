import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Tag,
  Tabs,
  Divider,
  Alert,
  Popconfirm,
  Drawer,
  Timeline,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  EyeOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  toggleNotificationTemplate,
  testNotificationTemplate,
  getTemplateVersions,
  revertTemplateVersion,
  getAvailableVariables,
  previewTemplate,
} from '@/services/notificationTemplate';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  NotificationTemplateVersion,
  PaginationParams,
} from '@/types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const NotificationTemplateEditor = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [testVisible, setTestVisible] = useState(false);
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [versions, setVersions] = useState<NotificationTemplateVersion[]>([]);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [previewContent, setPreviewContent] = useState('');
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);

  const [form] = Form.useForm();
  const [testForm] = Form.useForm();
  const [previewForm] = Form.useForm();

  // 加载模板列表
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params: PaginationParams & { type?: string; isActive?: boolean } = {
        page,
        pageSize,
      };
      if (filterType) params.type = filterType;
      if (filterActive !== undefined) params.isActive = filterActive;

      const res = await getNotificationTemplates(params);
      setTemplates(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载可用变量
  const loadVariables = async (type?: string) => {
    try {
      const vars = await getAvailableVariables(type);
      setAvailableVariables(vars);
    } catch (error) {
      console.error('加载变量失败', error);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [page, pageSize, filterType, filterActive]);

  useEffect(() => {
    loadVariables();
  }, []);

  // 打开创建/编辑模态框
  const openModal = (template?: NotificationTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        type: template.type,
        subject: template.subject,
        content: template.content,
        contentType: template.contentType,
        isActive: template.isActive,
        language: template.language,
        category: template.category,
      });
      loadVariables(template.type);
    } else {
      setEditingTemplate(null);
      form.resetFields();
      form.setFieldsValue({ contentType: 'plain', language: 'zh-CN', isActive: true });
    }
    setModalVisible(true);
  };

  // 处理创建/更新
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingTemplate) {
        const data: UpdateNotificationTemplateDto = {
          name: values.name,
          description: values.description,
          subject: values.subject,
          content: values.content,
          contentType: values.contentType,
          isActive: values.isActive,
          category: values.category,
        };
        await updateNotificationTemplate(editingTemplate.id, data);
        message.success('模板更新成功');
      } else {
        const data: CreateNotificationTemplateDto = {
          name: values.name,
          description: values.description,
          type: values.type,
          subject: values.subject,
          content: values.content,
          contentType: values.contentType,
          isActive: values.isActive,
          language: values.language,
          category: values.category,
        };
        await createNotificationTemplate(data);
        message.success('模板创建成功');
      }

      setModalVisible(false);
      loadTemplates();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
    }
  };

  // 删除模板
  const handleDelete = async (id: string) => {
    try {
      await deleteNotificationTemplate(id);
      message.success('模板删除成功');
      loadTemplates();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 切换激活状态
  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggleNotificationTemplate(id, isActive);
      message.success(`模板已${isActive ? '激活' : '停用'}`);
      loadTemplates();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 打开预览
  const openPreview = async (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setPreviewVisible(true);
    previewForm.resetFields();
  };

  // 预览渲染
  const handlePreview = async () => {
    try {
      const values = previewForm.getFieldsValue();
      const variables: Record<string, any> = {};

      selectedTemplate?.variables.forEach((varName) => {
        if (values[varName]) {
          variables[varName] = values[varName];
        }
      });

      const result = await previewTemplate(selectedTemplate!.id, variables);
      setPreviewContent(result.rendered || result.content);
      message.success('预览生成成功');
    } catch (error) {
      message.error('预览失败');
    }
  };

  // 打开测试发送
  const openTest = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setTestVisible(true);
    testForm.resetFields();
  };

  // 测试发送
  const handleTest = async () => {
    try {
      const values = await testForm.validateFields();
      const variables: Record<string, any> = {};

      selectedTemplate?.variables.forEach((varName) => {
        if (values[varName]) {
          variables[varName] = values[varName];
        }
      });

      await testNotificationTemplate({
        templateId: selectedTemplate!.id,
        recipient: values.recipient,
        variables,
      });
      message.success('测试消息已发送');
      setTestVisible(false);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('发送失败');
    }
  };

  // 打开版本历史
  const openVersionHistory = async (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setVersionDrawerVisible(true);
    try {
      const versionList = await getTemplateVersions(template.id);
      setVersions(versionList);
    } catch (error) {
      message.error('加载版本历史失败');
    }
  };

  // 回滚版本
  const handleRevert = async (versionId: string) => {
    try {
      await revertTemplateVersion(selectedTemplate!.id, versionId);
      message.success('版本回滚成功');
      setVersionDrawerVisible(false);
      loadTemplates();
    } catch (error) {
      message.error('回滚失败');
    }
  };

  // 插入变量到内容
  const insertVariable = (varName: string) => {
    const content = form.getFieldValue('content') || '';
    const newContent = content + `{{${varName}}}`;
    form.setFieldsValue({ content: newContent });
  };

  const getTypeTag = (type: string) => {
    const map: Record<string, { color: string; text: string }> = {
      email: { color: 'blue', text: '邮件' },
      sms: { color: 'green', text: '短信' },
      websocket: { color: 'orange', text: '站内' },
    };
    const config = map[type] || map.email;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getContentTypeTag = (type: string) => {
    const map: Record<string, { color: string; text: string }> = {
      plain: { color: 'default', text: '纯文本' },
      html: { color: 'blue', text: 'HTML' },
      markdown: { color: 'green', text: 'Markdown' },
    };
    const config = map[type] || map.plain;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<NotificationTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <strong>{name}</strong>
          {record.description && (
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => getTypeTag(type),
    },
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 120,
      render: (type) => getContentTypeTag(type),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat) => cat || '-',
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 100,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center',
      render: (ver) => <Badge count={`v${ver}`} style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
          onChange={(checked) => handleToggle(record.id, checked)}
        />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (time) => dayjs(time).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openPreview(record)}
          >
            预览
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            onClick={() => openTest(record)}
          >
            测试
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => openVersionHistory(record)}
          >
            历史
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除此模板？" onConfirm={() => handleDelete(record.id)}>
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
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Select
              placeholder="筛选类型"
              style={{ width: 120 }}
              allowClear
              value={filterType}
              onChange={setFilterType}
            >
              <Option value="email">邮件</Option>
              <Option value="sms">短信</Option>
              <Option value="websocket">站内</Option>
            </Select>
            <Select
              placeholder="筛选状态"
              style={{ width: 120 }}
              allowClear
              value={filterActive}
              onChange={setFilterActive}
            >
              <Option value={true}>已激活</Option>
              <Option value={false}>已停用</Option>
            </Select>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新建模板
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize || 10);
            },
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 创建/编辑模态框 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '创建模板'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={900}
        destroyOnClose
      >
        <Alert
          message="使用 {{variableName}} 语法插入变量"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="模板名称"
                name="name"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="例如: 设备创建成功通知" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="分类" name="category">
                <Input placeholder="例如: 设备通知" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="模板说明" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="通知类型"
                name="type"
                rules={[{ required: !editingTemplate, message: '请选择类型' }]}
              >
                <Select
                  placeholder="选择类型"
                  disabled={!!editingTemplate}
                  onChange={(val) => loadVariables(val)}
                >
                  <Option value="email">邮件</Option>
                  <Option value="sms">短信</Option>
                  <Option value="websocket">站内通知</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="内容类型" name="contentType">
                <Select>
                  <Option value="plain">纯文本</Option>
                  <Option value="html">HTML</Option>
                  <Option value="markdown">Markdown</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="语言" name="language">
                <Select>
                  <Option value="zh-CN">简体中文</Option>
                  <Option value="en-US">English</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'email' && (
                <Form.Item label="邮件主题" name="subject">
                  <Input placeholder="例如: 您的设备已创建成功" />
                </Form.Item>
              )
            }
          </Form.Item>

          {availableVariables.length > 0 && (
            <>
              <Divider>可用变量</Divider>
              <Space wrap style={{ marginBottom: '16px' }}>
                {availableVariables.map((varName) => (
                  <Button
                    key={varName}
                    size="small"
                    icon={<CodeOutlined />}
                    onClick={() => insertVariable(varName)}
                  >
                    {varName}
                  </Button>
                ))}
              </Space>
            </>
          )}

          <Form.Item
            label="模板内容"
            name="content"
            rules={[{ required: true, message: '请输入模板内容' }]}
          >
            <TextArea
              rows={10}
              placeholder="输入模板内容，使用 {{variableName}} 插入变量"
            />
          </Form.Item>

          <Form.Item label="激活模板" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        title={`预览: ${selectedTemplate?.name}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={previewForm} layout="vertical">
          {selectedTemplate?.variables.map((varName) => (
            <Form.Item key={varName} label={varName} name={varName}>
              <Input placeholder={`输入 ${varName} 的值`} />
            </Form.Item>
          ))}
          <Button type="primary" onClick={handlePreview} style={{ marginBottom: '16px' }}>
            生成预览
          </Button>
        </Form>

        {previewContent && (
          <Card size="small" title="预览结果">
            <div
              dangerouslySetInnerHTML={
                selectedTemplate?.contentType === 'html'
                  ? { __html: previewContent }
                  : undefined
              }
            >
              {selectedTemplate?.contentType !== 'html' && previewContent}
            </div>
          </Card>
        )}
      </Modal>

      {/* 测试发送模态框 */}
      <Modal
        title={`测试发送: ${selectedTemplate?.name}`}
        open={testVisible}
        onCancel={() => setTestVisible(false)}
        onOk={handleTest}
      >
        <Form form={testForm} layout="vertical">
          <Form.Item
            label={selectedTemplate?.type === 'email' ? '收件人邮箱' : selectedTemplate?.type === 'sms' ? '手机号' : '用户ID'}
            name="recipient"
            rules={[{ required: true, message: '请输入接收方' }]}
          >
            <Input placeholder="输入测试接收方" />
          </Form.Item>

          <Divider>变量值</Divider>

          {selectedTemplate?.variables.map((varName) => (
            <Form.Item key={varName} label={varName} name={varName}>
              <Input placeholder={`输入 ${varName} 的测试值`} />
            </Form.Item>
          ))}
        </Form>
      </Modal>

      {/* 版本历史抽屉 */}
      <Drawer
        title={`版本历史: ${selectedTemplate?.name}`}
        open={versionDrawerVisible}
        onClose={() => setVersionDrawerVisible(false)}
        width={600}
      >
        <Timeline>
          {versions.map((version) => (
            <Timeline.Item key={version.id} color={version.version === selectedTemplate?.version ? 'green' : 'blue'}>
              <div>
                <Space>
                  <strong>v{version.version}</strong>
                  {version.version === selectedTemplate?.version && <Tag color="green">当前版本</Tag>}
                </Space>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                  {dayjs(version.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  {version.createdBy && ` · ${version.createdBy}`}
                </div>
                {version.changeNote && (
                  <div style={{ marginTop: '4px' }}>{version.changeNote}</div>
                )}
                {version.version !== selectedTemplate?.version && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleRevert(version.id)}
                    style={{ marginTop: '8px', padding: 0 }}
                  >
                    回滚到此版本
                  </Button>
                )}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Drawer>
    </div>
  );
};

export default NotificationTemplateEditor;
