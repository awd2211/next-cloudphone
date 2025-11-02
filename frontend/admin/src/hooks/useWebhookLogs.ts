import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { getWebhookLogs } from '@/services/payment-admin';
import type { WebhookLog } from '@/types/webhook';

export const useWebhookLogs = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getWebhookLogs({
        page,
        limit: pageSize,
        provider,
      });
      setLogs(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (error) {
      message.error('加载 Webhook 日志失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, provider]);

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
