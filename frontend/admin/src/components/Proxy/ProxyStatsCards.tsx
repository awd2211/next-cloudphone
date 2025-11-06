import { Row, Col, Card, Statistic } from 'antd';
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
const ProxyStatsCards: React.FC<ProxyStatsCardsProps> = ({
  total,
  available,
  inUse,
  unavailable,
  avgQuality,
  avgLatency,
  totalBandwidth,
  totalCost,
}) => {
  const stats = [
    {
      title: '总代理数',
      value: total,
      icon: <GlobalOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff',
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
      icon: <LoadingOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff',
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
  ];

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
};

export default ProxyStatsCards;
