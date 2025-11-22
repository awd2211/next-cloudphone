import { memo, useMemo } from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';
import {
  GlobalOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  DollarOutlined,
} from '@ant-design/icons';

interface ProxyStatsCardsProps {
  total: number;
  available: number;
  inUse: number;
  unavailable: number;
  avgQuality: number;
  avgLatency: number;
  totalBandwidth: number;
  totalCost: number;
}

/**
 * 代理IP统计卡片组件
 */
// ✅ 使用 memo 包装组件，避免不必要的重渲染
const ProxyStatsCards: React.FC<ProxyStatsCardsProps> = memo(({
  total,
  available,
  inUse,
  unavailable,
  avgQuality,
  avgLatency,
  totalBandwidth,
  totalCost,
}) => {
  const { token } = theme.useToken();

  // ✅ 使用 useMemo 缓存统计数据
  const stats = useMemo(() => [
    {
      title: '总代理数',
      value: total,
      icon: <GlobalOutlined style={{ color: token.colorPrimary }} />,
      color: token.colorPrimary,
    },
    {
      title: '可用代理',
      value: available,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a',
    },
    {
      title: '使用中',
      value: inUse,
      icon: <LoadingOutlined style={{ color: token.colorPrimary }} />,
      color: token.colorPrimary,
    },
    {
      title: '不可用',
      value: unavailable,
      icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      color: '#ff4d4f',
    },
    {
      title: '平均质量',
      value: avgQuality,
      suffix: '/100',
      icon: <ThunderboltOutlined style={{ color: '#faad14' }} />,
      color: '#faad14',
      precision: 1,
    },
    {
      title: '平均延迟',
      value: avgLatency,
      suffix: 'ms',
      icon: <ThunderboltOutlined style={{ color: '#722ed1' }} />,
      color: '#722ed1',
      precision: 0,
    },
    {
      title: '总流量',
      value: totalBandwidth,
      suffix: 'GB',
      icon: <CloudServerOutlined style={{ color: '#13c2c2' }} />,
      color: '#13c2c2',
      precision: 2,
    },
    {
      title: '总成本',
      value: totalCost,
      prefix: '$',
      icon: <DollarOutlined style={{ color: '#eb2f96' }} />,
      color: '#eb2f96',
      precision: 2,
    },
  ], [total, available, inUse, unavailable, avgQuality, avgLatency, totalBandwidth, totalCost, token.colorPrimary]);

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {stats.map((stat, index) => (
        <Col xs={24} sm={12} md={12} lg={6} key={index}>
          <Card>
            <Statistic
              title={stat.title}
              value={stat.value}
              prefix={stat.prefix || stat.icon}
              suffix={stat.suffix}
              precision={stat.precision}
              valueStyle={{ color: stat.color }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
});

ProxyStatsCards.displayName = 'ProxyStatsCards';

export default ProxyStatsCards;
