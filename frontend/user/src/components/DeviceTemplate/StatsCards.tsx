import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { type TemplateStats, statsCardConfig } from '@/utils/templateConfig';

interface StatsCardsProps {
  stats: TemplateStats;
}

/**
 * 统计卡片组件
 *
 * 优化点:
 * - 使用 React.memo 优化
 * - 配置驱动（图标、颜色、标题）
 * - 响应式布局
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats }) => {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {statsCardConfig.map((config) => {
        const value = stats[config.key as keyof TemplateStats];

        return (
          <Col xs={24} sm={12} md={6} key={config.key}>
            <Card>
              <Statistic
                title={config.title}
                value={value}
                prefix={config.icon}
                valueStyle={{ color: config.color }}
              />
            </Card>
          </Col>
        );
      })}
    </Row>
  );
});

StatsCards.displayName = 'StatsCards';
