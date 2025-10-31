import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, Spin, Empty, DatePicker, Space, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { QuotaStatistics } from '@/types';
import * as quotaService from '@/services/quota';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface QuotaUsageTrendProps {
  /**
   * 用户ID
   */
  userId: string;

  /**
   * 图表高度 (默认: 400px)
   */
  height?: number;

  /**
   * 是否显示卡片容器 (默认: true)
   */
  showCard?: boolean;

  /**
   * 图表类型 (默认: 'line')
   */
  chartType?: 'line' | 'bar' | 'area';
}

/**
 * 配额使用趋势图表组件
 *
 * 功能:
 * 1. 显示用户配额使用趋势 (设备、CPU、内存、存储)
 * 2. 支持多种图表类型 (折线图、柱状图、面积图)
 * 3. 支持日期范围选择
 * 4. 支持指标筛选
 * 5. 自动计算使用率和预测
 */
const QuotaUsageTrend: React.FC<QuotaUsageTrendProps> = ({
  userId,
  height = 400,
  showCard = true,
  chartType = 'line',
}) => {
  const [statistics, setStatistics] = useState<QuotaStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'devices',
    'cpuCores',
    'memoryGB',
    'storageGB',
  ]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  // 加载使用统计
  const loadStatistics = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const result = await quotaService.getUsageStats(userId);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('加载使用统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [userId]);

  // 指标配置
  const metricOptions = [
    { label: '设备数', value: 'devices', color: '#1890ff' },
    { label: 'CPU(核)', value: 'cpuCores', color: '#52c41a' },
    { label: '内存(GB)', value: 'memoryGB', color: '#faad14' },
    { label: '存储(GB)', value: 'storageGB', color: '#f5222d' },
    { label: '带宽(Mbps)', value: 'bandwidthMbps', color: '#722ed1' },
    { label: '流量(GB)', value: 'trafficGB', color: '#13c2c2' },
  ];

  // 图表配置
  const chartOption = useMemo(() => {
    if (!statistics || !statistics.dailyUsage || statistics.dailyUsage.length === 0) {
      return null;
    }

    // 过滤日期范围内的数据
    const filteredData = statistics.dailyUsage.filter((item) => {
      const date = dayjs(item.date);
      return date.isAfter(dateRange[0]) && date.isBefore(dateRange[1].add(1, 'day'));
    });

    if (filteredData.length === 0) {
      return null;
    }

    // 构建系列数据
    const series = selectedMetrics.map((metric) => {
      const metricConfig = metricOptions.find((m) => m.value === metric);
      const seriesType = chartType === 'area' ? 'line' : chartType;

      return {
        name: metricConfig?.label || metric,
        type: seriesType,
        data: filteredData.map((item: any) => item[metric] || 0),
        smooth: chartType === 'line' || chartType === 'area',
        areaStyle: chartType === 'area' ? { opacity: 0.3 } : undefined,
        itemStyle: {
          color: metricConfig?.color,
        },
        lineStyle: {
          width: 2,
        },
      };
    });

    return {
      title: {
        text: '配额使用趋势',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
        formatter: (params: any) => {
          let tooltip = `<div style="font-weight: 600; margin-bottom: 8px;">${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            tooltip += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0;">
                <span>
                  ${param.marker}
                  ${param.seriesName}:
                </span>
                <span style="font-weight: 600; margin-left: 16px;">${param.value}</span>
              </div>
            `;
          });
          return tooltip;
        },
      },
      legend: {
        data: selectedMetrics.map(
          (metric) => metricOptions.find((m) => m.value === metric)?.label || metric
        ),
        bottom: 10,
        type: 'scroll',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: chartType === 'bar',
        data: filteredData.map((item) => dayjs(item.date).format('MM-DD')),
        axisLabel: {
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: '使用量',
        axisLabel: {
          formatter: '{value}',
        },
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          start: 0,
          end: 100,
          height: 20,
          bottom: 40,
        },
      ],
      series,
    };
  }, [statistics, selectedMetrics, chartType, dateRange]);

  // 使用率统计卡片
  const usageStatsOption = useMemo(() => {
    if (!statistics || !statistics.currentUsage) {
      return null;
    }

    const currentUsage = statistics.currentUsage;
    const data = [
      { name: '设备数', value: currentUsage.devices || 0 },
      { name: 'CPU(核)', value: currentUsage.cpuCores || 0 },
      { name: '内存(GB)', value: currentUsage.memoryGB || 0 },
      { name: '存储(GB)', value: currentUsage.storageGB || 0 },
    ];

    return {
      title: {
        text: '当前资源使用分布',
        left: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
      },
      series: [
        {
          name: '资源使用',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}: {c}',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          data,
        },
      ],
    };
  }, [statistics]);

  const chartContent = (
    <div>
      {/* 控制面板 */}
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          mode="multiple"
          placeholder="选择指标"
          value={selectedMetrics}
          onChange={setSelectedMetrics}
          style={{ minWidth: 300 }}
          options={metricOptions}
        />
        <RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
          format="YYYY-MM-DD"
        />
        <Button icon={<ReloadOutlined />} onClick={loadStatistics} loading={loading}>
          刷新
        </Button>
      </Space>

      {/* 趋势图 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="加载中..." />
        </div>
      ) : chartOption ? (
        <ReactECharts option={chartOption} style={{ height }} />
      ) : (
        <Empty description="暂无数据" style={{ padding: '100px 0' }} />
      )}

      {/* 使用率分布饼图 */}
      {usageStatsOption && (
        <div style={{ marginTop: 32 }}>
          <ReactECharts option={usageStatsOption} style={{ height: 300 }} />
        </div>
      )}
    </div>
  );

  if (showCard) {
    return (
      <Card title="配额使用趋势" bordered={false}>
        {chartContent}
      </Card>
    );
  }

  return chartContent;
};

export default QuotaUsageTrend;
