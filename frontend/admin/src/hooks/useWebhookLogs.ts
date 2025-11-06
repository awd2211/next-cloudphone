import { useState, useEffect, useCallback } from 'react';
import type { WebhookLog } from '@/types/webhook';
import { getWebhookLogs } from '@/services/payment-admin';
import { useSafeApi } from './useSafeApi';
import { WebhookLogsResponseSchema } from '@/schemas/api.schemas';

export const useWebhookLogs = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // ✅ 使用 useSafeApi 加载 Webhook 日志
  const {
    data: logsResponse,
    loading,
    execute: executeLoadLogs,
  } = useSafeApi(
    () =>
      getWebhookLogs({
        page,
        limit: pageSize,
        provider,
      }),
    WebhookLogsResponseSchema,
    {
      errorMessage: '加载 Webhook 日志失败',
      fallbackValue: { data: { data: [], pagination: { total: 0 } } },
    }
  );

  const logs = logsResponse?.data?.data || [];
  const total = logsResponse?.data?.pagination?.total || 0;

  const loadLogs = useCallback(async () => {
    await executeLoadLogs();
  }, [executeLoadLogs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleProviderChange = useCallback((value: string | undefined) => {
    setProvider(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  const handleViewDetail = useCallback((log: WebhookLog) => {
    setSelectedLog(log);
    setDetailModalVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
  }, []);

  return {
    loading,
    logs,
    total,
    page,
    pageSize,
    provider,
    selectedLog,
    detailModalVisible,
    loadLogs,
    handleProviderChange,
    handlePageChange,
    handleViewDetail,
    handleCloseDetail,
  };
};
