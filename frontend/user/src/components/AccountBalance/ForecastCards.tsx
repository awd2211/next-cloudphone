import { memo } from 'react';
import { Row, Col, Card, Space, Statistic, Alert, Button, Typography, theme } from 'antd';
import { WalletOutlined, BellOutlined, DollarOutlined } from '@ant-design/icons';
import type { BalanceData } from '@/hooks/useAccountBalance';

const { Text } = Typography;
const { useToken } = theme;

interface ForecastCardsProps {
  balanceData: BalanceData;
}

export const ForecastCards = memo<ForecastCardsProps>(({ balanceData }) => {
  const { token } = useToken();

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* 消费预测 */}
      <Col xs={24} lg={12}>
        <Card
          title={
            <Space>
              <WalletOutlined />
              <Text strong>消费预测</Text>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">基于最近30天的消费数据预测：</Text>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  size="small"
                  style={{ background: token.colorPrimaryBg, textAlign: 'center' }}
                >
                  <Statistic
                    title="预计本月总消费"
                    value={(balanceData.avgDailyConsumption * 30).toFixed(2)}
                    prefix="¥"
                    valueStyle={{ color: token.colorPrimary, fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  style={{ background: token.colorPrimaryBg, textAlign: 'center' }}
                >
                  <Statistic
                    title="预计余额可用天数"
                    value={balanceData.forecastDaysLeft}
                    suffix="天"
                    valueStyle={{ color: token.colorPrimary, fontSize: 20 }}
                  />
                </Card>
              </Col>
            </Row>
            <Alert
              message="温馨提示"
              description="预测数据仅供参考，实际消费可能因设备使用情况而有所不同。"
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          </Space>
        </Card>
      </Col>

      {/* 充值建议 */}
      <Col xs={24} lg={12}>
        <Card
          title={
            <Space>
              <BellOutlined />
              <Text strong>充值建议</Text>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text type="secondary">根据您的消费情况，我们建议：</Text>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    background: token.colorSuccessBg,
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  hoverable
                  onClick={() => (window.location.href = '/recharge')}
                >
                  <Text strong style={{ color: token.colorSuccess, fontSize: 16 }}>
                    推荐充值
                  </Text>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: token.colorSuccess,
                      margin: '8px 0',
                    }}
                  >
                    ¥500
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    可使用约 32 天
                  </Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  style={{
                    background: token.colorWarningBg,
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  hoverable
                  onClick={() => (window.location.href = '/recharge')}
                >
                  <Text strong style={{ color: token.colorWarning, fontSize: 16 }}>
                    最低充值
                  </Text>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: token.colorWarning,
                      margin: '8px 0',
                    }}
                  >
                    ¥100
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    可使用约 6 天
                  </Text>
                </Card>
              </Col>
            </Row>
            <Button
              type="primary"
              size="large"
              icon={<DollarOutlined />}
              block
              onClick={() => (window.location.href = '/recharge')}
            >
              立即充值
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );
});

ForecastCards.displayName = 'ForecastCards';
