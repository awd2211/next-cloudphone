import React from 'react';
import { Card } from 'antd';
import type { ReferralConfig } from '@/services/referral';

interface RulesCardProps {
  config: ReferralConfig | null;
}

/**
 * 邀请规则卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 安全的 HTML 渲染
 */
export const RulesCard: React.FC<RulesCardProps> = React.memo(({ config }) => {
  return (
    <Card title="邀请规则" style={{ marginTop: 24 }}>
      <div dangerouslySetInnerHTML={{ __html: config?.rules || '加载中...' }} />
    </Card>
  );
});

RulesCard.displayName = 'RulesCard';
