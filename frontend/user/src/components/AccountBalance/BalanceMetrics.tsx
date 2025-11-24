import { memo, useMemo } from 'react';
import { Row, Col, Card, Statistic, Tag, Progress, Space, Typography, theme } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  BellOutlined,
} from '@ant-design/icons';
import type { BalanceData } from '@/hooks/useAccountBalance';

const { Text } = Typography;
const { useToken } = theme;

interface BalanceMetricsProps {
  balanceData: BalanceData;
  balanceChange: number;
  balanceChangePercent: string;
  monthConsumptionPercent: string;
  isLowBalance: boolean;
}

export const BalanceMetrics = memo<BalanceMetricsProps>(
  ({
    balanceData,
    balanceChange,
    balanceChangePercent,
    monthConsumptionPercent,
    isLowBalance,
  }) => {
    const { token } = useToken();

    const balanceTag = useMemo(
      () =>
        balanceChange > 0 ? (
          <Tag color="green" icon={<ArrowUpOutlined />}>
            +{balanceChangePercent}%
          </Tag>
        ) : (
          <Tag color="red" icon={<ArrowDownOutlined />}>
            -{balanceChangePercent}%
          </Tag>
        ),
      [balanceChange, balanceChangePercent]
    );

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 当前余额 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="当前余额"
              value={balanceData.current}
              precision={2}
              prefix="¥"
              valueStyle={{ color: isLowBalance ? token.colorError : token.colorPrimary, fontSize: 32 }}
              suffix={<Space style={{ fontSize: 14 }}>{balanceTag}</Space>}
            />
            <Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 8, display: 'block' }}
            >
              较昨日 {balanceChange > 0 ? '增加' : '减少'} ¥
              {Math.abs(balanceChange).toFixed(2)}
            </Text>
          </Card>
        </Col>

        {/* 本月消费 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月消费"
              value={balanceData.monthConsumption}
              precision={2}
              prefix="¥"
              valueStyle={{ color: token.colorError, fontSize: 28 }}
            />
            <Progress
              percent={parseFloat(monthConsumptionPercent)}
              strokeColor={token.colorError}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
            <Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 4, display: 'block' }}
            >
              已用 {monthConsumptionPercent}% | 月初余额 ¥{balanceData.monthStart.toFixed(2)}
            </Text>
          </Card>
        </Col>

        {/* 日均消费 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="日均消费"
              value={balanceData.avgDailyConsumption}
              precision={2}
              prefix="¥"
              valueStyle={{ color: token['purple-6'] ?? '#722ed1', fontSize: 28 }}
            />
            <Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 8, display: 'block' }}
            >
              按此速度预计还可使用 {balanceData.forecastDaysLeft} 天
            </Text>
          </Card>
        </Col>

        {/* 预警状态 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Text type="secondary">余额预警</Text>
              <Space>
                {balanceData.alertEnabled ? (
                  <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 32 }} />
                ) : (
                  <BellOutlined style={{ color: token.colorBorder, fontSize: 32 }} />
                )}
                <div>
                  <Text strong style={{ fontSize: 20 }}>
                    {balanceData.alertEnabled ? '已开启' : '已关闭'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    预警值: ¥{balanceData.lowBalanceThreshold}
                  </Text>
                </div>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    );
  }
);

BalanceMetrics.displayName = 'BalanceMetrics';
