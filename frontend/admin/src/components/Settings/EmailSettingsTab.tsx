import { memo } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Switch,
  Select,
  Space,
  Divider,
  Alert,
  Row,
  Col,
} from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

interface EmailSettingsTabProps {
  form: FormInstance;
  loading: boolean;
  testLoading: boolean;
  onFinish: (values: any) => void;
  onTest: () => void;
}

export const EmailSettingsTab = memo<EmailSettingsTabProps>(
  ({ form, loading, testLoading, onFinish, onTest }) => {
    return (
      <Card>
        <Alert
          message="邮件服务配置"
          description="配置 SMTP 服务用于发送系统通知邮件、验证码等"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="启用邮件服务"
            name="emailEnabled"
            valuePropName="checked"
            initialValue={false}
            extra="关闭后系统将不会发送任何邮件通知"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Divider>SMTP 服务器配置</Divider>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="SMTP服务器"
                name="smtpHost"
                rules={[{ required: true, message: '请输入SMTP服务器地址' }]}
              >
                <Input placeholder="smtp.example.com" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="SMTP端口"
                name="smtpPort"
                initialValue={587}
                rules={[{ required: true, message: '请输入SMTP端口' }]}
              >
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="加密方式"
            name="smtpSecure"
            initialValue="tls"
            extra="TLS: 端口587 | SSL: 端口465 | NONE: 端口25"
          >
            <Select>
              <Select.Option value="tls">TLS (推荐)</Select.Option>
              <Select.Option value="ssl">SSL</Select.Option>
              <Select.Option value="none">无加密</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="SMTP用户名"
                name="smtpUser"
                rules={[{ required: true, message: '请输入SMTP用户名' }]}
              >
                <Input placeholder="noreply@example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="SMTP密码"
                name="smtpPassword"
                rules={[{ required: true, message: '请输入SMTP密码' }]}
              >
                <Input.Password placeholder="SMTP密码或授权码" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>发件人信息</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="发件人名称"
                name="fromName"
                rules={[{ required: true, message: '请输入发件人名称' }]}
              >
                <Input placeholder="云手机平台" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="发件人邮箱"
                name="fromEmail"
                rules={[
                  { required: true, message: '请输入发件人邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="noreply@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="回复邮箱"
            name="replyToEmail"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            extra="用户回复邮件时的收件地址，留空则使用发件人邮箱"
          >
            <Input placeholder="support@example.com" />
          </Form.Item>

          <Divider>高级选项</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="连接超时(秒)" name="connectionTimeout" initialValue={30}>
                <InputNumber min={5} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="每小时最大发送量"
                name="maxEmailsPerHour"
                initialValue={100}
                extra="防止邮件发送过于频繁"
              >
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
              <Button icon={<SendOutlined />} onClick={onTest} loading={testLoading}>
                发送测试邮件
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    );
  }
);

EmailSettingsTab.displayName = 'EmailSettingsTab';
