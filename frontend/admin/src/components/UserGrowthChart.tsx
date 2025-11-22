import { memo, useMemo } from 'react';
import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
import { Empty, theme } from 'antd';

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
    if (!data || data.length === 0) return null;

    const dates = data.map((item) => item.date);
    const newUsers = data.map((item) => item.newUsers);
    const totalUsers = data.map((item) => item.totalUsers);

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
          color: '#999',
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
          color: '#52c41a',
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
                color: 'rgba(82, 196, 26, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(82, 196, 26, 0.05)',
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
