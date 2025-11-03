import { memo } from 'react';
import { Row, Col, Space, Button, Typography } from 'antd';
import { ApiOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ApiKeysHeaderProps {
  onCreate: () => void;
}

export const ApiKeysHeader = memo<ApiKeysHeaderProps>(({ onCreate }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2} style={{ marginBottom: 8 }}>
            API Keys 管理
          </Title>
          <Text type="secondary">管理您的 API 密钥，用于程序化访问云手机平台</Text>
        </Col>
        <Col>
          <Space>
            <Button
              href="https://docs.cloudphone.com/api"
              target="_blank"
              icon={<ApiOutlined />}
            >
              API 文档
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="large" onClick={onCreate}>
              创建 API Key
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
});

ApiKeysHeader.displayName = 'ApiKeysHeader';
