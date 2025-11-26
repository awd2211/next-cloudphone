import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@/theme';

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
              valueStyle={{ color: SEMANTIC.success.main }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="警告服务"
              value={warningServices}
              valueStyle={{ color: SEMANTIC.warning.main }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="异常服务"
              value={unhealthyServices}
              valueStyle={{ color: SEMANTIC.error.main }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
    );
  },
);

ServiceStatsCards.displayName = 'ServiceStatsCards';
