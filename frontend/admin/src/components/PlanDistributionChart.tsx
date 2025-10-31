import ReactECharts from 'echarts-for-react';
import { Empty } from 'antd';

interface PlanDistributionData {
  planName: string;
  userCount: number;
  revenue: number;
}

interface PlanDistributionChartProps {
  data: PlanDistributionData[];
  loading?: boolean;
}

const PlanDistributionChart = ({ data, loading }: PlanDistributionChartProps) => {
  if (!data || data.length === 0) {
    return <Empty description="暂无数据" />;
  }

  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'];

  const chartData = data.map((item, index) => ({
    value: item.userCount,
    name: item.planName,
    itemStyle: {
      color: colors[index % colors.length],
    },
    revenue: item.revenue,
  }));

  const option = {
    title: {
      text: '套餐用户分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `
          ${params.name}<br/>
          用户数: ${params.value} 人 (${params.percent}%)<br/>
          收入: ¥${params.data.revenue.toFixed(2)}
        `;
      },
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      formatter: (name: string) => {
        const item = data.find((d) => d.planName === name);
        return `${name} (${item?.userCount || 0}人)`;
      },
    },
    series: [
      {
        name: '套餐分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
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
            fontSize: 24,
            fontWeight: 'bold',
            formatter: (params: any) => {
              return `${params.name}\n${params.value}人`;
            },
          },
        },
        labelLine: {
          show: false,
        },
        data: chartData,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px' }} showLoading={loading} />;
};

export default PlanDistributionChart;
