import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

export interface ServiceStatsCardsProps {
  totalServices: number;
  healthyServices: number;
  warningServices: number;
  unhealthyServices: number;
}

/**
 * 服务统计卡片组件
 */
export const ServiceStatsCards = memo<ServiceStatsCardsProps>(
  ({ totalServices, healthyServices, warningServices, unhealthyServices }) => {
    return (
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="服务总数" value={totalServices} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="健康服务"
              value={healthyServices}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="警告服务"
              value={warningServices}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="异常服务"
              value={unhealthyServices}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  },
);

ServiceStatsCards.displayName = 'ServiceStatsCards';
