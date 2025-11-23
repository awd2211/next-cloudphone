import { memo, useMemo } from 'react';
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

// ✅ 提取状态映射为常量
const STATUS_MAP: Record<string, { name: string; color: string }> = {
  idle: { name: '空闲', color: '#d9d9d9' },
  running: { name: '运行中', color: '#52c41a' },
  stopped: { name: '已停止', color: '#ff4d4f' },
  error: { name: '错误', color: '#faad14' },
};

const DeviceStatusChart = memo(({ data, loading }: DeviceStatusChartProps) => {
  // ✅ 使用 useMemo 缓存 option
  const option: ECOption | null = useMemo(() => {
    // 健壮处理：支持直接数组或 { data: [...] } 格式
    const normalizedData = Array.isArray(data)
      ? data
      : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data))
        ? (data as any).data
        : [];

    if (normalizedData.length === 0) return null;

    const chartData = normalizedData.map((item: DeviceStatusData) => ({
      value: item.count,
      name: STATUS_MAP[item.status]?.name || item.status,
      itemStyle: {
        color: STATUS_MAP[item.status]?.color || '#d9d9d9',
      },
    }));

    return {
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
  }, [data]);

  if (!option) {
    return <Empty description="暂无数据" />;
  }

  return <ReactECharts option={option} style={{ height: '400px' }} showLoading={loading} />;
});

DeviceStatusChart.displayName = 'DeviceStatusChart';

export default DeviceStatusChart;
