import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import request from '@/utils/request';
import type { FailoverRecord } from '@/components/Failover';

interface SearchParams {
  status?: string;
  deviceId: string;
  page: number;
  limit: number;
}

export const useFailoverManagement = () => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    status: undefined,
    deviceId: '',
    page: 1,
    limit: 10,
  });
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FailoverRecord | null>(null);
  const [triggerModalVisible, setTriggerModalVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const queryClient = useQueryClient();

  // 查询故障转移记录
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['failover-records', searchParams],
    queryFn: async () => {
      const response = await request.get('/failover', { params: searchParams });
      return response;
    },
  });

  // 触发故障转移
  const triggerMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return await request.post(`/failover/trigger/${deviceId}`);
    },
    onSuccess: () => {
      message.success('故障转移已触发');
      setTriggerModalVisible(false);
      setSelectedDeviceId('');
      queryClient.invalidateQueries({ queryKey: ['failover-records'] });
    },
    onError: () => {
      message.error('触发故障转移失败');
    },
  });

  // 搜索处理
  const handleSearch = useCallback(() => {
    setSearchParams((prev) => ({ ...prev, page: 1 }));
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // 打开触发模态框
  const handleOpenTriggerModal = useCallback(() => {
    setTriggerModalVisible(true);
  }, []);

  // 触发故障转移
  const handleTrigger = useCallback(() => {
    triggerMutation.mutate(selectedDeviceId);
  }, [triggerMutation, selectedDeviceId]);

  // 取消触发
  const handleCancelTrigger = useCallback(() => {
    setTriggerModalVisible(false);
    setSelectedDeviceId('');
  }, []);

  // 查看详情
  const handleViewDetail = useCallback((record: FailoverRecord) => {
    setSelectedRecord(record);
    setDetailDrawerVisible(true);
  }, []);

  // 关闭详情
  const handleCloseDetail = useCallback(() => {
    setDetailDrawerVisible(false);
    setSelectedRecord(null);
  }, []);

  // 分页处理
  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setSearchParams((prev) => ({ ...prev, page, limit: pageSize }));
  }, []);

  return {
    // 数据
    data,
    isLoading,
    searchParams,
    setSearchParams,
    // 模态框和抽屉状态
    detailDrawerVisible,
    selectedRecord,
    triggerModalVisible,
    selectedDeviceId,
    setSelectedDeviceId,
    // 加载状态
    triggerLoading: triggerMutation.isPending,
    // 事件处理
    handleSearch,
    handleRefresh,
    handleOpenTriggerModal,
    handleTrigger,
    handleCancelTrigger,
    handleViewDetail,
    handleCloseDetail,
    handlePageChange,
  };
};
