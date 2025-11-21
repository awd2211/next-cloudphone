import { useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import dayjs from 'dayjs';
import {
  getAuditLogs,
  cleanExpiredLogs,
  type AuditLog,
  type LogParams,
} from '@/services/log';
import { exportToExcel } from '@/utils/export';
import { useValidatedQuery } from '@/hooks/utils';
import { AuditLogsResponseSchema } from '@/schemas/api.schemas';

export const useLogsAudit = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [resourceFilter, setResourceFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // ✅ 使用 useValidatedQuery 加载日志
  const {
    data: logsResponse,
    isLoading: loading,
    refetch: loadLogs,
  } = useValidatedQuery({
    queryKey: ['audit-logs', page, pageSize, searchKeyword, actionFilter, resourceFilter, dateRange],
    queryFn: () => {
      const params: LogParams = { page, pageSize };
      if (searchKeyword) params.search = searchKeyword;
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resource = resourceFilter;
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }
      return getAuditLogs(params);
    },
    schema: AuditLogsResponseSchema,
    apiErrorMessage: '加载日志失败',
    fallbackValue: { data: [], total: 0 },
    staleTime: 30 * 1000,
  });

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setSearchKeyword(value);
    setPage(1);
  }, []);

  // 操作类型筛选
  const handleActionChange = useCallback((value: string | undefined) => {
    setActionFilter(value);
    setPage(1);
  }, []);

  // 资源类型筛选
  const handleResourceChange = useCallback((value: string | undefined) => {
    setResourceFilter(value);
    setPage(1);
  }, []);

  // 日期范围筛选
  const handleDateRangeChange = useCallback((dates: any) => {
    if (dates) {
      setDateRange([
        dates[0]!.format('YYYY-MM-DD HH:mm:ss'),
        dates[1]!.format('YYYY-MM-DD HH:mm:ss'),
      ]);
    } else {
      setDateRange(null);
    }
    setPage(1);
  }, []);

  // 导出 Excel
  const handleExportExcel = useCallback(() => {
    const logs = logsResponse?.data || [];
    const exportData = logs.map((log) => ({
      日志ID: log.id,
      用户: log.user?.username || '-',
      操作: log.action,
      资源: log.resource,
      资源ID: log.resourceId || '-',
      请求方法: log.method,
      请求路径: log.path,
      IP地址: log.ip,
      响应状态: log.responseStatus,
      '耗时(ms)': log.duration,
      操作时间: dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    exportToExcel(exportData, `操作日志_${dayjs().format('YYYYMMDD_HHmmss')}`, '操作日志');
    message.success('导出成功');
  }, [logsResponse]);

  // 清理过期日志
  const handleCleanLogs = useCallback(() => {
    Modal.confirm({
      title: '清理过期日志',
      content: '确定要清理30天前的日志吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await cleanExpiredLogs(30);
          message.success('清理成功');
          loadLogs();
        } catch (_error) {
          message.error('清理失败');
        }
      },
    });
  }, [loadLogs]);

  // 查看详情
  const handleViewDetail = useCallback((record: AuditLog) => {
    setSelectedLog(record);
    setDetailModalVisible(true);
  }, []);

  // 关闭详情
  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
  }, []);

  // 分页处理
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  return {
    // 数据
    logs: logsResponse?.data || [], // ✅ 确保永远返回数组
    loading,
    total: logsResponse?.total || 0,
    page,
    pageSize,
    selectedLog,
    detailModalVisible,

    // 操作函数
    loadLogs, // 新增：手动重新加载
    handleSearch,
    handleActionChange,
    handleResourceChange,
    handleDateRangeChange,
    handleExportExcel,
    handleCleanLogs,
    handleViewDetail,
    handleCloseDetail,
    handlePageChange,
  };
};
