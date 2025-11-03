import { memo } from 'react';
import { Row, Col, Space, Button, Typography } from 'antd';
import { ReloadOutlined, SettingOutlined, DollarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface BalanceHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onOpenAlertSettings: () => void;
}

export const BalanceHeader = memo<BalanceHeaderProps>(
  ({ loading, onRefresh, onOpenAlertSettings }) => {
    return (
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ marginBottom: 8 }}>
              账户余额
            </Title>
            <Text type="secondary">查看账户余额、消费趋势和交易记录</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
                刷新
              </Button>
              <Button icon={<SettingOutlined />} onClick={onOpenAlertSettings}>
                预警设置
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<DollarOutlined />}
                onClick={() => (window.location.href = '/recharge')}
              >
                立即充值
              </Button>
            </Space>
          </Col>
        </Row>
      </div>
    );
  }
);

BalanceHeader.displayName = 'BalanceHeader';
