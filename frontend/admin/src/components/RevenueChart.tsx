import { memo, useMemo } from 'react';
import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
import { Empty, theme } from 'antd';
import { PRIMARY, SEMANTIC } from '@/theme';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
}

const RevenueChart = memo(({ data, loading }: RevenueChartProps) => {
  const { token } = theme.useToken();

  // ✅ 使用 useMemo 缓存 option，避免每次渲染重建
  const option: ECOption = useMemo(() => {
    // 健壮处理：支持直接数组或 { data: [...] } 格式
    const normalizedData = Array.isArray(data)
      ? data
      : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data))
        ? (data as any).data
        : [];

    if (normalizedData.length === 0) return null;

    return {
    title: {
      text: '收入趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
    },
    legend: {
      data: ['收入', '订单数'],
      top: 30,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: normalizedData.map((item: RevenueData) => item.date),
    },
    yAxis: [
      {
        type: 'value',
        name: '收入 (元)',
        position: 'left',
        axisLabel: {
          formatter: '¥{value}',
        },
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right',
        axisLabel: {
          formatter: '{value} 单',
        },
      },
    ],
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        data: normalizedData.map((item: RevenueData) => item.revenue),
        itemStyle: {
          color: token.colorPrimary,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: `${PRIMARY.main}4D`,  // 30% opacity
              },
              {
                offset: 1,
                color: `${PRIMARY.main}0D`,  // 5% opacity
              },
            ],
          },
        },
      },
      {
        name: '订单数',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: normalizedData.map((item: RevenueData) => item.orders),
        itemStyle: {
          color: SEMANTIC.success.main,
        },
      },
    ],
  };
  }, [data, token.colorPrimary]);

  if (!option) {
    return <Empty description="暂无数据" />;
  }

  return <ReactECharts option={option} style={{ height: '400px' }} showLoading={loading} />;
});

RevenueChart.displayName = 'RevenueChart';

export default RevenueChart;
