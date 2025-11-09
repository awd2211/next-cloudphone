import React, { useMemo } from 'react';
import { Card, Button, Space, Tooltip } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Quota } from '@/types';
import {
  QuotaAlertPanel,
  QuotaStatisticsRow,
  CreateQuotaModal,
  EditQuotaModal,
  QuotaDetailDrawer,
} from '@/components/Quota';
import QuotaRealTimeMonitor from '@/components/Quota/QuotaRealTimeMonitor';
import { useQuotaList } from '@/hooks/useQuotaList';
import { useQuotaDetail } from '@/hooks/useQuotaDetail';
import { createQuotaColumns } from './columns';

const QuotaList: React.FC = () => {
  // 配额列表管理
  const {
    quotas,
    loading,
    total,
    alerts,
    page,
    pageSize,
    setPage,
    setPageSize,
    createModalVisible,
    editModalVisible,
    form,
    editForm,
    loadQuotas,
    handleCreateQuota,
    handleUpdateQuota,
    handleEdit,
    setCreateModalVisible,
    setEditModalVisible,
  } = useQuotaList();

  // 配额详情查看
  const {
    detailDrawerVisible,
    selectedQuota,
    statistics,
    handleViewDetail,
    handleCloseDetail,
  } = useQuotaDetail();

  // 表格列配置
  const columns = useMemo(
    () => createQuotaColumns(handleEdit, handleViewDetail),
    [handleEdit, handleViewDetail]
  );

  return (
    <div>
      {/* 实时监控面板 */}
      <QuotaRealTimeMonitor />

      {/* 配额告警面板 */}
      <QuotaAlertPanel alerts={alerts} />

      {/* 统计卡片 */}
      <QuotaStatisticsRow quotas={quotas} alerts={alerts} />

      {/* 配额列表 */}
      <Card
        title="配额管理"
        extra={
          <Space>
            <Tooltip title="刷新">
              <Button icon={<ReloadOutlined />} onClick={loadQuotas} />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建配额
            </Button>
          </Space>
        }
      >
        <AccessibleTable<Quota>
          ariaLabel="配额列表"
          loadingText="正在加载配额列表"
          emptyText="暂无配额数据，点击右上角创建配额"
          columns={columns}
          dataSource={quotas}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1); // 改变页面大小时重置到第一页
              }
            },
          }}
        />
      </Card>

      {/* 创建配额模态框 */}
      <CreateQuotaModal
        visible={createModalVisible}
        form={form}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onFinish={handleCreateQuota}
      />

      {/* 编辑配额模态框 */}
      <EditQuotaModal
        visible={editModalVisible}
        form={editForm}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onFinish={handleUpdateQuota}
      />

      {/* 配额详情抽屉 */}
      <QuotaDetailDrawer
        visible={detailDrawerVisible}
        quota={selectedQuota}
        statistics={statistics}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default React.memo(QuotaList);
