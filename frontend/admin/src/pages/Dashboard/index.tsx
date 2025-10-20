import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { MobileOutlined, UserOutlined, AppstoreOutlined, CloudServerOutlined, DollarOutlined, ShoppingOutlined } from '@ant-design/icons';
import { getDashboardStats } from '@/services/stats';
import { getRevenueStats } from '@/services/billing';
import { getDeviceStats } from '@/services/device';
import type { DashboardStats } from '@/types';
import RevenueChart from '@/components/RevenueChart';
import DeviceStatusChart from '@/components/DeviceStatusChart';
import dayjs from 'dayjs';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>();
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [deviceStatusData, setDeviceStatusData] = useState<any[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    setChartsLoading(true);
    try {
      // 加载近7天收入数据
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
      const revenueRes = await getRevenueStats(startDate, endDate);
      setRevenueData(revenueRes.dailyStats || []);

      // 加载设备状态数据
      const deviceRes = await getDeviceStats();
      const statusData = [
        { status: 'idle', count: deviceRes.idle || 0 },
        { status: 'running', count: deviceRes.running || 0 },
        { status: 'stopped', count: deviceRes.stopped || 0 },
      ].filter(item => item.count > 0);
      setDeviceStatusData(statusData);
    } catch (error) {
      console.error('加载图表数据失败', error);
    } finally {
      setChartsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadChartData();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>仪表盘</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="总设备数" value={stats?.totalDevices || 0} prefix={<MobileOutlined />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="在线设备" value={stats?.onlineDevices || 0} prefix={<CloudServerOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="用户总数" value={stats?.totalUsers || 0} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="应用总数" value={stats?.totalApps || 0} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="今日收入" value={stats?.todayRevenue || 0} prefix="¥" precision={2} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="本月收入" value={stats?.monthRevenue || 0} prefix="¥" precision={2} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="今日订单" value={stats?.todayOrders || 0} prefix={<ShoppingOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="本月订单" value={stats?.monthOrders || 0} prefix={<ShoppingOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="近7天收入趋势">
            <RevenueChart data={revenueData} loading={chartsLoading} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="设备状态分布">
            <DeviceStatusChart data={deviceStatusData} loading={chartsLoading} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
