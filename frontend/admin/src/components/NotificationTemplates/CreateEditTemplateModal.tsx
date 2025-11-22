import { memo } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, type FormInstance } from 'antd';
import type { NotificationTemplate } from './TemplateActions';

const { TextArea } = Input;

interface CreateEditTemplateModalProps {
  visible: boolean;
  editingTemplate: NotificationTemplate | null;
  form: FormInstance;
  isLoading: boolean;
  onOk: () => void;
  onCancel: () => void;
}

export const CreateEditTemplateModal = memo<CreateEditTemplateModalProps>(
  ({ visible, editingTemplate, form, isLoading, onOk, onCancel }) => {
    return (
      <Modal
        title={editingTemplate ? '编辑模板' : '创建模板'}
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        width={800}
        confirmLoading={isLoading}
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

          <Form.Item
            label="内容格式"
            name="contentFormat"
            initialValue="plain"
            tooltip="Markdown 格式支持标题、列表、链接等富文本；邮件发送时会自动转换为 HTML"
          >
            <Select placeholder="请选择内容格式">
              <Select.Option value="plain">纯文本</Select.Option>
              <Select.Option value="html">HTML</Select.Option>
              <Select.Option value="markdown">Markdown</Select.Option>
            </Select>
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
    );
  }
);

CreateEditTemplateModal.displayName = 'CreateEditTemplateModal';
