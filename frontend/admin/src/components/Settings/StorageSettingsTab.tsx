import { memo, useState } from 'react';
import { Card, Form, Input, InputNumber, Button, Select, Divider, Typography, Space, Alert, Tooltip } from 'antd';
import { SaveOutlined, QuestionCircleOutlined, LinkOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';

const { Text, Link } = Typography;

interface StorageSettingsTabProps {
  form: FormInstance;
  loading: boolean;
  onFinish: (values: any) => void;
}

export const StorageSettingsTab = memo<StorageSettingsTabProps>(
  ({ form, loading, onFinish }) => {
    const [storageType, setStorageType] = useState<string>(form.getFieldValue('storageType') || 'local');

    const handleStorageTypeChange = (value: string) => {
      setStorageType(value);
    };

    return (
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="存储方式" name="storageType" initialValue="local">
            <Select onChange={handleStorageTypeChange}>
              <Select.Option value="local">本地存储</Select.Option>
              <Select.Option value="minio">MinIO (自托管)</Select.Option>
              <Select.Option value="r2">Cloudflare R2</Select.Option>
              <Select.Option value="s3">Amazon S3</Select.Option>
              <Select.Option value="oss">阿里云 OSS</Select.Option>
              <Select.Option value="cos">腾讯云 COS</Select.Option>
              <Select.Option value="qiniu">七牛云</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="文件上传大小限制 (MB)" name="maxUploadSize" initialValue={100}>
            <InputNumber min={1} max={1024} style={{ width: '100%' }} />
          </Form.Item>

          <Divider />

          {/* ==================== Cloudflare R2 配置 ==================== */}
          {storageType === 'r2' && (
            <>
              <Alert
                message="Cloudflare R2 存储"
                description={
                  <Space direction="vertical" size="small">
                    <Text>R2 是 Cloudflare 提供的零出口费用对象存储服务，使用 S3 兼容 API。</Text>
                    <Link href="https://dash.cloudflare.com/?to=/:account/r2" target="_blank">
                      <LinkOutlined /> 访问 Cloudflare R2 控制台
                    </Link>
                  </Space>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item
                label={
                  <Space>
                    Account ID
                    <Tooltip title="在 Cloudflare 控制台右侧边栏可以找到您的 Account ID">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="r2AccountId"
                rules={[{ required: storageType === 'r2', message: '请输入 Account ID' }]}
              >
                <Input placeholder="例如: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" />
              </Form.Item>

              <Form.Item
                label="Bucket 名称"
                name="r2Bucket"
                rules={[{ required: storageType === 'r2', message: '请输入 Bucket 名称' }]}
              >
                <Input placeholder="例如: cloudphone-storage" />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    Access Key ID
                    <Tooltip title="在 R2 控制台 -> 管理 R2 API 令牌 中创建">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="r2AccessKeyId"
                rules={[{ required: storageType === 'r2', message: '请输入 Access Key ID' }]}
              >
                <Input placeholder="R2 API 令牌的 Access Key ID" />
              </Form.Item>

              <Form.Item
                label="Secret Access Key"
                name="r2SecretAccessKey"
                rules={[{ required: storageType === 'r2', message: '请输入 Secret Access Key' }]}
              >
                <Input.Password placeholder="R2 API 令牌的 Secret Access Key" />
              </Form.Item>

              <Form.Item
                label={
                  <Space>
                    自定义域名 (可选)
                    <Tooltip title="如果您为 R2 存储桶配置了自定义域名，请在此填写">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="r2CustomDomain"
              >
                <Input placeholder="例如: storage.yourdomain.com (无需 https://)" />
              </Form.Item>

              <Form.Item
                label="公开访问"
                name="r2PublicAccess"
                initialValue={false}
              >
                <Select>
                  <Select.Option value={false}>私有 (需要签名 URL)</Select.Option>
                  <Select.Option value={true}>公开 (通过自定义域名或 R2.dev)</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}

          {/* ==================== Amazon S3 配置 ==================== */}
          {storageType === 's3' && (
            <>
              <Form.Item
                label="区域 (Region)"
                name="s3Region"
                rules={[{ required: storageType === 's3', message: '请选择区域' }]}
              >
                <Select placeholder="选择 AWS 区域">
                  <Select.Option value="us-east-1">美国东部 (us-east-1)</Select.Option>
                  <Select.Option value="us-west-2">美国西部 (us-west-2)</Select.Option>
                  <Select.Option value="eu-west-1">欧洲 (eu-west-1)</Select.Option>
                  <Select.Option value="ap-northeast-1">东京 (ap-northeast-1)</Select.Option>
                  <Select.Option value="ap-southeast-1">新加坡 (ap-southeast-1)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Bucket 名称"
                name="s3Bucket"
                rules={[{ required: storageType === 's3', message: '请输入 Bucket 名称' }]}
              >
                <Input placeholder="my-bucket" />
              </Form.Item>

              <Form.Item
                label="Access Key ID"
                name="s3AccessKeyId"
                rules={[{ required: storageType === 's3', message: '请输入 Access Key ID' }]}
              >
                <Input placeholder="AWS Access Key ID" />
              </Form.Item>

              <Form.Item
                label="Secret Access Key"
                name="s3SecretAccessKey"
                rules={[{ required: storageType === 's3', message: '请输入 Secret Access Key' }]}
              >
                <Input.Password placeholder="AWS Secret Access Key" />
              </Form.Item>
            </>
          )}

          {/* ==================== MinIO 配置 ==================== */}
          {storageType === 'minio' && (
            <>
              <Form.Item
                label="Endpoint"
                name="minioEndpoint"
                rules={[{ required: storageType === 'minio', message: '请输入 MinIO Endpoint' }]}
              >
                <Input placeholder="例如: minio.example.com:9000" />
              </Form.Item>

              <Form.Item
                label="Bucket 名称"
                name="minioBucket"
                rules={[{ required: storageType === 'minio', message: '请输入 Bucket 名称' }]}
              >
                <Input placeholder="my-bucket" />
              </Form.Item>

              <Form.Item
                label="Access Key"
                name="minioAccessKey"
                rules={[{ required: storageType === 'minio', message: '请输入 Access Key' }]}
              >
                <Input placeholder="MinIO Access Key" />
              </Form.Item>

              <Form.Item
                label="Secret Key"
                name="minioSecretKey"
                rules={[{ required: storageType === 'minio', message: '请输入 Secret Key' }]}
              >
                <Input.Password placeholder="MinIO Secret Key" />
              </Form.Item>

              <Form.Item
                label="使用 SSL"
                name="minioUseSSL"
                initialValue={true}
              >
                <Select>
                  <Select.Option value={true}>是 (HTTPS)</Select.Option>
                  <Select.Option value={false}>否 (HTTP)</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}

          {/* ==================== 阿里云 OSS 配置 ==================== */}
          {storageType === 'oss' && (
            <>
              <Form.Item
                label="Endpoint"
                name="ossEndpoint"
                rules={[{ required: storageType === 'oss', message: '请输入 OSS Endpoint' }]}
              >
                <Input placeholder="oss-cn-hangzhou.aliyuncs.com" />
              </Form.Item>

              <Form.Item
                label="Bucket 名称"
                name="ossBucket"
                rules={[{ required: storageType === 'oss', message: '请输入 Bucket 名称' }]}
              >
                <Input placeholder="my-bucket" />
              </Form.Item>

              <Form.Item
                label="AccessKey ID"
                name="ossAccessKeyId"
                rules={[{ required: storageType === 'oss', message: '请输入 AccessKey ID' }]}
              >
                <Input placeholder="请输入 AccessKey ID" />
              </Form.Item>

              <Form.Item
                label="AccessKey Secret"
                name="ossAccessKeySecret"
                rules={[{ required: storageType === 'oss', message: '请输入 AccessKey Secret' }]}
              >
                <Input.Password placeholder="请输入 AccessKey Secret" />
              </Form.Item>
            </>
          )}

          {/* ==================== 腾讯云 COS 配置 ==================== */}
          {storageType === 'cos' && (
            <>
              <Form.Item
                label="区域 (Region)"
                name="cosRegion"
                rules={[{ required: storageType === 'cos', message: '请选择区域' }]}
              >
                <Select placeholder="选择腾讯云区域">
                  <Select.Option value="ap-beijing">北京 (ap-beijing)</Select.Option>
                  <Select.Option value="ap-shanghai">上海 (ap-shanghai)</Select.Option>
                  <Select.Option value="ap-guangzhou">广州 (ap-guangzhou)</Select.Option>
                  <Select.Option value="ap-chengdu">成都 (ap-chengdu)</Select.Option>
                  <Select.Option value="ap-hongkong">香港 (ap-hongkong)</Select.Option>
                  <Select.Option value="ap-singapore">新加坡 (ap-singapore)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Bucket 名称"
                name="cosBucket"
                rules={[{ required: storageType === 'cos', message: '请输入 Bucket 名称' }]}
              >
                <Input placeholder="bucket-appid (例如: mybucket-1250000000)" />
              </Form.Item>

              <Form.Item
                label="SecretId"
                name="cosSecretId"
                rules={[{ required: storageType === 'cos', message: '请输入 SecretId' }]}
              >
                <Input placeholder="腾讯云 SecretId" />
              </Form.Item>

              <Form.Item
                label="SecretKey"
                name="cosSecretKey"
                rules={[{ required: storageType === 'cos', message: '请输入 SecretKey' }]}
              >
                <Input.Password placeholder="腾讯云 SecretKey" />
              </Form.Item>
            </>
          )}

          {/* ==================== 七牛云配置 ==================== */}
          {storageType === 'qiniu' && (
            <>
              <Form.Item
                label="Bucket 名称"
                name="qiniuBucket"
                rules={[{ required: storageType === 'qiniu', message: '请输入 Bucket 名称' }]}
              >
                <Input placeholder="my-bucket" />
              </Form.Item>

              <Form.Item
                label="AccessKey"
                name="qiniuAccessKey"
                rules={[{ required: storageType === 'qiniu', message: '请输入 AccessKey' }]}
              >
                <Input placeholder="七牛云 AccessKey" />
              </Form.Item>

              <Form.Item
                label="SecretKey"
                name="qiniuSecretKey"
                rules={[{ required: storageType === 'qiniu', message: '请输入 SecretKey' }]}
              >
                <Input.Password placeholder="七牛云 SecretKey" />
              </Form.Item>

              <Form.Item
                label="外链域名"
                name="qiniuDomain"
                rules={[{ required: storageType === 'qiniu', message: '请输入外链域名' }]}
              >
                <Input placeholder="cdn.example.com" />
              </Form.Item>
            </>
          )}

          {/* ==================== 本地存储配置 ==================== */}
          {storageType === 'local' && (
            <>
              <Form.Item
                label="存储路径"
                name="localPath"
                initialValue="/data/uploads"
              >
                <Input placeholder="/data/uploads" />
              </Form.Item>

              <Form.Item
                label="访问 URL 前缀"
                name="localUrlPrefix"
                initialValue="/uploads"
              >
                <Input placeholder="/uploads" />
              </Form.Item>
            </>
          )}

          <Divider />

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
