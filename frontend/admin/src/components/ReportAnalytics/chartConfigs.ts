import { useMemo } from 'react';
import dayjs from 'dayjs';
import { generateHeatmapData } from './constants';

/**
 * 收入趋势图配置
 */
export const useRevenueChartOption = (
  dailyStats: Array<{ date: string; revenue: number; orders: number }>
) => {
  return useMemo(
    () => ({
      title: { text: '收入趋势' },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: { data: ['收入', '订单数'] },
      xAxis: {
        type: 'category',
        data: dailyStats?.map((item) => dayjs(item.date).format('MM-DD')) || [],
      },
      yAxis: [
        { type: 'value', name: '收入(元)', position: 'left' },
        { type: 'value', name: '订单数', position: 'right' },
      ],
      series: [
        {
          name: '收入',
          type: 'line',
          smooth: true,
          data: dailyStats?.map((item) => item.revenue) || [],
          itemStyle: { color: '#5470c6' },
          areaStyle: { opacity: 0.3 },
        },
        {
          name: '订单数',
          type: 'bar',
          yAxisIndex: 1,
          data: dailyStats?.map((item) => item.orders) || [],
          itemStyle: { color: '#91cc75' },
        },
      ],
    }),
    [dailyStats]
  );
};

/**
 * 用户增长图配置
 */
export const useUserGrowthChartOption = (
  userGrowthData: Array<{ date: string; count: number }>
) => {
  return useMemo(
    () => ({
      title: { text: '用户增长趋势' },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: userGrowthData.map((item) => dayjs(item.date).format('MM-DD')),
      },
      yAxis: {
        type: 'value',
        name: '用户数',
      },
      series: [
        {
          name: '新增用户',
          type: 'line',
          smooth: true,
          data: userGrowthData.map((item) => item.count),
          itemStyle: { color: '#ee6666' },
          areaStyle: { opacity: 0.3 },
        },
      ],
    }),
    [userGrowthData]
  );
};

/**
 * 设备状态分布图配置
 */
export const useDeviceStatusChartOption = (deviceData: {
  running: number;
  idle: number;
  stopped: number;
}) => {
  return useMemo(
    () => ({
      title: { text: '设备状态分布', left: 'center' },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '设备状态',
          type: 'pie',
          radius: '50%',
          data: [
            { value: deviceData.running, name: '运行中', itemStyle: { color: '#91cc75' } },
            { value: deviceData.idle, name: '空闲', itemStyle: { color: '#5470c6' } },
            { value: deviceData.stopped, name: '已停止', itemStyle: { color: '#ee6666' } },
          ],
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
    [deviceData]
  );
};

/**
 * 套餐分布图配置
 */
export const usePlanDistributionChartOption = (
  planData: Array<{ planName: string; userCount: number }>
) => {
  return useMemo(
    () => ({
      title: { text: '套餐用户分布', left: 'center' },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: '套餐',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold',
            },
          },
          data: planData.map((item) => ({
            value: item.userCount,
            name: item.planName,
          })),
        },
      ],
    }),
    [planData]
  );
};

/**
 * 热力图配置 - 订单时段分布
 */
export const useHeatmapChartOption = () => {
  return useMemo(
    () => ({
      title: { text: '订单时段分布' },
      tooltip: {
        position: 'top',
      },
      grid: {
        height: '50%',
        top: '10%',
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        splitArea: {
          show: true,
        },
      },
      yAxis: {
        type: 'category',
        data: ['周日', '周六', '周五', '周四', '周三', '周二', '周一'],
        splitArea: {
          show: true,
        },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%',
      },
      series: [
        {
          name: '订单数',
          type: 'heatmap',
          data: generateHeatmapData(),
          label: {
            show: true,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    }),
    []
  );
};
