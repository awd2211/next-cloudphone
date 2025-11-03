import { memo } from 'react';
import { Row, Col, Typography, Button, Space } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface DashboardHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onCreateDevice: () => void;
}

export const DashboardHeader = memo<DashboardHeaderProps>(
  ({ loading, onRefresh, onCreateDevice }) => {
    return (
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ marginBottom: 8 }}>
              使用量仪表板
            </Title>
            <Text type="secondary">实时查看您的设备、应用和消费情况</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
                刷新数据
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={onCreateDevice}>
                创建设备
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
    );
  }
);

DashboardHeader.displayName = 'DashboardHeader';
