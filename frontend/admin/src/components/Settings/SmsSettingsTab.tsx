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
import { SaveOutlined, SendOutlined, WarningOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

interface SmsSettingsTabProps {
  form: FormInstance;
  loading: boolean;
  testLoading: boolean;
  selectedProvider: string;
  onFinish: (values: any) => void;
  onTest: () => void;
  onProviderChange: (value: string) => void;
}

export const SmsSettingsTab = memo<SmsSettingsTabProps>(
  ({ form, loading, testLoading, selectedProvider, onFinish, onTest, onProviderChange }) => {
    return (
      <Card>
        <Alert
          message="短信服务配置"
          description="配置短信服务商用于发送验证码、通知等短信"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="启用短信服务"
            name="smsEnabled"
            valuePropName="checked"
            initialValue={false}
            extra="关闭后系统将不会发送任何短信通知"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Divider>短信服务商配置</Divider>

          <Form.Item
            label="短信服务商"
            name="smsProvider"
            rules={[{ required: true, message: '请选择短信服务商' }]}
            extra="不同服务商的配置参数可能有所不同"
          >
            <Select placeholder="请选择短信服务商" onChange={onProviderChange}>
              <Select.Option value="aliyun">阿里云短信 (推荐)</Select.Option>
              <Select.Option value="tencent">腾讯云短信</Select.Option>
              <Select.Option value="huawei">华为云短信</Select.Option>
              <Select.Option value="qiniu">七牛云短信</Select.Option>
              <Select.Option value="yunpian">云片短信</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="AccessKey ID"
                name="smsAccessKeyId"
                rules={[{ required: true, message: '请输入AccessKey ID' }]}
                extra="从服务商控制台获取"
              >
                <Input placeholder="请输入AccessKey ID" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="AccessKey Secret"
                name="smsAccessKeySecret"
                rules={[{ required: true, message: '请输入AccessKey Secret' }]}
                extra="从服务商控制台获取"
              >
                <Input.Password placeholder="请输入AccessKey Secret" />
              </Form.Item>
            </Col>
          </Row>

          {selectedProvider === 'aliyun' && (
            <Form.Item
              label="Endpoint (可选)"
              name="smsEndpoint"
              extra="阿里云短信接口地址，默认为 dysmsapi.aliyuncs.com"
            >
              <Input placeholder="dysmsapi.aliyuncs.com" />
            </Form.Item>
          )}

          {selectedProvider === 'tencent' && (
            <>
              <Form.Item
                label="SDK AppID"
                name="smsSdkAppId"
                rules={[{ required: true, message: '请输入SDK AppID' }]}
                extra="腾讯云短信 SDK AppID"
              >
                <Input placeholder="请输入SDK AppID" />
              </Form.Item>
              <Form.Item
                label="Region"
                name="smsRegion"
                initialValue="ap-guangzhou"
                extra="腾讯云服务地域"
              >
                <Select>
                  <Select.Option value="ap-guangzhou">华南 (广州)</Select.Option>
                  <Select.Option value="ap-beijing">华北 (北京)</Select.Option>
                  <Select.Option value="ap-shanghai">华东 (上海)</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}

          <Divider>短信签名与模板</Divider>

          <Form.Item
            label="短信签名"
            name="smsSignName"
            rules={[{ required: true, message: '请输入短信签名' }]}
            extra="短信签名需要在服务商平台审核通过后方可使用"
          >
            <Input placeholder="云手机平台" />
          </Form.Item>

          <Alert
            message="短信模板配置"
            description="短信模板请前往【系统管理 → 通知模板】进行配置和管理"
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
            action={
              <Button
                size="small"
                type="link"
                onClick={() => window.open('/notifications/templates', '_blank')}
              >
                前往配置
              </Button>
            }
          />

          <Divider>高级选项</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="请求超时(秒)"
                name="smsTimeout"
                initialValue={30}
                extra="短信API请求超时时间"
              >
                <InputNumber min={5} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="每小时最大发送量"
                name="maxSmsPerHour"
                initialValue={100}
                extra="防止短信发送过于频繁"
              >
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="同一手机号发送间隔(秒)"
                name="smsInterval"
                initialValue={60}
                extra="防止同一手机号频繁收到短信"
              >
                <InputNumber min={30} max={600} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="验证码有效期(分钟)"
                name="codeExpiry"
                initialValue={5}
                extra="短信验证码的有效时长"
              >
                <InputNumber min={1} max={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="启用黑名单"
            name="enableBlacklist"
            valuePropName="checked"
            initialValue={true}
            extra="启用后，黑名单中的手机号将无法接收短信"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
              <Button icon={<SendOutlined />} onClick={onTest} loading={testLoading}>
                发送测试短信
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    );
  }
);

SmsSettingsTab.displayName = 'SmsSettingsTab';
