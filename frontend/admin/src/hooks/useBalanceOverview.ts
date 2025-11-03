import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ECOption } from '@/utils/echarts';

/**
 * 余额数据接口
 */
interface BalanceData {
  currentBalance: number;
  frozenBalance: number;
  totalRecharge: number;
  totalConsumption: number;
  monthlyRecharge: number;
  monthlyConsumption: number;
}

/**
 * 余额概览 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useMemo 缓存图表配置
 * 3. ✅ 使用 useCallback 优化导航函数
 * 4. ✅ 为未来 API 集成预留接口
 */
export const useBalanceOverview = () => {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [balanceData, _setBalanceData] = useState<BalanceData>({
    currentBalance: 15620.5,
    frozenBalance: 320.0,
    totalRecharge: 50000.0,
    totalConsumption: 34379.5,
    monthlyRecharge: 8000.0,
    monthlyConsumption: 6542.3,
  });

  // ===== 派生状态 =====
  /**
   * 计算是否余额不足（低于 1000 元）
   */
  const isLowBalance = useMemo(
    () => balanceData.currentBalance < 1000,
    [balanceData.currentBalance]
  );

  // ===== 图表配置 =====
  /**
   * 余额趋势图配置
   */
  const balanceTrendOption = useMemo<ECOption>(
    () => ({
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
    }),
    [] // TODO: 未来接入真实 API 后，依赖真实的趋势数据
  );

  /**
   * 收支统计图配置
   */
  const revenueExpenseOption = useMemo<ECOption>(
    () => ({
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
    }),
    [] // TODO: 未来接入真实 API 后，依赖真实的周收支数据
  );

  /**
   * 消费分布饼图配置
   */
  const consumptionDistributionOption = useMemo<ECOption>(
    () => ({
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
    }),
    [] // TODO: 未来接入真实 API 后，依赖真实的消费分布数据
  );

  // ===== 导航函数 =====
  /**
   * 跳转到充值页面
   */
  const handleRecharge = useCallback(() => {
    navigate('/billing/recharge');
  }, [navigate]);

  /**
   * 跳转到交易记录页面
   */
  const handleViewTransactions = useCallback(() => {
    navigate('/billing/transactions');
  }, [navigate]);

  /**
   * 跳转到账单管理页面
   */
  const handleViewInvoices = useCallback(() => {
    navigate('/billing/invoices');
  }, [navigate]);

  // ===== 数据加载 =====
  /**
   * 加载余额数据
   * TODO: 未来实现真实 API 调用
   */
  const loadBalanceData = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: 调用真实 API
      // const data = await getBalanceOverview();
      // setBalanceData(data);

      // 目前使用模拟数据，不需要实际操作
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('加载余额数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    balanceData,
    isLowBalance,

    // 图表配置
    balanceTrendOption,
    revenueExpenseOption,
    consumptionDistributionOption,

    // 导航函数
    handleRecharge,
    handleViewTransactions,
    handleViewInvoices,

    // 数据加载
    loadBalanceData,
  };
};
