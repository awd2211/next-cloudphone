import { memo } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, Alert, Divider, Space, Button } from 'antd';
import { CodeOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { NotificationTemplate } from '@/types';
import { insertVariableToContent } from './templateUtils';

const { Option } = Select;
const { TextArea } = Input;

interface TemplateFormModalProps {
  visible: boolean;
  editingTemplate: NotificationTemplate | null;
  form: FormInstance;
  availableVariables: string[];
  onOk: () => void;
  onCancel: () => void;
  onTypeChange: (type: string) => void;
}

export const TemplateFormModal = memo<TemplateFormModalProps>(
  ({ visible, editingTemplate, form, availableVariables, onOk, onCancel, onTypeChange }) => {
    const insertVariable = (varName: string) => {
      insertVariableToContent(form, varName);
    };

    return (
      <Modal
        title={editingTemplate ? '编辑模板' : '创建模板'}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
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
                  onChange={onTypeChange}
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
            <TextArea rows={10} placeholder="输入模板内容，使用 {{variableName}} 插入变量" />
          </Form.Item>

          <Form.Item label="激活模板" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

TemplateFormModal.displayName = 'TemplateFormModal';
