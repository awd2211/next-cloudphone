import type { HistoryData } from '@/types';

/**
 * 字节格式化工具函数
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * 运行时长格式化工具函数
 */
export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}天 ${hours}小时`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

/**
 * 获取进度条状态
 */
export const getProgressStatus = (percent: number): 'success' | 'normal' | 'exception' => {
  if (percent >= 90) return 'exception';
  if (percent >= 70) return 'normal';
  return 'success';
};

/**
 * 获取数值颜色（根据百分比）
 */
export const getValueColor = (percent: number): string => {
  if (percent > 80) return '#cf1322';
  if (percent > 50) return '#faad14';
  return '#3f8600';
};

/**
 * 图表配置工厂函数
 */
export const createChartConfig = (
  data: HistoryData[],
  field: 'cpuUsage' | 'memoryUsage',
  color: string,
  name: string
) => {
  return {
    data,
    xField: 'time',
    yField: field,
    height: 200,
    smooth: true,
    color,
    yAxis: {
      min: 0,
      max: 100,
      label: {
        formatter: (v: string) => `${v}%`,
      },
    },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: true,
      },
    },
    point: {
      size: 3,
    },
    tooltip: {
      formatter: (datum: HistoryData) => ({
        name,
        value: `${(datum[field] ?? 0).toFixed(1)}%`,
      }),
    },
  };
};

/**
 * 自动刷新间隔（毫秒）
 */
export const AUTO_REFRESH_INTERVAL = 5000; // 5秒

/**
 * 历史数据最大保留数量
 */
export const MAX_HISTORY_DATA = 20;
