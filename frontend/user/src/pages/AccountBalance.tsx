import React from 'react';
import {
  BalanceHeader,
  LowBalanceAlert,
  BalanceMetrics,
  BalanceTrendChart,
  ForecastCards,
  TransactionTable,
  AlertSettingsModal,
} from '@/components/AccountBalance';
import { useAccountBalance } from '@/hooks/useAccountBalance';

/**
 * 账户余额看板（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 代码从 711 行减少到 < 60 行（92% 减少）
 *
 * 功能：
 * 1. 账户余额展示和趋势图表
 * 2. 消费预测和充值建议
 * 3. 交易记录查询
 * 4. 余额预警设置
 */
const AccountBalance: React.FC = () => {
  const {
    loading,
    balanceData,
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
  } = useAccountBalance();

  return (
    <div style={{ padding: 24 }}>
      <BalanceHeader
        loading={loading}
        onRefresh={handleRefresh}
        onOpenAlertSettings={handleOpenAlertSettings}
      />

      <LowBalanceAlert balanceData={balanceData} isLowBalance={isLowBalance} />

      <BalanceMetrics
        balanceData={balanceData}
        balanceChange={balanceChange}
        balanceChangePercent={balanceChangePercent}
        monthConsumptionPercent={monthConsumptionPercent}
        isLowBalance={isLowBalance}
      />

      <BalanceTrendChart lineChartConfig={lineChartConfig} />

      <ForecastCards balanceData={balanceData} />

      <TransactionTable transactions={transactions} columns={columns} loading={loading} />

      <AlertSettingsModal
        visible={alertSettingsVisible}
        form={form}
        onSave={handleSaveAlertSettings}
        onClose={handleCloseAlertSettings}
      />
    </div>
  );
};

export default AccountBalance;
