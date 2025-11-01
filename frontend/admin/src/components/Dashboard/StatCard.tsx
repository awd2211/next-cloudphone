/**
 * 统计卡片组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 只在 value、loading、title 等 props 变化时重渲染
 * 3. 统一的卡片样式，减少重复代码
 */
import { memo, ReactNode } from 'react';
import { Card, Statistic } from 'antd';
import type { StatisticProps } from 'antd';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
  precision?: number;
  prefix?: ReactNode;
  suffix?: string;
  valueStyle?: React.CSSProperties;
}

export const StatCard = memo<StatCardProps>(
  ({
    title,
    value,
    icon,
    color,
    loading = false,
    precision,
    prefix,
    suffix,
    valueStyle,
  }) => {
    // 合并 valueStyle，优先使用传入的 valueStyle
    const finalValueStyle = valueStyle || (color ? { color } : undefined);

    return (
      <Card loading={loading}>
        <Statistic
          title={title}
          value={value}
          prefix={prefix || icon}
          suffix={suffix}
          precision={precision}
          valueStyle={finalValueStyle}
        />
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';
