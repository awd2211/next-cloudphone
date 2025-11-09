import React from 'react';
import { Card, Row, Col, Statistic , theme } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import type { CacheStats } from './constants';
import { getHitRateColor } from './constants';

interface CacheStatsCardsProps {
  stats: CacheStats | null;
}

export const CacheStatsCards: React.FC<CacheStatsCardsProps> = React.memo(({ stats }) => {
    const { token } = theme.useToken();
  return (
    <>
      {/* 第一行：命中数和未命中数 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="L1 命中数"
              value={stats?.l1Hits || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="L2 命中数"
              value={stats?.l2Hits || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未命中数"
              value={stats?.misses || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总请求数" value={stats?.totalRequests || 0} />
          </Card>
        </Col>
      </Row>

      {/* 第二行：命中率和缓存大小 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="命中率"
              value={stats?.hitRate || 0}
              precision={2}
              suffix="%"
              valueStyle={{
                color: stats ? getHitRateColor(stats.hitRate) : token.colorPrimary,
              }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="未命中率"
              value={stats?.missRate || 0}
              precision={2}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="L1 缓存大小" value={stats?.l1Size || 0} suffix="keys" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="L2 缓存大小" value={stats?.l2Size || 0} suffix="keys" />
          </Card>
        </Col>
      </Row>
    </>
  );
});

CacheStatsCards.displayName = 'CacheStatsCards';
