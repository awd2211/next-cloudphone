import { memo, useMemo } from 'react';
import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
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

// ✅ 提取颜色数组为常量
const CHART_COLORS = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'];

const PlanDistributionChart = memo(({ data, loading }: PlanDistributionChartProps) => {
  // ✅ 使用 useMemo 缓存 option
  const option: ECOption | null = useMemo(() => {
    if (!data || data.length === 0) return null;

    const chartData = data.map((item, index) => ({
      value: item.userCount,
      name: item.planName,
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length],
      },
      revenue: item.revenue,
    }));

    return {
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
  }, [data]);

  if (!option) {
    return <Empty description="暂无数据" />;
  }

  return <ReactECharts option={option} style={{ height: '400px' }} showLoading={loading} />;
});

PlanDistributionChart.displayName = 'PlanDistributionChart';

export default PlanDistributionChart;
