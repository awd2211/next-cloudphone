import { memo } from 'react';
import { Card, Form, Input, InputNumber, Button, Select } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

interface StorageSettingsTabProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: any) => void;
}

export const StorageSettingsTab = memo<StorageSettingsTabProps>(
  ({ form, loading, onFinish }) => {
    return (
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="存储方式" name="storageType" initialValue="local">
            <Select>
              <Select.Option value="local">本地存储</Select.Option>
              <Select.Option value="oss">阿里云OSS</Select.Option>
              <Select.Option value="s3">Amazon S3</Select.Option>
              <Select.Option value="qiniu">七牛云</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="文件上传大小限制 (MB)" name="maxUploadSize" initialValue={100}>
            <InputNumber min={1} max={1024} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="OSS Endpoint" name="ossEndpoint">
            <Input placeholder="oss-cn-hangzhou.aliyuncs.com" />
          </Form.Item>

          <Form.Item label="OSS Bucket" name="ossBucket">
            <Input placeholder="my-bucket" />
          </Form.Item>

          <Form.Item label="OSS AccessKey ID" name="ossAccessKeyId">
            <Input placeholder="请输入AccessKey ID" />
          </Form.Item>

          <Form.Item label="OSS AccessKey Secret" name="ossAccessKeySecret">
            <Input.Password placeholder="请输入AccessKey Secret" />
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

StorageSettingsTab.displayName = 'StorageSettingsTab';
