import { useMemo } from 'react';
import dayjs from 'dayjs';
import { getMethodName } from './constants';
import type { PaymentMethodStat, DailyStat } from '@/services/payment-admin';

/**
 * 支付方式饼图配置
 */
export const usePaymentMethodChartOption = (methodStats: PaymentMethodStat[]) => {
  return useMemo(
    () => ({
      title: {
        text: '支付方式占比',
        left: 'center',
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '支付方式',
          type: 'pie' as const,
          radius: '50%',
          data: methodStats.map((item) => ({
            name: getMethodName(item.method),
            value: item.count,
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    }),
    [methodStats]
  );
};

/**
 * 每日趋势图配置
 */
export const useDailyTrendChartOption = (dailyStats: DailyStat[]) => {
  return useMemo(
    () => ({
      title: {
        text: '每日交易趋势',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis' as const,
      },
      legend: {
        data: ['交易量', '成功交易', '收入'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category' as const,
        boundaryGap: false,
        data: dailyStats.map((item) => dayjs(item.date).format('MM-DD')),
      },
      yAxis: [
        {
          type: 'value' as const,
          name: '交易量',
        },
        {
          type: 'value' as const,
          name: '收入',
        },
      ],
      series: [
        {
          name: '交易量',
          type: 'line' as const,
          data: dailyStats.map((item) => item.totalTransactions),
          smooth: true,
        },
        {
          name: '成功交易',
          type: 'line' as const,
          data: dailyStats.map((item) => item.successfulTransactions),
          smooth: true,
        },
        {
          name: '收入',
          type: 'line' as const,
          yAxisIndex: 1,
          data: dailyStats.map((item) => parseFloat(item.revenue)),
          smooth: true,
        },
      ],
    }),
    [dailyStats]
  );
};
