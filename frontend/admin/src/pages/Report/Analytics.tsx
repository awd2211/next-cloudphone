import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Space, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, MobileOutlined, DollarOutlined, ShoppingOutlined } from '@ant-design/icons';
import { EChartsLazy } from '@/components/LazyComponents';
import dayjs from 'dayjs';
import { getRevenueStats } from '@/services/billing';
import { getDashboardStats, getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getDeviceStats } from '@/services/device';

const { RangePicker } = DatePicker;

const Analytics = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  // 统计数据
  const [revenueData, setRevenueData] = useState<any>({ totalRevenue: 0, dailyStats: [] });
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any>({ total: 0, running: 0, idle: 0, stopped: 0 });
  const [planData, setPlanData] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载收入数据
      const revenueRes = await getRevenueStats(dateRange[0], dateRange[1]);
      setRevenueData(revenueRes);

      // 加载用户增长数据
      const userRes = await getUserGrowthStats(30);
      setUserGrowthData(userRes || []);

      // 加载设备数据
      const deviceRes = await getDeviceStats();
      setDeviceData(deviceRes);

      // 加载套餐分布数据
      const planRes = await getPlanDistributionStats();
      setPlanData(planRes || []);
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange, period]);

  // 收入趋势图
  const revenueChartOption = {
    title: { text: '收入趋势' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: { data: ['收入', '订单数'] },
    xAxis: {
      type: 'category',
      data: revenueData.dailyStats?.map((item: any) => dayjs(item.date).format('MM-DD')) || [],
    },
    yAxis: [
      { type: 'value', name: '收入(元)', position: 'left' },
      { type: 'value', name: '订单数', position: 'right' },
    ],
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        data: revenueData.dailyStats?.map((item: any) => item.revenue) || [],
        itemStyle: { color: '#5470c6' },
        areaStyle: { opacity: 0.3 },
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        data: revenueData.dailyStats?.map((item: any) => item.orders) || [],
        itemStyle: { color: '#91cc75' },
      },
    ],
  };

  // 用户增长图
  const userGrowthChartOption = {
    title: { text: '用户增长趋势' },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: userGrowthData.map((item: any) => dayjs(item.date).format('MM-DD')),
    },
    yAxis: {
      type: 'value',
      name: '用户数',
    },
    series: [
      {
        name: '新增用户',
        type: 'line',
        smooth: true,
        data: userGrowthData.map((item: any) => item.count),
        itemStyle: { color: '#ee6666' },
        areaStyle: { opacity: 0.3 },
      },
    ],
  };

  // 设备状态分布图
  const deviceStatusChartOption = {
    title: { text: '设备状态分布', left: 'center' },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '设备状态',
        type: 'pie',
        radius: '50%',
        data: [
          { value: deviceData.running, name: '运行中', itemStyle: { color: '#91cc75' } },
          { value: deviceData.idle, name: '空闲', itemStyle: { color: '#5470c6' } },
          { value: deviceData.stopped, name: '已停止', itemStyle: { color: '#ee6666' } },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // 套餐分布图
  const planDistributionChartOption = {
    title: { text: '套餐用户分布', left: 'center' },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '套餐',
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
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        data: planData.map((item: any) => ({
          value: item.userCount,
          name: item.planName,
        })),
      },
    ],
  };

  // 热力图 - 按小时统计订单
  const heatmapOption = {
    title: { text: '订单时段分布' },
    tooltip: {
      position: 'top',
    },
    grid: {
      height: '50%',
      top: '10%',
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: 'category',
      data: ['周日', '周六', '周五', '周四', '周三', '周二', '周一'],
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%',
    },
    series: [
      {
        name: '订单数',
        type: 'heatmap',
        data: generateHeatmapData(),
        label: {
          show: true,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  // 生成模拟热力图数据
  function generateHeatmapData() {
    const data = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 24; j++) {
        data.push([j, i, Math.floor(Math.random() * 100)]);
      }
    }
    return data;
  }

  return (
    <div>
      <h2>数据分析</h2>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <RangePicker
            value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
            onChange={(dates) => {
              if (dates) {
                setDateRange([
                  dates[0]!.format('YYYY-MM-DD'),
                  dates[1]!.format('YYYY-MM-DD'),
                ]);
              }
            }}
          />
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 120 }}
          >
            <Select.Option value="day">按天</Select.Option>
            <Select.Option value="week">按周</Select.Option>
            <Select.Option value="month">按月</Select.Option>
          </Select>
        </Space>
      </Card>

      <Spin spinning={loading}>
        {/* 关键指标 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总收入"
                value={revenueData.totalRevenue || 0}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#3f8600' }}
                suffix={
                  <span style={{ fontSize: 14 }}>
                    <ArrowUpOutlined /> 12%
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总订单数"
                value={revenueData.totalOrders || 0}
                prefix={<ShoppingOutlined />}
                valueStyle={{ color: '#1890ff' }}
                suffix={
                  <span style={{ fontSize: 14 }}>
                    <ArrowUpOutlined /> 8%
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="设备总数"
                value={deviceData.total || 0}
                prefix={<MobileOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="平均订单金额"
                value={revenueData.avgOrderValue || 0}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 图表 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card>
              <EChartsLazy option={revenueChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card>
              <EChartsLazy option={deviceStatusChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={16}>
            <Card>
              <EChartsLazy option={userGrowthChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card>
              <EChartsLazy option={planDistributionChartOption} style={{ height: 400 }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24}>
            <Card>
              <EChartsLazy option={heatmapOption} style={{ height: 500 }} />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Analytics;
