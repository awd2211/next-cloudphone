import React from 'react';
import { Card, Space } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import type { BillingRule } from '@/types';
import {
  BillingRuleStatsCards,
  BillingRuleToolbar,
  CreateEditBillingRuleModal,
  TestBillingRuleModal,
  BillingRuleDetailModal,
} from '@/components/BillingRule';
import { useBillingRuleList } from '@/hooks/useBillingRuleList';

/**
 * 计费规则列表页面（优化版）
 *
 * 优化点：
 * 1. ✅ 表格列配置提取到 BillingRuleTableColumns hook
 * 2. ✅ 业务逻辑集中在 useBillingRuleList hook
 * 3. ✅ 主组件只负责组合和渲染
 * 4. ✅ 支持规则创建/编辑、测试、详情查看
 */
const BillingRuleList: React.FC = () => {
  const {
    rules,
    total,
    isLoading,
    page,
    pageSize,
    filterActive,
    templates,
    modalVisible,
    editingRule,
    form,
    setModalVisible,
    handleSubmit,
    applyTemplate,
    testModalVisible,
    testForm,
    testResult,
    setTestModalVisible,
    handleTest,
    detailModalVisible,
    selectedRule,
    setDetailModalVisible,
    columns,
    setPage,
    setPageSize,
    setFilterActive,
    openModal,
  } = useBillingRuleList();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <BillingRuleStatsCards total={total} rules={rules} />

          <BillingRuleToolbar
            filterActive={filterActive}
            onFilterActiveChange={setFilterActive}
            onCreate={() => openModal()}
          />

          <AccessibleTable<BillingRule>
            ariaLabel="计费规则列表"
            loadingText="正在加载计费规则"
            emptyText="暂无计费规则数据"
            columns={columns}
            dataSource={rules}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize || 10);
              },
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              pageSizeOptions: ['10', '20', '50', '100', '200'],
            }}
            scroll={{ x: 1400, y: 600 }}
            virtual
          />
        </Space>
      </Card>

      <CreateEditBillingRuleModal
        visible={modalVisible}
        editingRule={editingRule}
        form={form}
        templates={templates}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        onApplyTemplate={applyTemplate}
      />

      <TestBillingRuleModal
        visible={testModalVisible}
        selectedRule={selectedRule}
        testForm={testForm}
        testResult={testResult}
        onOk={handleTest}
        onCancel={() => setTestModalVisible(false)}
      />

      <BillingRuleDetailModal
        visible={detailModalVisible}
        selectedRule={selectedRule}
        onClose={() => setDetailModalVisible(false)}
      />
    </div>
  );
};

export default React.memo(BillingRuleList);
