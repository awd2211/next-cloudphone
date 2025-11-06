import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import {
  createExportTask,
  getExportTasks,
  getExportStats,
  deleteExportTask,
  deleteExportTasks,
  downloadExportFile,
  retryExportTask,
  clearCompletedTasks,
  clearFailedTasks,
  triggerDownload,
  type ExportTask,
  type ExportRequest,
  type ExportStats,
  type ExportTaskListQuery,
  ExportDataType,
  ExportStatus,
} from '@/services/export';
import { createExportTableColumns } from '@/utils/exportTableColumns';

/**
 * 导出中心业务逻辑 Hook
 * 封装导出任务的创建、查询、下载等功能
 */
export function useExportCenter() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<ExportTask[]>([]);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<ExportTaskListQuery>({
    page: 1,
    pageSize: 10,
  });

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getExportTasks(query);
      setTasks(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载导出任务失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getExportStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    loadTasks();
    loadStats();
  }, [loadTasks, loadStats]);

  // 页面加载时获取数据，并设置自动刷新（每 5 秒）
  useEffect(() => {
    loadTasks();
    loadStats();

    const interval = setInterval(() => {
      loadTasks();
      loadStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadTasks, loadStats]);

  // 创建导出任务
  const handleCreateExport = useCallback(async () => {
    try {
      const values = await form.validateFields();

      const exportData: ExportRequest = {
        dataType: values.dataType,
        format: values.format,
      };

      if (values.dateRange) {
        exportData.startDate = values.dateRange[0].format('YYYY-MM-DD');
        exportData.endDate = values.dateRange[1].format('YYYY-MM-DD');
      }

      await createExportTask(exportData);
      message.success('导出任务已创建，正在处理中...');
      setCreateModalVisible(false);
      form.resetFields();
      loadTasks();
      loadStats();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('请填写完整信息');
      } else {
        message.error('创建导出任务失败');
      }
    }
  }, [form, loadTasks, loadStats]);

  // 下载文件
  const handleDownload = useCallback(async (task: ExportTask) => {
    try {
      message.loading({ content: '正在下载...', key: 'download' });
      const blob = await downloadExportFile(task.id);
      triggerDownload(blob, task.fileName);
      message.success({ content: '下载成功！', key: 'download' });
    } catch (error) {
      message.error({ content: '下载失败', key: 'download' });
    }
  }, []);

  // 删除任务
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteExportTask(id);
      message.success('删除成功');
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  }, [loadTasks, loadStats]);

  // 批量删除
  const handleBatchDelete = useCallback(async () => {
    try {
      await deleteExportTasks(selectedRowKeys);
      message.success('删除成功');
      setSelectedRowKeys([]);
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  }, [selectedRowKeys, loadTasks, loadStats]);

  // 重试任务
  const handleRetry = useCallback(async (id: string) => {
    try {
      await retryExportTask(id);
      message.success('任务已重新提交');
      loadTasks();
    } catch (error) {
      message.error('重试失败');
    }
  }, [loadTasks]);

  // 清空已完成
  const handleClearCompleted = useCallback(async () => {
    try {
      await clearCompletedTasks();
      message.success('已清空已完成的任务');
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  }, [loadTasks, loadStats]);

  // 清空失败
  const handleClearFailed = useCallback(async () => {
    try {
      await clearFailedTasks();
      message.success('已清空失败的任务');
      loadTasks();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  }, [loadTasks, loadStats]);

  // 状态筛选
  const handleStatusChange = useCallback((status?: ExportStatus) => {
    setQuery((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  // 数据类型筛选
  const handleDataTypeChange = useCallback((dataType?: ExportDataType) => {
    setQuery((prev) => ({ ...prev, dataType, page: 1 }));
  }, []);

  // 分页变化
  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setQuery((prev) => ({ ...prev, page, pageSize }));
  }, []);

  // 打开创建弹窗
  const handleOpenCreateModal = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  // 关闭创建弹窗
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  // 表格列配置
  const columns = useMemo(
    () =>
      createExportTableColumns({
        onDownload: handleDownload,
        onDelete: handleDelete,
        onRetry: handleRetry,
      }),
    [handleDownload, handleDelete, handleRetry]
  );

  return {
    // 数据
    form,
    loading,
    tasks,
    stats,
    total,
    query,
    selectedRowKeys,
    createModalVisible,
    columns,

    // 表格选择
    setSelectedRowKeys,

    // 操作方法
    handleRefresh,
    handleCreateExport,
    handleBatchDelete,
    handleClearCompleted,
    handleClearFailed,
    handleStatusChange,
    handleDataTypeChange,
    handlePageChange,
    handleOpenCreateModal,
    handleCloseCreateModal,
  };
}
