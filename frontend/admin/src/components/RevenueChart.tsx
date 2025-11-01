import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
import { Empty } from 'antd';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
}

const RevenueChart = ({ data, loading }: RevenueChartProps) => {
  if (!data || data.length === 0) {
    return <Empty description="暂无数据" />;
  }

  const option: ECOption = {
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
      data: data.map((item) => item.date),
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
        data: data.map((item) => item.revenue),
        itemStyle: {
          color: '#1890ff',
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
                color: 'rgba(24, 144, 255, 0.3)',
              },
              {
                offset: 1,
                color: 'rgba(24, 144, 255, 0.05)',
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
        data: data.map((item) => item.orders),
        itemStyle: {
          color: '#52c41a',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px' }} showLoading={loading} />;
};

export default RevenueChart;
