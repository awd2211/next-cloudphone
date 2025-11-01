import { memo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';

interface TemplateStatsCardProps {
  stats?: {
    totalTemplates?: number;
    publicTemplates?: number;
    privateTemplates?: number;
    totalUsage?: number;
  };
}

export const TemplateStatsCard = memo<TemplateStatsCardProps>(({ stats }) => {
  return (
    <Card style={{ marginBottom: '16px' }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic title="总模板数" value={stats?.totalTemplates || 0} />
        </Col>
        <Col span={6}>
          <Statistic
            title="公开模板"
            value={stats?.publicTemplates || 0}
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="私有模板"
            value={stats?.privateTemplates || 0}
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="总使用次数"
            value={stats?.totalUsage || 0}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
      </Row>
    </Card>
  );
});

TemplateStatsCard.displayName = 'TemplateStatsCard';
