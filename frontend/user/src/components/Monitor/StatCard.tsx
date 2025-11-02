import React from 'react';
import { Card, Statistic, Progress, Typography } from 'antd';
import { getProgressStatus, getValueColor } from '@/utils/monitorConfig';

const { Text } = Typography;

interface StatCardProps {
  title: string;
  value: number | string;
  precision?: number;
  suffix?: string;
  icon?: React.ReactNode;
  showProgress?: boolean;
  progressPercent?: number;
  description?: string;
}

/**
 * 统计卡片组件（可复用）
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 支持进度条显示
 * - 支持描述文本
 * - 动态颜色根据百分比
 */
export const StatCard: React.FC<StatCardProps> = React.memo(
  ({ title, value, precision, suffix, icon, showProgress, progressPercent, description }) => {
    const percent = typeof value === 'number' ? value : progressPercent || 0;
    const valueColor = typeof value === 'number' && showProgress ? getValueColor(percent) : undefined;

    return (
      <Card>
        <Statistic
          title={title}
          value={value}
          precision={precision}
          suffix={suffix}
          prefix={icon}
          valueStyle={valueColor ? { color: valueColor } : undefined}
        />
        {showProgress && progressPercent !== undefined && (
          <Progress
            percent={progressPercent}
            status={getProgressStatus(progressPercent)}
            showInfo={false}
            style={{ marginTop: 8 }}
          />
        )}
        {description && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {description}
          </Text>
        )}
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';
