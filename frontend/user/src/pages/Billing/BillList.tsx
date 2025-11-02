import React from 'react';
import { Card, Table, Empty } from 'antd';
import { BillStatsCards, BillFilterBar, PaymentModal } from '@/components/Billing';
import { useBillList } from '@/hooks/useBillList';

/**
 * 账单列表页面
 * 展示用户的所有账单，支持筛选、支付、取消等操作
 */
const BillList: React.FC = () => {
  const {
    bills,
    stats,
    loading,
    total,
    query,
    columns,
    paymentModalVisible,
    selectedBill,
    paymentMethod,
    setQuery,
    setPaymentMethod,
    setPaymentModalVisible,
    handleFilterChange,
    handleDateRangeChange,
    handleConfirmPay,
    handleRefresh,
  } = useBillList();

  return (
    <div>
      {/* 统计卡片 */}
      <BillStatsCards stats={stats} />

      {/* 筛选工具栏 */}
      <BillFilterBar
        onSearch={(keyword) => handleFilterChange('keyword', keyword)}
        onTypeChange={(type) => handleFilterChange('type', type)}
        onStatusChange={(status) => handleFilterChange('status', status)}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={handleRefresh}
      />

      {/* 账单列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={bills}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条账单`,
            onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
          }}
          locale={{
            emptyText: <Empty description="暂无账单" />,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 支付弹窗 */}
      <PaymentModal
        visible={paymentModalVisible}
        bill={selectedBill}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        onConfirm={handleConfirmPay}
        onCancel={() => setPaymentModalVisible(false)}
      />
    </div>
  );
};

export default BillList;
