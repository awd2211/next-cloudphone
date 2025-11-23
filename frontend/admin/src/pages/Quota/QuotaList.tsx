import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, Button, Space, Tooltip, Tag, message } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined, ReloadOutlined, PieChartOutlined } from '@ant-design/icons';
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
import { useQuotaStatistics } from '@/hooks/queries/useQuotas';
import { createQuotaColumns } from './columns';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

const QuotaListContent: React.FC = () => {
  // 配额列表管理
  const {
    quotas,
    loading,
    error,
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

  // UI 状态管理（本地状态）
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState<Quota | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // 数据获取（React Query）
  const { data: statistics } = useQuotaStatistics(selectedUserId);

  // 查看配额详情
  const handleViewDetail = useCallback((record: Quota) => {
    setSelectedQuota(record);
    setSelectedUserId(record.userId);
    setDetailDrawerVisible(true);
  }, []);

  // 关闭详情抽屉
  const handleCloseDetail = useCallback(() => {
    setDetailDrawerVisible(false);
  }, []);

  // 表格列配置
  const columns = useMemo(
    () => createQuotaColumns(handleEdit, handleViewDetail),
    [handleEdit, handleViewDetail]
  );

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R / Cmd+R 刷新
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadQuotas();
        message.info('正在刷新配额列表...');
      }
      // Ctrl+N / Cmd+N 新建
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setCreateModalVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadQuotas, setCreateModalVisible]);

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0, display: 'flex', alignItems: 'center' }}>
          <PieChartOutlined style={{ marginRight: 8 }} />
          配额管理
          <Tag
            icon={<ReloadOutlined spin={loading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer' }}
            onClick={() => {
              loadQuotas();
              message.info('正在刷新...');
            }}
          >
            Ctrl+R 刷新
          </Tag>
        </h2>
        <Space>
          <span style={{ fontSize: 12, color: '#999' }}>Ctrl+N 新建</span>
        </Space>
      </div>

      {/* 实时监控面板 */}
      <QuotaRealTimeMonitor />

      {/* 配额告警面板 */}
      <QuotaAlertPanel alerts={alerts} />

      {/* 统计卡片 */}
      <QuotaStatisticsRow quotas={quotas} alerts={alerts} />

      {/* 配额列表 */}
      <Card
        title={null}
        extra={
          <Space>
            <Tooltip title="刷新 (Ctrl+R)">
              <Button icon={<ReloadOutlined spin={loading} />} onClick={loadQuotas} />
            </Tooltip>
            <Tooltip title="新建配额 (Ctrl+N)">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                创建配额
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <LoadingState
          loading={loading}
          error={error}
          empty={!loading && !error && quotas.length === 0}
          onRetry={loadQuotas}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无配额数据，点击右上角创建配额"
        >
          <AccessibleTable<Quota>
            ariaLabel="配额列表"
            loadingText="正在加载配额列表"
            emptyText="暂无配额数据，点击右上角创建配额"
            columns={columns}
            dataSource={quotas}
            loading={false}
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
        </LoadingState>
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
        statistics={statistics as any}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

const QuotaList: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="QuotaList">
      <QuotaListContent />
    </ErrorBoundary>
  );
};

export default React.memo(QuotaList);
