import { memo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

interface DataScopeStatsCardsProps {
  total: number;
  active: number;
  inactive: number;
  customCount: number;
}

export const DataScopeStatsCards = memo<DataScopeStatsCardsProps>(
  ({ total, active, inactive, customCount }) => {
    return (
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="总配置数" value={total} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已启用" value={active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已禁用" value={inactive} valueStyle={{ color: '#999' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="自定义范围" value={customCount} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>
    );
  }
);

DataScopeStatsCards.displayName = 'DataScopeStatsCards';
