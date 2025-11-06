import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  RocketOutlined,
  AppstoreOutlined,
  PlusOutlined,
  DollarOutlined,
  StopOutlined,
} from '@ant-design/icons';

export interface DashboardData {
  devices: {
    total: number;
    running: number;
    stopped: number;
    error: number;
    quota: number;
  };
  apps: {
    installed: number;
    marketApps: number;
    recentInstalls: number;
  };
  billing: {
    balance: number;
    thisMonth: number;
    lastMonth: number;
    trend: 'up' | 'down';
  };
  usage: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export interface Activity {
  id: number;
  type: string;
  title: string;
  description: string;
  time: dayjs.Dayjs;
  icon: React.ReactNode;
  status: 'success' | 'warning' | 'error';
}

export const useDashboard = () => {
  const [loading, setLoading] = useState(false);

  // 模拟数据（实际应从API获取）
  const [dashboardData] = useState<DashboardData>({
    devices: {
      total: 25,
      running: 18,
      stopped: 5,
      error: 2,
      quota: 50,
    },
    apps: {
      installed: 156,
      marketApps: 320,
      recentInstalls: 12,
    },
    billing: {
      balance: 1580.5,
      thisMonth: 450.8,
      lastMonth: 398.2,
      trend: 'up',
    },
    usage: {
      today: 285,
      thisWeek: 1680,
      thisMonth: 6720,
    },
  });

  const [recentActivities] = useState<Activity[]>([
    {
      id: 1,
      type: 'device_start',
      title: '启动设备',
      description: '设备 "测试机-001" 已启动',
      time: dayjs().subtract(5, 'minute'),
      icon: <RocketOutlined style={{ color: '#52c41a' }} />,
      status: 'success',
    },
    {
      id: 2,
      type: 'app_install',
      title: '安装应用',
      description: '在设备 "测试机-002" 上安装了 "微信"',
      time: dayjs().subtract(15, 'minute'),
      icon: <AppstoreOutlined style={{ color: '#1890ff' }} />,
      status: 'success',
    },
    {
      id: 3,
      type: 'device_create',
      title: '创建设备',
      description: '创建了新设备 "测试机-025"',
      time: dayjs().subtract(1, 'hour'),
      icon: <PlusOutlined style={{ color: '#1890ff' }} />,
      status: 'success',
    },
    {
      id: 4,
      type: 'recharge',
      title: '账户充值',
      description: '充值 ¥500.00',
      time: dayjs().subtract(2, 'hour'),
      icon: <DollarOutlined style={{ color: '#52c41a' }} />,
      status: 'success',
    },
    {
      id: 5,
      type: 'device_stop',
      title: '停止设备',
      description: '设备 "测试机-010" 已停止',
      time: dayjs().subtract(3, 'hour'),
      icon: <StopOutlined style={{ color: '#faad14' }} />,
      status: 'warning',
    },
  ]);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  // 计算设备使用率
  const deviceUsageRate = Math.round(
    (dashboardData.devices.total / dashboardData.devices.quota) * 100
  );

  // 计算消费趋势百分比
  const spendingTrendPercent = Math.round(
    ((dashboardData.billing.thisMonth - dashboardData.billing.lastMonth) /
      dashboardData.billing.lastMonth) *
      100
  );

  return {
    loading,
    dashboardData,
    recentActivities,
    deviceUsageRate,
    spendingTrendPercent,
    handleRefresh,
  };
};
