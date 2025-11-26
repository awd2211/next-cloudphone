import { memo, useMemo } from 'react';
import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
import { Empty, theme } from 'antd';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
  loading?: boolean;
}

const UserGrowthChart = memo(({ data, loading }: UserGrowthChartProps) => {
  const { token } = theme.useToken();

  // ✅ 使用 useMemo 缓存 option
  const option: ECOption | null = useMemo(() => {
    // 健壮处理：支持直接数组或 { data: [...] } 格式
    const normalizedData = Array.isArray(data)
      ? data
      : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data))
        ? (data as any).data
        : [];

    if (normalizedData.length === 0) return null;

    const dates = normalizedData.map((item: UserGrowthData) => item.date);
    const newUsers = normalizedData.map((item: UserGrowthData) => item.newUsers);
    const totalUsers = normalizedData.map((item: UserGrowthData) => item.totalUsers);

    return {
    title: {
      text: '用户增长趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: NEUTRAL_LIGHT.text.tertiary,
        },
      },
    },
    legend: {
      data: ['新增用户', '总用户数'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}-${date.getDate()}`;
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '新增用户',
        position: 'left',
        axisLabel: {
          formatter: '{value} 人',
        },
      },
      {
        type: 'value',
        name: '总用户数',
        position: 'right',
        axisLabel: {
          formatter: '{value} 人',
        },
      },
    ],
    series: [
      {
        name: '新增用户',
        type: 'bar',
        data: newUsers,
        itemStyle: {
          color: token.colorPrimary,
        },
        barMaxWidth: 40,
      },
      {
        name: '总用户数',
        type: 'line',
        yAxisIndex: 1,
        data: totalUsers,
        smooth: true,
        itemStyle: {
          color: SEMANTIC.success.main,
        },
        lineStyle: {
          width: 3,
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
                color: `${SEMANTIC.success.main}4D`,  // 30% opacity
              },
              {
                offset: 1,
                color: `${SEMANTIC.success.main}0D`,  // 5% opacity
              },
            ],
          },
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

UserGrowthChart.displayName = 'UserGrowthChart';

export default UserGrowthChart;
