/**
 * Report Analytics 常量和工具函数
 */

export interface AnalyticsData {
  revenueData: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    dailyStats: Array<{ date: string; revenue: number; orders: number }>;
  };
  userGrowthData: Array<{ date: string; count: number }>;
  deviceData: {
    total: number;
    running: number;
    idle: number;
    stopped: number;
  };
  planData: Array<{ planName: string; userCount: number }>;
}

export type PeriodType = 'day' | 'week' | 'month';

export const PERIOD_OPTIONS = [
  { value: 'day' as const, label: '按天' },
  { value: 'week' as const, label: '按周' },
  { value: 'month' as const, label: '按月' },
];

/**
 * 生成热力图数据 (模拟)
 * 在实际应用中应该从后端获取真实数据
 */
export const generateHeatmapData = (): Array<[number, number, number]> => {
  const data: Array<[number, number, number]> = [];
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 24; j++) {
      data.push([j, i, Math.floor(Math.random() * 100)]);
    }
  }
  return data;
};
