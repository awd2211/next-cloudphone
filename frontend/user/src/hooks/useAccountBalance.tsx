import { useState, useMemo, useCallback } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Typography, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined } from '@ant-design/icons';
import {
  useUserBalance,
  useBalanceTransactions,
  useBalanceStatistics,
  type BalanceTransaction,
} from './queries/useBalance';

const { Text } = Typography;

/**
 * 交易记录类型 (组件内部使用)
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
 * 余额数据类型 (组件内部使用)
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
 * 自定义 Hook - 账户余额业务逻辑 (React Query 版本)
 *
 * 迁移说明:
 * - ✅ 使用 React Query hooks 替换 mock 数据
 * - ✅ 对接真实后端 API
 * - ✅ 保留所有 UI 逻辑和优化
 */
export const useAccountBalance = () => {
  const [form] = Form.useForm();
  const [alertSettingsVisible, setAlertSettingsVisible] = useState(false);

  // 获取当前用户ID (从 localStorage 或认证上下文)
  // TODO: 替换为实际的用户认证方式
  const userId = localStorage.getItem('userId') || 'current-user-id';

  // React Query hooks - 获取真实数据
  const { data: balanceInfo, isLoading: balanceLoading, refetch: refetchBalance } = useUserBalance(userId);
  const { data: transactionsData, isLoading: transactionsLoading, refetch: refetchTransactions } = useBalanceTransactions(userId, {
    limit: 50,
  });
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useBalanceStatistics(userId);

  // 合并 loading 状态
  const loading = balanceLoading || transactionsLoading || statsLoading;

  // 转换余额数据为组件需要的格式
  const balanceData: BalanceData = useMemo(() => {
    if (!balanceInfo || !stats) {
      // 默认值
      return {
        current: 0,
        yesterday: 0,
        monthStart: 0,
        monthConsumption: 0,
        avgDailyConsumption: 0,
        forecastDaysLeft: 0,
        lowBalanceThreshold: 100,
        alertEnabled: true,
      };
    }

    return {
      current: balanceInfo.availableBalance,
      yesterday: stats.yesterdayBalance,
      monthStart: stats.monthStartBalance,
      monthConsumption: stats.monthConsumption,
      avgDailyConsumption: stats.avgDailyConsumption,
      forecastDaysLeft: stats.forecastDaysLeft,
      lowBalanceThreshold: balanceInfo.lowBalanceThreshold,
      alertEnabled: balanceInfo.alertEnabled,
    };
  }, [balanceInfo, stats]);

  // 转换交易记录为组件需要的格式
  const transactions: Transaction[] = useMemo(() => {
    if (!transactionsData?.data) return [];

    return transactionsData.data.map((tx: BalanceTransaction) => ({
      id: tx.id,
      type: mapTransactionType(tx.type),
      amount: tx.amount,
      balance: tx.balanceAfter,
      description: tx.description,
      createdAt: tx.createdAt,
      status: tx.status,
    }));
  }, [transactionsData]);

  // 生成余额趋势数据 (基于交易记录)
  const balanceTrend: BalanceTrend[] = useMemo(() => {
    if (!transactions.length) return [];

    // 按日期分组计算每日余额
    const dailyBalances = new Map<string, number>();

    transactions.forEach((tx) => {
      const date = dayjs(tx.createdAt).format('YYYY-MM-DD');
      dailyBalances.set(date, tx.balance);
    });

    // 生成最近 30 天的趋势数据
    const trend: BalanceTrend[] = [];
    let currentBalance = balanceData.current;

    for (let i = 0; i <= 30; i++) {
      const date = dayjs().subtract(30 - i, 'day').format('YYYY-MM-DD');
      const dayBalance = dailyBalances.get(date) || currentBalance;
      trend.push({ date, balance: dayBalance });
      currentBalance = dayBalance;
    }

    return trend;
  }, [transactions, balanceData.current]);

  // 计算余额变化
  const balanceChange = useMemo(
    () => balanceData.current - balanceData.yesterday,
    [balanceData.current, balanceData.yesterday]
  );

  const balanceChangePercent = useMemo(
    () => {
      if (balanceData.yesterday === 0) return '0.00';
      return Math.abs((balanceChange / balanceData.yesterday) * 100).toFixed(2);
    },
    [balanceChange, balanceData.yesterday]
  );

  // 计算本月消费百分比
  const monthConsumptionPercent = useMemo(
    () => {
      if (balanceData.monthStart === 0) return '0.0';
      return ((balanceData.monthConsumption / balanceData.monthStart) * 100).toFixed(1);
    },
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
      color: '#1677ff',
      areaStyle: {
        fill: 'l(270) 0:#ffffff 0.5:#d9e8ff 1:#1677ff',
        fillOpacity: 0.3,
      },
    }),
    [balanceTrend]
  );

  // 刷新数据 (使用 React Query refetch)
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchBalance(), refetchTransactions(), refetchStats()]);
  }, [refetchBalance, refetchTransactions, refetchStats]);

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
      // TODO: 调用更新预警设置的 mutation
    } catch (error) {
      console.error('Validation failed:', error);
    }
  }, [form]);

  // 关闭预警设置
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

/**
 * 转换后端交易类型到组件使用的类型
 */
function mapTransactionType(
  type: 'recharge' | 'consume' | 'freeze' | 'unfreeze' | 'adjust' | 'refund'
): 'recharge' | 'consumption' | 'refund' | 'adjustment' {
  const typeMap: Record<string, 'recharge' | 'consumption' | 'refund' | 'adjustment'> = {
    recharge: 'recharge',
    consume: 'consumption',
    freeze: 'consumption',
    unfreeze: 'recharge',
    adjust: 'adjustment',
    refund: 'refund',
  };

  return typeMap[type] || 'adjustment';
}
