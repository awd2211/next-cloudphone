import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Space,
  Spin,
  message,
  Table,
  Tag,
  Result,
  Button,
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  RiseOutlined,
  LockOutlined,
} from '@ant-design/icons';
import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import {
  getPaymentStatistics,
  getPaymentMethodsStats,
  getDailyStatistics,
  type PaymentStatistics,
  type PaymentMethodStat,
  type DailyStat,
} from '@/services/payment-admin';

const { RangePicker } = DatePicker;

const PaymentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionLoading } = usePermission();

  // 权限检查
  if (permissionLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="正在加载权限..." />
      </div>
    );
  }

  if (!hasPermission('payment:dashboard:view')) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面。"
          icon={<LockOutlined />}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  return <PaymentDashboardContent />;
};

const PaymentDashboardContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
  const [methodStats, setMethodStats] = useState<PaymentMethodStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // 加载统计数据
  const loadStatistics = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const [statsRes, methodsRes, dailyRes] = await Promise.all([
        getPaymentStatistics(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getPaymentMethodsStats(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')),
        getDailyStatistics(30),
      ]);

      setStatistics(statsRes.data);
      setMethodStats(methodsRes.data);
      setDailyStats(dailyRes.data);
    } catch (error) {
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  // 支付方式饼图配置
  const paymentMethodChartOption = {
    title: {
      text: '支付方式占比',
      left: 'center',
    },
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
        name: '支付方式',
        type: 'pie',
        radius: '50%',
        data: methodStats.map((item) => ({
          name: getMethodName(item.method),
          value: item.count,
        })),
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

  // 每日趋势图配置
  const dailyTrendChartOption = {
    title: {
      text: '每日交易趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['交易量', '成功交易', '收入'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dailyStats.map((item) => dayjs(item.date).format('MM-DD')),
    },
    yAxis: [
      {
        type: 'value',
        name: '交易量',
      },
      {
        type: 'value',
        name: '收入',
      },
    ],
    series: [
      {
        name: '交易量',
        type: 'line',
        data: dailyStats.map((item) => item.totalTransactions),
        smooth: true,
      },
      {
        name: '成功交易',
        type: 'line',
        data: dailyStats.map((item) => item.successfulTransactions),
        smooth: true,
      },
      {
        name: '收入',
        type: 'line',
        yAxisIndex: 1,
        data: dailyStats.map((item) => parseFloat(item.revenue)),
        smooth: true,
      },
    ],
  };

  // 支付方式表格列
  const methodColumns = [
    {
      title: '支付方式',
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => getMethodTag(method),
    },
    {
      title: '交易笔数',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: '交易占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage: string) => `${percentage}%`,
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: string) => `¥${amount}`,
    },
    {
      title: '金额占比',
      dataIndex: 'amountPercentage',
      key: 'amountPercentage',
      render: (percentage: string) => `${percentage}%`,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 日期筛选 */}
        <Card>
          <Space>
            <span>日期范围：</span>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
              format="YYYY-MM-DD"
            />
          </Space>
        </Card>

        <Spin spinning={loading}>
          {/* 统计卡片 */}
          {statistics && (
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="总交易量"
                    value={statistics.overview.totalTransactions}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="成功率"
                    value={parseFloat(statistics.overview.successRate)}
                    precision={2}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={parseFloat(statistics.revenue.totalRevenue)}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#1890ff' }}
                    suffix={
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        <br />
                        <small>净收入: ¥{statistics.revenue.netRevenue}</small>
                      </span>
                    }
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="退款金额"
                    value={parseFloat(statistics.revenue.totalRefunded)}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#cf1322' }}
                    suffix={
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        <br />
                        <small>{statistics.overview.refundedTransactions} 笔</small>
                      </span>
                    }
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* 图表 */}
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card>
                <ReactECharts option={paymentMethodChartOption} style={{ height: 400 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card>
                <ReactECharts option={dailyTrendChartOption} style={{ height: 400 }} />
              </Card>
            </Col>
          </Row>

          {/* 支付方式详情表格 */}
          <Card title="支付方式详情">
            <Table
              columns={methodColumns}
              dataSource={methodStats}
              rowKey="method"
              pagination={false}
            />
          </Card>
        </Spin>
      </Space>
    </div>
  );
};

// 辅助函数：获取支付方式名称
const getMethodName = (method: string): string => {
  const methodMap: Record<string, string> = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    paddle: 'Paddle',
    wechat: '微信支付',
    alipay: '支付宝',
    balance: '余额支付',
  };
  return methodMap[method] || method;
};

// 辅助函数：获取支付方式标签
const getMethodTag = (method: string) => {
  const methodConfig: Record<string, { color: string; text: string }> = {
    stripe: { color: 'purple', text: 'Stripe' },
    paypal: { color: 'blue', text: 'PayPal' },
    paddle: { color: 'cyan', text: 'Paddle' },
    wechat: { color: 'green', text: '微信支付' },
    alipay: { color: 'blue', text: '支付宝' },
    balance: { color: 'orange', text: '余额支付' },
  };
  const config = methodConfig[method] || { color: 'default', text: method };
  return <Tag color={config.color}>{config.text}</Tag>;
};

export default PaymentDashboard;
