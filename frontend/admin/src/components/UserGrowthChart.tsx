import ReactECharts from 'echarts-for-react';
import { Empty } from 'antd';

interface UserGrowthData {
  date: string;
  newUsers: number;
  totalUsers: number;
}

interface UserGrowthChartProps {
  data: UserGrowthData[];
  loading?: boolean;
}

const UserGrowthChart = ({ data, loading }: UserGrowthChartProps) => {
  if (!data || data.length === 0) {
    return <Empty description="暂无数据" />;
  }

  const dates = data.map((item) => item.date);
  const newUsers = data.map((item) => item.newUsers);
  const totalUsers = data.map((item) => item.totalUsers);

  const option = {
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
          color: '#1890ff',
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

  return (
    <ReactECharts
      option={option}
      style={{ height: '400px' }}
      showLoading={loading}
    />
  );
};

export default UserGrowthChart;
