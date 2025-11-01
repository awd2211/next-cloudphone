import { memo } from 'react';
import { Card, Form, Input, Button, Switch } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

interface PaymentSettingsTabProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: any) => void;
}

export const PaymentSettingsTab = memo<PaymentSettingsTabProps>(
  ({ form, loading, onFinish }) => {
    return (
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <h3>微信支付</h3>
          <Form.Item
            label="启用微信支付"
            name="wechatEnabled"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item label="微信商户号" name="wechatMchId">
            <Input placeholder="请输入微信商户号" />
          </Form.Item>

          <Form.Item label="微信API密钥" name="wechatApiKey">
            <Input.Password placeholder="请输入微信API密钥" />
          </Form.Item>

          <h3 style={{ marginTop: 24 }}>支付宝</h3>
          <Form.Item
            label="启用支付宝"
            name="alipayEnabled"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item label="支付宝AppID" name="alipayAppId">
            <Input placeholder="请输入支付宝AppID" />
          </Form.Item>

          <Form.Item label="支付宝私钥" name="alipayPrivateKey">
            <Input.TextArea placeholder="请输入支付宝私钥" rows={4} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    );
  }
);

PaymentSettingsTab.displayName = 'PaymentSettingsTab';
