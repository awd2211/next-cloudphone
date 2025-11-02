import React from 'react';
import { Card, Space } from 'antd';
import { CACHE_INFO_TEXTS } from './constants';

export const CacheInfoCard: React.FC = React.memo(() => {
  return (
    <Card title="缓存说明">
      <Space direction="vertical" size="small">
        <div>
          <strong>L1 缓存 (NodeCache):</strong> {CACHE_INFO_TEXTS.l1Description}
        </div>
        <div>
          <strong>L2 缓存 (Redis):</strong> {CACHE_INFO_TEXTS.l2Description}
        </div>
        <div>
          <strong>缓存策略:</strong> {CACHE_INFO_TEXTS.strategy}
        </div>
        <div>
          <strong>性能指标:</strong>
          <ul style={{ marginTop: 8 }}>
            {CACHE_INFO_TEXTS.performanceMetrics.map((metric, index) => (
              <li key={index}>{metric}</li>
            ))}
          </ul>
        </div>
      </Space>
    </Card>
  );
});

CacheInfoCard.displayName = 'CacheInfoCard';
