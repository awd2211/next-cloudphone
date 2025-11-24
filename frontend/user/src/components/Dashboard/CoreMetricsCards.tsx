import { memo, useMemo } from 'react';
import { Row, Col, Card, Statistic, Progress, Tag, Typography, Button, theme } from 'antd';
import {
  MobileOutlined,
  AppstoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { DashboardData } from '@/hooks/useDashboard';

const { Text } = Typography;
const { useToken } = theme;

interface CoreMetricsCardsProps {
  data: DashboardData;
  deviceUsageRate: number;
  spendingTrendPercent: number;
}

export const CoreMetricsCards = memo<CoreMetricsCardsProps>(
  ({ data, deviceUsageRate, spendingTrendPercent }) => {
    const navigate = useNavigate();
    const { token } = useToken();

    const trendTag = useMemo(() => {
      return spendingTrendPercent > 0 ? (
        <Tag color="red" icon={<ArrowUpOutlined />}>
          +{spendingTrendPercent}%
        </Tag>
      ) : (
        <Tag color="green" icon={<ArrowDownOutlined />}>
          {spendingTrendPercent}%
        </Tag>
      );
    }, [spendingTrendPercent]);

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* 设备总数 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/devices')}>
            <Statistic
              title="设备总数"
              value={data.devices.total}
              suffix={`/ ${data.devices.quota}`}
              prefix={<MobileOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
            <Progress
              percent={deviceUsageRate}
              strokeColor={deviceUsageRate > 80 ? token.colorError : token.colorPrimary}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              使用率 {deviceUsageRate}%
            </Text>
          </Card>
        </Col>

        {/* 已安装应用 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/installed-apps')}>
            <Statistic
              title="已安装应用"
              value={data.apps.installed}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: token.colorSuccess }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                应用市场可用: {data.apps.marketApps} 个
              </Text>
            </div>
          </Card>
        </Col>

        {/* 账户余额 */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/billing/balance')}>
            <Statistic
              title="账户余额"
              value={data.billing.balance}
              prefix="¥"
              precision={2}
              valueStyle={{ color: token.colorWarning }}
            />
            <div style={{ marginTop: 8 }}>
              <Button size="small" type="link" onClick={() => navigate('/recharge')}>
                立即充值
              </Button>
            </div>
          </Card>
        </Col>

        {/* 本月消费 */}
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月消费"
              value={data.billing.thisMonth}
              prefix="¥"
              precision={2}
              valueStyle={{ color: token.colorError }}
              suffix={<span style={{ fontSize: 14 }}>{trendTag}</span>}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                上月: ¥{data.billing.lastMonth}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    );
  }
);

CoreMetricsCards.displayName = 'CoreMetricsCards';
