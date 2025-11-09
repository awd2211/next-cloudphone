import React from 'react';
import { Button } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined } from '@ant-design/icons';
import { CreatePlanModal } from '@/components/Plan';
import { usePlanList } from '@/hooks/usePlanList';
import type { Plan } from '@/types';

/**
 * 套餐列表页面（优化版）
 *
 * 优化点：
 * 1. ✅ 表格列配置提取到 PlanTableColumns hook
 * 2. ✅ 模态框提取为独立组件
 * 3. ✅ 业务逻辑集中在 usePlanList hook
 * 4. ✅ 主组件只负责组合和渲染
 */
const PlanList: React.FC = () => {
  const {
    plans,
    total,
    isLoading,
    page,
    pageSize,
    modalVisible,
    editingPlan,
    form,
    columns,
    setPage,
    setPageSize,
    handleSubmit,
    handleCreate,
    handleModalCancel,
    confirmLoading,
  } = usePlanList();

  return (
    <div>
      <h2>套餐管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          创建套餐
        </Button>
      </div>

      <AccessibleTable<Plan>
        ariaLabel="套餐列表"
        loadingText="正在加载套餐列表"
        emptyText="暂无套餐数据，点击右上角创建套餐"
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
          pageSizeOptions: ['10', '20', '50', '100', '200'],
        }}
        scroll={{ x: 1200, y: 600 }}
        virtual
      />

      <CreatePlanModal
        visible={modalVisible}
        form={form}
        editingPlan={editingPlan}
        confirmLoading={confirmLoading}
        onCancel={handleModalCancel}
        onFinish={handleSubmit}
      />
    </div>
  );
};

export default React.memo(PlanList);
