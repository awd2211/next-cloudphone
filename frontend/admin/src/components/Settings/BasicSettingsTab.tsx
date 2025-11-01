import { memo } from 'react';
import { Card, Form, Input, Button } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

interface BasicSettingsTabProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: any) => void;
}

export const BasicSettingsTab = memo<BasicSettingsTabProps>(({ form, loading, onFinish }) => {
  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="网站名称"
          name="siteName"
          rules={[{ required: true, message: '请输入网站名称' }]}
        >
          <Input placeholder="请输入网站名称" />
        </Form.Item>

        <Form.Item
          label="网站URL"
          name="siteUrl"
          rules={[
            { required: true, message: '请输入网站URL' },
            { type: 'url', message: '请输入有效的URL' },
          ]}
        >
          <Input placeholder="https://example.com" />
        </Form.Item>

        <Form.Item label="Logo URL" name="logoUrl">
          <Input placeholder="https://example.com/logo.png" />
        </Form.Item>

        <Form.Item label="ICP备案号" name="icp">
          <Input placeholder="京ICP备12345678号" />
        </Form.Item>

        <Form.Item label="版权信息" name="copyright">
          <Input placeholder="© 2024 Your Company" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
});

BasicSettingsTab.displayName = 'BasicSettingsTab';
