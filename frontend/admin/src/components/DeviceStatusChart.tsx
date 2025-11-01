import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
import { Empty } from 'antd';

interface DeviceStatusData {
  status: string;
  count: number;
}

interface DeviceStatusChartProps {
  data: DeviceStatusData[];
  loading?: boolean;
}

const DeviceStatusChart = ({ data, loading }: DeviceStatusChartProps) => {
  if (!data || data.length === 0) {
    return <Empty description="暂无数据" />;
  }

  const statusMap: Record<string, { name: string; color: string }> = {
    idle: { name: '空闲', color: '#d9d9d9' },
    running: { name: '运行中', color: '#52c41a' },
    stopped: { name: '已停止', color: '#ff4d4f' },
    error: { name: '错误', color: '#faad14' },
  };

  const chartData = data.map((item) => ({
    value: item.count,
    name: statusMap[item.status]?.name || item.status,
    itemStyle: {
      color: statusMap[item.status]?.color || '#d9d9d9',
    },
  }));

  const option: ECOption = {
    title: {
      text: '设备状态分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
    },
    series: [
      {
        name: '设备状态',
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
            fontSize: 24,
            fontWeight: 'bold',
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

export default DeviceStatusChart;
