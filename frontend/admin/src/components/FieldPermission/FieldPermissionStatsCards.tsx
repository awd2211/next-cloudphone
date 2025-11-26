import { memo } from 'react';
import { Row, Col, Card, Statistic , theme } from 'antd';
import { SEMANTIC } from '@/theme';

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
  const { token } = theme.useToken();
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总配置数"
            value={statistics.total}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="启用中"
            value={statistics.active}
            valueStyle={{ color: SEMANTIC.success.main }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="已禁用"
            value={statistics.inactive}
            valueStyle={{ color: SEMANTIC.error.main }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="创建操作"
            value={statistics.byOperation.create}
            valueStyle={{ color: SEMANTIC.success.main }}
          />
        </Card>
      </Col>
    </Row>
  );
});

FieldPermissionStatsCards.displayName = 'FieldPermissionStatsCards';
