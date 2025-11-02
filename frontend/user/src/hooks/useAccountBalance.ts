import { useState, useMemo, useCallback } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Typography, Tag, Text as AntdText } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 交易记录类型
 */
export interface Transaction {
  id: string;
  type: 'recharge' | 'consumption' | 'refund' | 'adjustment';
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
  status: 'success' | 'pending' | 'failed';
}

/**
 * 余额趋势数据类型
 */
export interface BalanceTrend {
  date: string;
  balance: number;
}

/**
 * 余额数据类型
 */
export interface BalanceData {
  current: number;
  yesterday: number;
  monthStart: number;
  monthConsumption: number;
  avgDailyConsumption: number;
  forecastDaysLeft: number;
  lowBalanceThreshold: number;
  alertEnabled: boolean;
}

/**
 * 自定义 Hook - 账户余额业务逻辑
 */
export const useAccountBalance = () => {
  const [loading, setLoading] = useState(false);
  const [alertSettingsVisible, setAlertSettingsVisible] = useState(false);
  const [form] = Form.useForm();

  // 当前余额和统计数据
  const [balanceData] = useState<BalanceData>({
    current: 1580.5,
    yesterday: 1632.3,
    monthStart: 2050.0,
    monthConsumption: 469.5,
    avgDailyConsumption: 15.65,
    forecastDaysLeft: 101,
    lowBalanceThreshold: 100,
    alertEnabled: true,
  });

  // 余额趋势数据（最近30天）
  const balanceTrend = useMemo<BalanceTrend[]>(() => {
    const data: BalanceTrend[] = [];
    let balance = 2050;
    for (let i = 30; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      balance -= Math.random() * 20 + 5; // 模拟每天消费 5-25 元
      if (i === 15) balance += 500; // 模拟中途充值
      data.push({ date, balance: parseFloat(balance.toFixed(2)) });
    }
    return data;
  }, []);

  // 交易记录
  const [transactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'consumption',
      amount: -51.8,
      balance: 1580.5,
      description: '设备使用费 (2024-03-15)',
      createdAt: '2024-03-15T23:59:59Z',
      status: 'success',
    },
    {
      id: '2',
      type: 'consumption',
      amount: -48.2,
      balance: 1632.3,
      description: '设备使用费 (2024-03-14)',
      createdAt: '2024-03-14T23:59:59Z',
      status: 'success',
    },
    {
      id: '3',
      type: 'recharge',
      amount: 500.0,
      balance: 1680.5,
      description: '在线充值',
      createdAt: '2024-03-13T10:30:00Z',
      status: 'success',
    },
    {
      id: '4',
      type: 'consumption',
      amount: -45.3,
      balance: 1180.5,
      description: '设备使用费 (2024-03-13)',
      createdAt: '2024-03-13T23:59:59Z',
      status: 'success',
    },
    {
      id: '5',
      type: 'consumption',
      amount: -52.1,
      balance: 1225.8,
      description: '设备使用费 (2024-03-12)',
      createdAt: '2024-03-12T23:59:59Z',
      status: 'success',
    },
    {
      id: '6',
      type: 'refund',
      amount: 30.0,
      balance: 1277.9,
      description: '退款 - 设备故障补偿',
      createdAt: '2024-03-11T15:20:00Z',
      status: 'success',
    },
    {
      id: '7',
      type: 'consumption',
      amount: -49.8,
      balance: 1247.9,
      description: '设备使用费 (2024-03-11)',
      createdAt: '2024-03-11T23:59:59Z',
      status: 'success',
    },
    {
      id: '8',
      type: 'consumption',
      amount: -46.5,
      balance: 1297.7,
      description: '设备使用费 (2024-03-10)',
      createdAt: '2024-03-10T23:59:59Z',
      status: 'success',
    },
  ]);

  // 计算余额变化
  const balanceChange = useMemo(
    () => balanceData.current - balanceData.yesterday,
    [balanceData.current, balanceData.yesterday]
  );

  const balanceChangePercent = useMemo(
    () => Math.abs((balanceChange / balanceData.yesterday) * 100).toFixed(2),
    [balanceChange, balanceData.yesterday]
  );

  // 计算本月消费百分比
  const monthConsumptionPercent = useMemo(
    () => ((balanceData.monthConsumption / balanceData.monthStart) * 100).toFixed(1),
    [balanceData.monthConsumption, balanceData.monthStart]
  );

  // 余额预警状态
  const isLowBalance = useMemo(
    () => balanceData.current < balanceData.lowBalanceThreshold,
    [balanceData.current, balanceData.lowBalanceThreshold]
  );

  // 交易类型配置
  const transactionTypeConfig = useMemo(
    () => ({
      recharge: { text: '充值', color: 'green', icon: <ArrowUpOutlined /> },
      consumption: { text: '消费', color: 'red', icon: <ArrowDownOutlined /> },
      refund: { text: '退款', color: 'blue', icon: <ArrowUpOutlined /> },
      adjustment: { text: '调整', color: 'orange', icon: <DollarOutlined /> },
    }),
    []
  );

  // 表格列定义
  const columns: ColumnsType<Transaction> = useMemo(
    () => [
      {
        title: '交易时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 180,
        render: (text) => <Text>{dayjs(text).format('YYYY-MM-DD HH:mm:ss')}</Text>,
      },
      {
        title: '交易类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (type: keyof typeof transactionTypeConfig) => {
          const config = transactionTypeConfig[type];
          return (
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
          );
        },
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
      },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        align: 'right',
        render: (amount: number) => (
          <Text
            strong
            style={{
              color: amount > 0 ? '#52c41a' : '#ff4d4f',
              fontSize: 15,
            }}
          >
            {amount > 0 ? '+' : ''}¥{Math.abs(amount).toFixed(2)}
          </Text>
        ),
      },
      {
        title: '余额',
        dataIndex: 'balance',
        key: 'balance',
        width: 120,
        align: 'right',
        render: (balance: number) => <Text>¥{balance.toFixed(2)}</Text>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 90,
        render: (status: string) => {
          const statusConfig = {
            success: { text: '成功', color: 'success' },
            pending: { text: '处理中', color: 'processing' },
            failed: { text: '失败', color: 'error' },
          };
          const config = statusConfig[status as keyof typeof statusConfig];
          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
    ],
    [transactionTypeConfig]
  );

  // 余额趋势图表配置
  const lineChartConfig = useMemo(
    () => ({
      data: balanceTrend,
      xField: 'date',
      yField: 'balance',
      smooth: true,
      height: 300,
      xAxis: {
        type: 'time' as const,
        label: {
          formatter: (text: string) => dayjs(text).format('MM-DD'),
        },
      },
      yAxis: {
        label: {
          formatter: (text: string) => `¥${text}`,
        },
      },
      tooltip: {
        formatter: (datum: BalanceTrend) => ({
          name: '余额',
          value: `¥${datum.balance.toFixed(2)}`,
        }),
      },
      point: {
        size: 3,
        shape: 'circle',
      },
      color: '#1890ff',
      areaStyle: {
        fill: 'l(270) 0:#ffffff 0.5:#d9e8ff 1:#1890ff',
        fillOpacity: 0.3,
      },
    }),
    [balanceTrend]
  );

  // 刷新数据
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  // 打开预警设置
  const handleOpenAlertSettings = useCallback(() => {
    form.setFieldsValue({
      enabled: balanceData.alertEnabled,
      threshold: balanceData.lowBalanceThreshold,
      notifyMethod: ['email', 'sms'],
    });
    setAlertSettingsVisible(true);
  }, [form, balanceData.alertEnabled, balanceData.lowBalanceThreshold]);

  // 保存预警设置
  const handleSaveAlertSettings = useCallback(async () => {
    try {
      const values = await form.validateFields();
      console.log('Alert settings:', values);
      setAlertSettingsVisible(false);
      // TODO: 保存到后端
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [form]);

  const handleCloseAlertSettings = useCallback(() => {
    setAlertSettingsVisible(false);
  }, []);

  return {
    loading,
    balanceData,
    balanceTrend,
    transactions,
    balanceChange,
    balanceChangePercent,
    monthConsumptionPercent,
    isLowBalance,
    columns,
    lineChartConfig,
    alertSettingsVisible,
    form,
    handleRefresh,
    handleOpenAlertSettings,
    handleSaveAlertSettings,
    handleCloseAlertSettings,
  };
};
