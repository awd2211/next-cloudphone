import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';

interface FieldPermissionStatsCardsProps {
  statistics: {
    total: number;
    active: number;
    inactive: number;
    byOperation: {
      create: number;
      update: number;
      view: number;
      export: number;
    };
  };
}

export const FieldPermissionStatsCards = memo<FieldPermissionStatsCardsProps>(({ statistics }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总配置数"
            value={statistics.total}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="启用中"
            value={statistics.active}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="已禁用"
            value={statistics.inactive}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="创建操作"
            value={statistics.byOperation.create}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

FieldPermissionStatsCards.displayName = 'FieldPermissionStatsCards';
