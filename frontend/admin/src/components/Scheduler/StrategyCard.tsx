import { memo } from 'react';
import { Card, Alert, Space, Button } from 'antd';
import type { SchedulingStrategy } from '@/services/scheduler';

interface StrategyCardProps {
  strategies: SchedulingStrategy[];
  activeStrategy: SchedulingStrategy | null;
  onActivateStrategy: (id: string) => void;
}

export const StrategyCard = memo<StrategyCardProps>(
  ({ strategies, activeStrategy, onActivateStrategy }) => {
    return (
      <Card title="调度策略">
        <Alert
          message={`当前激活策略: ${activeStrategy?.name || '未设置'}`}
          description={activeStrategy?.description}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Space wrap>
          {strategies.map((strategy) => (
            <Button
              key={strategy.id}
              type={strategy.id === activeStrategy?.id ? 'primary' : 'default'}
              onClick={() => onActivateStrategy(strategy.id)}
            >
              {strategy.name}
            </Button>
          ))}
        </Space>
      </Card>
    );
  }
);

StrategyCard.displayName = 'StrategyCard';
