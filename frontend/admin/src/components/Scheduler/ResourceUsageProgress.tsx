/**
 * ResourceUsageProgress - 资源使用率进度条组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Progress, Tooltip } from 'antd';

export type ResourceType = 'cpu' | 'memory';

interface ResourceUsageProgressProps {
  type: ResourceType;
  usage: number;
  capacity: number;
  /** 是否显示单位为GB（内存） */
  isMemoryInGB?: boolean;
}

/**
 * ResourceUsageProgress 组件
 * 显示CPU或内存使用率的进度条，带Tooltip提示详细信息
 */
export const ResourceUsageProgress = memo<ResourceUsageProgressProps>(
  ({ type, usage, capacity, isMemoryInGB = false }) => {
    const percent = (usage / capacity) * 100;

    // 格式化显示文本
    const getTooltipTitle = () => {
      if (type === 'cpu') {
        return `${usage}/${capacity} 核`;
      }
      if (isMemoryInGB) {
        return `${(usage / 1024).toFixed(1)}/${(capacity / 1024).toFixed(1)} GB`;
      }
      return `${usage}/${capacity} MB`;
    };

    // 根据使用率确定状态
    const getStatus = (): 'success' | 'normal' | 'exception' => {
      if (percent > 80) return 'exception';
      if (percent > 60) return 'normal';
      return 'success';
    };

    return (
      <Tooltip title={getTooltipTitle()}>
        <Progress percent={Math.round(percent)} size="small" status={getStatus()} />
      </Tooltip>
    );
  }
);

ResourceUsageProgress.displayName = 'ResourceUsageProgress';
