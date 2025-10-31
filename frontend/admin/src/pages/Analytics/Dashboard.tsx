import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

const AnalyticsDashboard: React.FC = () => {
  // 费用趋势图
  const getCostTrendOption = () => ({
    title: { text: '费用趋势' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
    },
    yAxis: { type: 'value', name: '金额(元)' },
    series: [
      {
        name: '充值',
        type: 'line',
        data: [5000, 6200, 5800, 7100, 6500, 7800, 8200],
        smooth: true,
      },
      {
        name: '消费',
        type: 'line',
        data: [4200, 5100, 4800, 6200, 5800, 6900, 7100],
        smooth: true,
      },
    ],
  });

  // 工单统计饼图
  const getTicketStatsOption = () => ({
    title: { text: '工单状态分布', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: [
          { value: 15, name: '待处理' },
          { value: 28, name: '处理中' },
          { value: 45, name: '已解决' },
          { value: 12, name: '已关闭' },
        ],
      },
    ],
  });

  // 资源使用柱状图
  const getResourceUsageOption = () => ({
    title: { text: '资源使用统计' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['设备', 'CPU', '内存', '存储', '带宽'],
    },
    yAxis: { type: 'value', name: '使用率(%)' },
    series: [
      {
        name: '使用率',
        type: 'bar',
        data: [75, 65, 82, 58, 48],
        itemStyle: {
          color: (params: any) => {
            const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'];
            return colors[params.dataIndex];
          },
        },
      },
    ],
  });

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={1328}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
              suffix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月收入"
              value={82450}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃设备" value={856} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理工单"
              value={15}
              valueStyle={{ color: '#cf1322' }}
              suffix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card>
            <ReactECharts option={getCostTrendOption()} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <ReactECharts option={getTicketStatsOption()} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <ReactECharts option={getResourceUsageOption()} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AnalyticsDashboard;
