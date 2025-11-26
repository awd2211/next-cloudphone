import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Form,
  Input,
  Select,
  Tag,
  Popconfirm,
  Empty,
  Divider,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  WifiOutlined,
  UsbOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  MobileOutlined,
  SaveOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

/**
 * 连接方式
 */
type ConnectionType = 'network' | 'usb';

/**
 * 设备模板接口
 */
export interface DeviceTemplate {
  id: string;
  name: string;
  description?: string;
  icon: 'phone' | 'tablet' | 'tv' | 'custom';
  connectionType: ConnectionType;
  ipPrefix?: string; // IP 前缀，如 192.168.1.
  adbPort?: number;
  defaultTags?: string[];
  isDefault?: boolean; // 是否为默认模板
  isSystem?: boolean; // 是否为系统预设
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 系统预设模板
 */
const SYSTEM_TEMPLATES: DeviceTemplate[] = [
  {
    id: 'system-phone-network',
    name: '手机 (网络)',
    description: '通过 Wi-Fi 网络连接的 Android 手机',
    icon: 'phone',
    connectionType: 'network',
    adbPort: 5555,
    defaultTags: ['手机', '网络'],
    isSystem: true,
  },
  {
    id: 'system-phone-usb',
    name: '手机 (USB)',
    description: '通过 USB 数据线直连的 Android 手机',
    icon: 'phone',
    connectionType: 'usb',
    defaultTags: ['手机', 'USB'],
    isSystem: true,
  },
  {
    id: 'system-tablet',
    name: '平板电脑',
    description: 'Android 平板电脑设备',
    icon: 'tablet',
    connectionType: 'network',
    adbPort: 5555,
    defaultTags: ['平板'],
    isSystem: true,
  },
  {
    id: 'system-tv-box',
    name: '电视盒子',
    description: 'Android TV 或智能盒子',
    icon: 'tv',
    connectionType: 'network',
    adbPort: 5555,
    defaultTags: ['盒子', 'TV'],
    isSystem: true,
  },
];

/**
 * 获取图标组件
 */
const getIconComponent = (icon: string, style?: React.CSSProperties) => {
  const iconStyle = { fontSize: '24px', ...style };
  switch (icon) {
    case 'phone':
      return <MobileOutlined style={{ ...iconStyle, color: '#1890ff' }} />;
    case 'tablet':
      return <DesktopOutlined style={{ ...iconStyle, color: '#722ed1' }} />;
    case 'tv':
      return <ThunderboltOutlined style={{ ...iconStyle, color: '#fa8c16' }} />;
    default:
      return <DesktopOutlined style={{ ...iconStyle, color: '#8c8c8c' }} />;
  }
};

interface DeviceTemplateManagerProps {
  visible: boolean;
  onCancel: () => void;
  onSelectTemplate?: (template: DeviceTemplate) => void;
  selectionMode?: boolean; // 是否为选择模式
}

/**
 * 设备模板管理组件
 *
 * 功能：
 * 1. 查看系统预设模板
 * 2. 创建自定义模板
 * 3. 编辑/删除自定义模板
 * 4. 设置默认模板
 * 5. 快速应用模板
 */
export const DeviceTemplateManager = memo<DeviceTemplateManagerProps>(
  ({ visible, onCancel, onSelectTemplate, selectionMode = false }) => {
    // 自定义模板（实际应该从 API 或 localStorage 获取）
    const [customTemplates, setCustomTemplates] = useState<DeviceTemplate[]>(() => {
      const saved = localStorage.getItem('device-templates');
      return saved ? JSON.parse(saved) : [];
    });
    const [editingTemplate, setEditingTemplate] = useState<DeviceTemplate | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [form] = Form.useForm();
    const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(() => {
      return localStorage.getItem('default-device-template');
    });

    // 保存模板到 localStorage
    const saveTemplates = useCallback((templates: DeviceTemplate[]) => {
      localStorage.setItem('device-templates', JSON.stringify(templates));
      setCustomTemplates(templates);
    }, []);

    // 所有模板
    const allTemplates = useMemo(() => {
      return [...SYSTEM_TEMPLATES, ...customTemplates];
    }, [customTemplates]);

    // 打开创建/编辑模态框
    const handleOpenEditModal = useCallback(
      (template?: DeviceTemplate) => {
        if (template) {
          setEditingTemplate(template);
          form.setFieldsValue({
            ...template,
            defaultTags: template.defaultTags || [],
          });
        } else {
          setEditingTemplate(null);
          form.resetFields();
          form.setFieldsValue({
            icon: 'custom',
            connectionType: 'network',
            adbPort: 5555,
          });
        }
        setShowEditModal(true);
      },
      [form]
    );

    // 关闭编辑模态框
    const handleCloseEditModal = useCallback(() => {
      setShowEditModal(false);
      setEditingTemplate(null);
      form.resetFields();
    }, [form]);

    // 保存模板
    const handleSaveTemplate = useCallback(async () => {
      try {
        const values = await form.validateFields();

        const template: DeviceTemplate = {
          id: editingTemplate?.id || `custom-${Date.now()}`,
          name: values.name,
          description: values.description,
          icon: values.icon,
          connectionType: values.connectionType,
          ipPrefix: values.ipPrefix,
          adbPort: values.adbPort,
          defaultTags: values.defaultTags,
          isSystem: false,
          createdAt: editingTemplate?.createdAt || new Date(),
          updatedAt: new Date(),
        };

        const newTemplates = editingTemplate
          ? customTemplates.map((t) => (t.id === template.id ? template : t))
          : [...customTemplates, template];

        saveTemplates(newTemplates);
        message.success(editingTemplate ? '模板更新成功' : '模板创建成功');
        handleCloseEditModal();
      } catch (error) {
        // 表单验证失败
      }
    }, [form, editingTemplate, customTemplates, saveTemplates, handleCloseEditModal]);

    // 删除模板
    const handleDeleteTemplate = useCallback(
      (templateId: string) => {
        const newTemplates = customTemplates.filter((t) => t.id !== templateId);
        saveTemplates(newTemplates);

        if (defaultTemplateId === templateId) {
          localStorage.removeItem('default-device-template');
          setDefaultTemplateId(null);
        }

        message.success('模板已删除');
      },
      [customTemplates, saveTemplates, defaultTemplateId]
    );

    // 复制模板
    const handleDuplicateTemplate = useCallback(
      (template: DeviceTemplate) => {
        const newTemplate: DeviceTemplate = {
          ...template,
          id: `custom-${Date.now()}`,
          name: `${template.name} (副本)`,
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        saveTemplates([...customTemplates, newTemplate]);
        message.success('模板已复制');
      },
      [customTemplates, saveTemplates]
    );

    // 设置默认模板
    const handleSetDefault = useCallback(
      (templateId: string) => {
        if (defaultTemplateId === templateId) {
          localStorage.removeItem('default-device-template');
          setDefaultTemplateId(null);
          message.info('已取消默认模板');
        } else {
          localStorage.setItem('default-device-template', templateId);
          setDefaultTemplateId(templateId);
          message.success('已设置为默认模板');
        }
      },
      [defaultTemplateId]
    );

    // 选择模板（选择模式）
    const handleSelectTemplate = useCallback(
      (template: DeviceTemplate) => {
        if (selectionMode && onSelectTemplate) {
          onSelectTemplate(template);
          onCancel();
        }
      },
      [selectionMode, onSelectTemplate, onCancel]
    );

    // 渲染模板卡片
    const renderTemplateCard = (template: DeviceTemplate) => {
      const isDefault = defaultTemplateId === template.id;

      return (
        <Col xs={24} sm={12} md={8} key={template.id}>
          <Badge.Ribbon
            text="默认"
            color="gold"
            style={{ display: isDefault ? 'block' : 'none' }}
          >
            <Card
              hoverable
              style={{
                height: '100%',
                cursor: selectionMode ? 'pointer' : 'default',
                borderColor: isDefault ? '#faad14' : undefined,
              }}
              onClick={() => selectionMode && handleSelectTemplate(template)}
              actions={
                selectionMode
                  ? [
                      <Button type="link" onClick={() => handleSelectTemplate(template)}>
                        使用此模板
                      </Button>,
                    ]
                  : [
                      <Tooltip title="设为默认">
                        <Button
                          type="text"
                          icon={isDefault ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                          onClick={() => handleSetDefault(template.id)}
                        />
                      </Tooltip>,
                      ...(template.isSystem
                        ? [
                            <Tooltip title="复制">
                              <Button
                                type="text"
                                icon={<CopyOutlined />}
                                onClick={() => handleDuplicateTemplate(template)}
                              />
                            </Tooltip>,
                          ]
                        : [
                            <Tooltip title="编辑">
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                onClick={() => handleOpenEditModal(template)}
                              />
                            </Tooltip>,
                            <Popconfirm
                              title="确定删除此模板？"
                              onConfirm={() => handleDeleteTemplate(template.id)}
                              okText="删除"
                              cancelText="取消"
                            >
                              <Tooltip title="删除">
                                <Button type="text" danger icon={<DeleteOutlined />} />
                              </Tooltip>
                            </Popconfirm>,
                          ]),
                    ]
              }
            >
              <Card.Meta
                avatar={getIconComponent(template.icon)}
                title={
                  <Space>
                    {template.name}
                    {template.isSystem && (
                      <Tag color="blue" style={{ marginLeft: '8px' }}>
                        系统预设
                      </Tag>
                    )}
                  </Space>
                }
                description={
                  <div>
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: '8px', minHeight: '44px' }}
                    >
                      {template.description || '暂无描述'}
                    </Paragraph>
                    <Space size={[0, 4]} wrap>
                      <Tag
                        color={template.connectionType === 'network' ? 'blue' : 'green'}
                        icon={
                          template.connectionType === 'network' ? (
                            <WifiOutlined />
                          ) : (
                            <UsbOutlined />
                          )
                        }
                      >
                        {template.connectionType === 'network' ? '网络' : 'USB'}
                      </Tag>
                      {template.connectionType === 'network' && template.adbPort && (
                        <Tag>端口: {template.adbPort}</Tag>
                      )}
                      {template.defaultTags?.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                }
              />
            </Card>
          </Badge.Ribbon>
        </Col>
      );
    };

    // 渲染编辑模态框
    const renderEditModal = () => (
      <Modal
        title={editingTemplate ? '编辑模板' : '创建模板'}
        open={showEditModal}
        onCancel={handleCloseEditModal}
        onOk={handleSaveTemplate}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="模板名称"
                name="name"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="例如: 开发测试机" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="图标"
                name="icon"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="phone">
                    <Space>
                      <MobileOutlined /> 手机
                    </Space>
                  </Option>
                  <Option value="tablet">
                    <Space>
                      <DesktopOutlined /> 平板
                    </Space>
                  </Option>
                  <Option value="tv">
                    <Space>
                      <ThunderboltOutlined /> 盒子
                    </Space>
                  </Option>
                  <Option value="custom">
                    <Space>
                      <DesktopOutlined /> 其他
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="描述" name="description">
            <Input.TextArea placeholder="描述此模板的用途" rows={2} />
          </Form.Item>

          <Divider orientation="left">连接设置</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="连接方式"
                name="connectionType"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="network">
                    <Space>
                      <WifiOutlined /> 网络 ADB
                    </Space>
                  </Option>
                  <Option value="usb">
                    <Space>
                      <UsbOutlined /> USB 直连
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>

            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.connectionType !== curr.connectionType}
            >
              {({ getFieldValue }) =>
                getFieldValue('connectionType') === 'network' && (
                  <>
                    <Col span={8}>
                      <Form.Item
                        label="IP 前缀"
                        name="ipPrefix"
                        tooltip="自动填充 IP 地址前缀"
                      >
                        <Input placeholder="192.168.1." />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="默认端口" name="adbPort">
                        <Input type="number" placeholder="5555" />
                      </Form.Item>
                    </Col>
                  </>
                )
              }
            </Form.Item>
          </Row>

          <Divider orientation="left">标签设置</Divider>

          <Form.Item label="默认标签" name="defaultTags">
            <Select mode="tags" placeholder="添加默认标签">
              <Option value="生产">生产</Option>
              <Option value="测试">测试</Option>
              <Option value="开发">开发</Option>
              <Option value="预发布">预发布</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    );

    return (
      <>
        <Modal
          title={
            <Space>
              <DesktopOutlined />
              {selectionMode ? '选择设备模板' : '设备模板管理'}
            </Space>
          }
          open={visible}
          onCancel={onCancel}
          width={900}
          footer={
            selectionMode ? (
              <Button onClick={onCancel}>取消</Button>
            ) : (
              <Space>
                <Button onClick={onCancel}>关闭</Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenEditModal()}
                >
                  创建模板
                </Button>
              </Space>
            )
          }
        >
          {/* 系统预设模板 */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={5} style={{ marginBottom: '12px' }}>
              系统预设
            </Title>
            <Row gutter={[16, 16]}>
              {SYSTEM_TEMPLATES.map(renderTemplateCard)}
            </Row>
          </div>

          <Divider />

          {/* 自定义模板 */}
          <div>
            <Space style={{ marginBottom: '12px' }}>
              <Title level={5} style={{ margin: 0 }}>
                自定义模板
              </Title>
              <Tag>{customTemplates.length} 个</Tag>
            </Space>

            {customTemplates.length === 0 ? (
              <Empty
                description="暂无自定义模板"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                {!selectionMode && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handleOpenEditModal()}
                  >
                    创建第一个模板
                  </Button>
                )}
              </Empty>
            ) : (
              <Row gutter={[16, 16]}>
                {customTemplates.map(renderTemplateCard)}
              </Row>
            )}
          </div>
        </Modal>

        {renderEditModal()}
      </>
    );
  }
);

DeviceTemplateManager.displayName = 'DeviceTemplateManager';

export default DeviceTemplateManager;
