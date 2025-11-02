import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Space, Alert } from 'antd';
import {
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import ReactECharts from '@/components/ReactECharts';
import type { ECOption } from '@/utils/echarts';
import { useNavigate } from 'react-router-dom';

interface BalanceData {
  currentBalance: number;
  frozenBalance: number;
  totalRecharge: number;
  totalConsumption: number;
  monthlyRecharge: number;
  monthlyConsumption: number;
}

const BalanceOverview: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceData>({
    currentBalance: 15620.5,
    frozenBalance: 320.0,
    totalRecharge: 50000.0,
    totalConsumption: 34379.5,
    monthlyRecharge: 8000.0,
    monthlyConsumption: 6542.3,
  });

  // 余额趋势图
  const getBalanceTrendOption = () => ({
    title: { text: '余额变化趋势', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
    },
    yAxis: { type: 'value', name: '金额(元)' },
    series: [
      {
        name: '账户余额',
        type: 'line',
        data: [12000, 14500, 13800, 15200, 14600, 16100, 15620],
        smooth: true,
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '冻结金额',
        type: 'line',
        data: [200, 150, 280, 320, 240, 300, 320],
        smooth: true,
        itemStyle: { color: '#faad14' },
      },
    ],
  });

  // 收支统计图
  const getRevenueExpenseOption = () => ({
    title: { text: '本月收支统计', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['第1周', '第2周', '第3周', '第4周'],
    },
    yAxis: { type: 'value', name: '金额(元)' },
    series: [
      {
        name: '充值',
        type: 'bar',
        data: [2200, 1800, 2500, 1500],
        itemStyle: { color: '#52c41a' },
      },
      {
        name: '消费',
        type: 'bar',
        data: [1650, 1420, 1872, 1600],
        itemStyle: { color: '#ff4d4f' },
      },
    ],
  });

  // 消费分布饼图
  const getConsumptionDistributionOption = () => ({
    title: { text: '本月消费分布', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '消费类型',
        type: 'pie',
        radius: '60%',
        data: [
          { value: 2800, name: '设备租赁' },
          { value: 1500, name: 'CPU 使用' },
          { value: 1200, name: '内存使用' },
          { value: 800, name: '存储费用' },
          { value: 242.3, name: '其他' },
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
  });

  const isLowBalance = balanceData.currentBalance < 1000;

  return (
    <div>
      {isLowBalance && (
        <Alert
          message="余额不足提醒"
          description="您的账户余额已低于 1,000 元，请及时充值以避免服务中断。"
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={() => navigate('/billing/recharge')}>
              立即充值
            </Button>
          }
        />
      )}

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="当前余额"
              value={balanceData.currentBalance}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
              suffix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="冻结金额"
              value={balanceData.frozenBalance}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月充值"
              value={balanceData.monthlyRecharge}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
              suffix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月消费"
              value={balanceData.monthlyConsumption}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
              suffix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="累计充值"
              value={balanceData.totalRecharge}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累计消费"
              value={balanceData.totalConsumption}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Space>
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => navigate('/billing/recharge')}
              >
                账户充值
              </Button>
              <Button onClick={() => navigate('/billing/transactions')}>交易记录</Button>
              <Button onClick={() => navigate('/billing/invoices')}>账单管理</Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card>
            <ReactECharts option={getBalanceTrendOption()} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <ReactECharts option={getRevenueExpenseOption()} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card>
            <ReactECharts option={getConsumptionDistributionOption()} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BalanceOverview;
