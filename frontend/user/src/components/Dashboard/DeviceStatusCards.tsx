import { memo, useMemo } from 'react';
import { Row, Col, Card, Statistic, Alert, Space, Button, Typography, theme } from 'antd';
import { SyncOutlined, StopOutlined, CloseCircleOutlined, MobileOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { DashboardData } from '@/hooks/useDashboard';

const { Text } = Typography;
const { useToken } = theme;

interface DeviceStatusCardsProps {
  data: DashboardData;
}

export const DeviceStatusCards = memo<DeviceStatusCardsProps>(({ data }) => {
  const navigate = useNavigate();
  const { token } = useToken();

  const deviceStatusData = useMemo(
    () => [
      {
        status: '运行中',
        count: data.devices.running,
        color: token.colorSuccess,
        icon: <SyncOutlined spin />,
      },
      {
        status: '已停止',
        count: data.devices.stopped,
        color: token.colorWarning,
        icon: <StopOutlined />,
      },
      {
        status: '异常',
        count: data.devices.error,
        color: token.colorError,
        icon: <CloseCircleOutlined />,
      },
    ],
    [data.devices, token]
  );

  return (
    <Col xs={24} md={12}>
      <Card
        title={
          <Space>
            <MobileOutlined />
            <Text strong>设备状态分布</Text>
          </Space>
        }
        extra={
          <Button type="link" onClick={() => navigate('/devices')}>
            查看全部
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          {deviceStatusData.map((item, index) => (
            <Col span={8} key={index}>
              <Card
                size="small"
                style={{
                  textAlign: 'center',
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
                <Statistic value={item.count} valueStyle={{ fontSize: 24, color: item.color }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.status}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>

        {data.devices.error > 0 && (
          <Alert
            message="注意"
            description={`有 ${data.devices.error} 台设备处于异常状态，请及时处理`}
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </Col>
  );
});

DeviceStatusCards.displayName = 'DeviceStatusCards';
