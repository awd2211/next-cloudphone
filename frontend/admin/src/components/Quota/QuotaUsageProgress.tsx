/**
 * QuotaUsageProgress - 配额使用进度条组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Progress } from 'antd';

interface QuotaUsageProgressProps {
  used: number;
  total: number;
  unit?: string;
  showException?: boolean;
}

/**
 * QuotaUsageProgress 组件
 * 显示配额使用率进度条
 */
export const QuotaUsageProgress = memo<QuotaUsageProgressProps>(
  ({ used, total, unit = '', showException = true }) => {
    const calculatePercent = (used: number, total: number) => {
      if (total === 0) return 0;
      return Math.round((used / total) * 100);
    };

    const percent = calculatePercent(used, total);

    return (
      <div>
        <div>
          {used} / {total} {unit}
        </div>
        <Progress
          percent={percent}
          size="small"
          status={
            showException
              ? percent > 90
                ? 'exception'
                : percent > 70
                  ? 'normal'
                  : 'success'
              : undefined
          }
        />
      </div>
    );
  }
);

QuotaUsageProgress.displayName = 'QuotaUsageProgress';
