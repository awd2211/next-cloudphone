/**
 * 设备统计卡片组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 只在 value 或 loading 状态变化时重渲染
 * 3. 图标通过 props 传递，避免内部创建
 */
import { memo, ReactNode } from 'react';
import { Card, Statistic  } from 'antd';
import { PRIMARY } from '@/theme';

interface DeviceStatCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
  suffix?: string;
  prefix?: ReactNode;
}

export const DeviceStatCard = memo<DeviceStatCardProps>(
  ({ title, value, icon, color = PRIMARY.main, loading = false, suffix, prefix }) => {
    return (
      <Card loading={loading}>
        <Statistic
          title={title}
          value={value}
          prefix={prefix || icon}
          suffix={suffix}
          valueStyle={{ color }}
        />
      </Card>
    );
  }
);

DeviceStatCard.displayName = 'DeviceStatCard';
