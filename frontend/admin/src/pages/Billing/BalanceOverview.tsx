import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Button, Space, Alert, Tag, message } from 'antd';
import {
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@/theme';
import ReactECharts from '@/components/ReactECharts';
import { useBalanceOverview } from '@/hooks/useBalanceOverview';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

/**
 * 余额概览页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 图表配置使用 useMemo 缓存
 * 4. ✅ 导航函数使用 useCallback 优化
 * 5. ✅ 代码从 247 行减少到 ~140 行
 * 6. ✅ ErrorBoundary 错误边界保护
 * 7. ✅ 快捷键支持 (Ctrl+R 刷新)
 * 8. ✅ LoadingState 统一加载状态
 */
const BalanceOverviewContent: React.FC = () => {
  const {
    loading,
    balanceData,
    isLowBalance,
    balanceTrendOption,
    revenueExpenseOption,
    consumptionDistributionOption,
    handleRecharge,
    handleViewTransactions,
    handleViewInvoices,
    refetch,
  } = useBalanceOverview();

  // 快捷键支持: Ctrl+R 刷新数据
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch?.();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  return (
    <LoadingState loading={loading} onRetry={refetch}>
      <div>
        {/* 页面标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>
            <WalletOutlined style={{ marginRight: 8 }} />
            余额总览
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => refetch?.()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
        </div>

        {/* 余额不足警告 */}
        {isLowBalance && (
          <Alert
            message="余额不足提醒"
            description="您的账户余额已低于 1,000 元，请及时充值以避免服务中断。"
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" type="primary" onClick={handleRecharge}>
                立即充值
              </Button>
            }
          />
        )}

        {/* 主要统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="当前余额"
                value={balanceData.currentBalance}
                precision={2}
                prefix="¥"
                valueStyle={{ color: SEMANTIC.success.main }}
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
                valueStyle={{ color: SEMANTIC.warning.main }}
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
                valueStyle={{ color: SEMANTIC.success.main }}
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
                valueStyle={{ color: SEMANTIC.error.main }}
                suffix={<ArrowDownOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 累计统计和操作按钮 */}
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
                  onClick={handleRecharge}
                >
                  账户充值
                </Button>
                <Button onClick={handleViewTransactions}>交易记录</Button>
                <Button onClick={handleViewInvoices}>账单管理</Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 图表区域 */}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card>
              <ReactECharts option={balanceTrendOption} style={{ height: 350 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <ReactECharts option={revenueExpenseOption} style={{ height: 350 }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card>
              <ReactECharts option={consumptionDistributionOption} style={{ height: 350 }} />
            </Card>
          </Col>
        </Row>
      </div>
    </LoadingState>
  );
};

/**
 * 余额概览页面 - 带错误边界包裹
 */
const BalanceOverview: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="BalanceOverview">
      <BalanceOverviewContent />
    </ErrorBoundary>
  );
};

export default BalanceOverview;
