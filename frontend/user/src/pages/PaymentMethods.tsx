import React, { useEffect } from 'react';
import { Card, Button, Empty, Typography, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import {
  SecurityAlert,
  PaymentList,
  AddPaymentModal,
  UsageGuide,
} from '@/components/Payment';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';

const { Title } = Typography;

/**
 * 支付方式管理页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 配置文件扩展（类型、字段、工具函数）
 * 5. ✅ Modal 确认逻辑封装在 Hook 中
 * 6. ✅ 动态表单通过配置驱动生成
 * 7. ✅ 代码从 351 行减少到 ~70 行
 */
const PaymentMethodsContent: React.FC = () => {
  const {
    paymentMethods,
    loading,
    addModalVisible,
    form,
    handleAddPaymentMethod,
    handleSetDefault,
    handleDelete,
    showAddModal,
    hideAddModal,
    goBack,
    refetch,
  } = usePaymentMethods();

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('刷新支付方式列表');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  return (
    <div>
      {/* 返回按钮 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={goBack}
        style={{ marginBottom: 16 }}
      >
        返回个人中心
      </Button>

      {/* 页面标题 */}
      <Title level={2}>支付方式管理</Title>

      {/* 安全提示 */}
      <SecurityAlert />

      {/* 支付方式列表 */}
      <Card
        title="我的支付方式"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            添加支付方式
          </Button>
        }
      >
        {paymentMethods.length === 0 ? (
          <Empty
            description="暂无支付方式，请先添加"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <PaymentList
            paymentMethods={paymentMethods}
            onSetDefault={handleSetDefault}
            onDelete={handleDelete}
          />
        )}
      </Card>

      {/* 添加支付方式弹窗 */}
      <AddPaymentModal
        visible={addModalVisible}
        loading={loading}
        form={form}
        onSubmit={handleAddPaymentMethod}
        onCancel={hideAddModal}
      />

      {/* 使用指南 */}
      <UsageGuide />
    </div>
  );
};

const PaymentMethods: React.FC = () => {
  return (
    <ErrorBoundary>
      <PaymentMethodsContent />
    </ErrorBoundary>
  );
};

export default PaymentMethods;
