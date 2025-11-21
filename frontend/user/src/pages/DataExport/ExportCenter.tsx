import React, { useState, useCallback, useMemo } from 'react';
import { Card, Table, Button, Space, Typography, Empty, Form } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import {
  ExportStatsCards,
  ExportToolbar,
  ExportCreateModal,
} from '@/components/DataExport';
import {
  useExportTasks,
  useExportStats,
  useCreateExportTask,
  useDeleteExportTask,
  useDeleteExportTasks,
  useRetryExportTask,
  useClearCompletedTasks,
  useClearFailedTasks,
  useDownloadExportFile,
} from '@/hooks/queries';
import type { ExportTaskListQuery, ExportDataType, ExportStatus, ExportRequest, ExportTask } from '@/services/export';
import { createExportTableColumns } from '@/utils/exportTableColumns';

const { Title, Paragraph } = Typography;

/**
 * 数据导出中心页面
 *
 * 功能：
 * 1. 创建导出任务（支持多种数据类型和格式）
 * 2. 任务列表管理（查看、下载、删除、重试）
 * 3. 自动轮询刷新（5秒）
 * 4. 批量操作（删除、清空）
 * 5. 筛选（按状态、数据类型）
 */
const ExportCenter: React.FC = () => {
  const [form] = Form.useForm();

  // 本地状态
  const [query, setQuery] = useState<ExportTaskListQuery>({
    page: 1,
    pageSize: 10,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // React Query hooks
  const { data: tasksData, isLoading: loading, refetch: refetchTasks } = useExportTasks(query);
  const { data: stats, refetch: refetchStats } = useExportStats();

  const createExportTask = useCreateExportTask();
  const deleteExportTask = useDeleteExportTask();
  const batchDeleteExportTasks = useDeleteExportTasks();
  const retryExportTask = useRetryExportTask();
  const clearCompletedTasks = useClearCompletedTasks();
  const clearFailedTasks = useClearFailedTasks();
  const downloadExportFile = useDownloadExportFile();

  // useExportTasks 返回 { items: ExportTask[], total: number }
  const tasks: ExportTask[] = tasksData?.items || [];
  const total = tasksData?.total ?? 0;

  // 操作处理
  const handleRefresh = useCallback(() => {
    refetchTasks();
    refetchStats();
  }, [refetchTasks, refetchStats]);

  const handleCreateExport = useCallback(async () => {
    const values = await form.validateFields();

    const exportData: ExportRequest = {
      dataType: values.dataType,
      format: values.format,
    };

    if (values.dateRange) {
      exportData.startDate = values.dateRange[0].format('YYYY-MM-DD');
      exportData.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }

    await createExportTask.mutateAsync(exportData);
    setCreateModalVisible(false);
    form.resetFields();
  }, [form, createExportTask]);

  const handleDownload = useCallback(async (task: ExportTask) => {
    await downloadExportFile.mutateAsync({ taskId: task.id, fileName: task.fileName });
  }, [downloadExportFile]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteExportTask.mutateAsync(id);
  }, [deleteExportTask]);

  const handleBatchDelete = useCallback(async () => {
    await batchDeleteExportTasks.mutateAsync(selectedRowKeys);
    setSelectedRowKeys([]);
  }, [selectedRowKeys, batchDeleteExportTasks]);

  const handleRetry = useCallback(async (id: string) => {
    await retryExportTask.mutateAsync(id);
  }, [retryExportTask]);

  const handleClearCompleted = useCallback(async () => {
    await clearCompletedTasks.mutateAsync();
  }, [clearCompletedTasks]);

  const handleClearFailed = useCallback(async () => {
    await clearFailedTasks.mutateAsync();
  }, [clearFailedTasks]);

  const handleStatusChange = useCallback((status?: ExportStatus) => {
    setQuery((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  const handleDataTypeChange = useCallback((dataType?: ExportDataType) => {
    setQuery((prev) => ({ ...prev, dataType, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setQuery((prev) => ({ ...prev, page, pageSize }));
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  // 表格列配置
  const columns = useMemo(
    () => createExportTableColumns({
      onDownload: handleDownload,
      onDelete: handleDelete,
      onRetry: handleRetry,
    }),
    [handleDownload, handleDelete, handleRetry]
  );

  return (
    <div>
      {/* 页头 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                <ExportOutlined /> 数据导出中心
              </Title>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                导出您的数据，支持多种格式
              </Paragraph>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<ExportOutlined />}
              onClick={handleOpenCreateModal}
            >
              创建导出任务
            </Button>
          </div>
        </Space>
      </Card>

      {/* 统计卡片 */}
      <ExportStatsCards stats={stats ?? null} />

      {/* 工具栏 */}
      <ExportToolbar
        selectedCount={selectedRowKeys.length}
        onRefresh={handleRefresh}
        onBatchDelete={handleBatchDelete}
        onClearCompleted={handleClearCompleted}
        onClearFailed={handleClearFailed}
        onStatusChange={handleStatusChange}
        onDataTypeChange={handleDataTypeChange}
      />

      {/* 任务列表 */}
      <Card>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个任务`,
            onChange: handlePageChange,
          }}
          locale={{
            emptyText: <Empty description="暂无导出任务" />,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建导出 Modal */}
      <ExportCreateModal
        visible={createModalVisible}
        form={form}
        onOk={handleCreateExport}
        onCancel={handleCloseCreateModal}
      />
    </div>
  );
};

export default ExportCenter;
