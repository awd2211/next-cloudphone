import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message, Modal } from 'antd';
import request from '@/utils/request';

interface SearchParams {
  status?: string;
  deviceId: string;
  page: number;
  limit: number;
}

export const useStateRecovery = () => {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    status: undefined,
    deviceId: '',
    page: 1,
    limit: 10,
  });
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [targetState, setTargetState] = useState('');
  const queryClient = useQueryClient();

  // 查询状态恢复记录
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['state-recovery-records', searchParams],
    queryFn: async () => {
      const response = await request.get('/state-recovery', {
        params: searchParams,
      });
      return response;
    },
  });

  // 获取设备当前状态
  const { data: deviceStates } = useQuery({
    queryKey: ['device-states'],
    queryFn: async () => {
      const response = await request.get('/state-recovery/device-states');
      return response;
    },
  });

  // 触发状态恢复
  const recoveryMutation = useMutation({
    mutationFn: async (params: { deviceId: string; targetState: string }) => {
      return await request.post('/state-recovery/recover', params);
    },
    onSuccess: () => {
      message.success('状态恢复已触发');
      setRecoveryModalVisible(false);
      setSelectedDeviceId('');
      setTargetState('');
      queryClient.invalidateQueries({ queryKey: ['state-recovery-records'] });
      queryClient.invalidateQueries({ queryKey: ['device-states'] });
    },
    onError: () => {
      message.error('触发状态恢复失败');
    },
  });

  // 验证一致性
  const validateMutation = useMutation({
    mutationFn: async () => {
      return await request.post('/state-recovery/validate-all');
    },
    onSuccess: (data) => {
      if (data.inconsistent?.length > 0) {
        Modal.warning({
          title: '发现状态不一致',
          content: `发现 ${data.inconsistent.length} 个设备状态不一致，是否立即修复？`,
          okText: '立即修复',
          onOk: () => {
            // 触发批量修复
            request.post('/state-recovery/fix-inconsistencies').then(() => {
              message.success('状态修复已触发');
              queryClient.invalidateQueries({
                queryKey: ['state-recovery-records'],
              });
              queryClient.invalidateQueries({ queryKey: ['device-states'] });
            });
          },
        });
      } else {
        message.success('所有设备状态一致');
      }
    },
    onError: () => {
      message.error('一致性验证失败');
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

  // 验证一致性
  const handleValidate = useCallback(() => {
    validateMutation.mutate();
  }, [validateMutation]);

  // 打开恢复模态框
  const handleRecoveryClick = useCallback(() => {
    setRecoveryModalVisible(true);
  }, []);

  // 确认恢复
  const handleRecoveryOk = useCallback(() => {
    recoveryMutation.mutate({ deviceId: selectedDeviceId, targetState });
  }, [recoveryMutation, selectedDeviceId, targetState]);

  // 取消恢复
  const handleRecoveryCancel = useCallback(() => {
    setRecoveryModalVisible(false);
    setSelectedDeviceId('');
    setTargetState('');
  }, []);

  // 分页处理
  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setSearchParams((prev) => ({ ...prev, page, limit: pageSize }));
  }, []);

  return {
    // 搜索参数
    searchParams,
    setSearchParams,
    // 数据
    data,
    isLoading,
    deviceStates,
    // 模态框状态
    recoveryModalVisible,
    selectedDeviceId,
    targetState,
    setSelectedDeviceId,
    setTargetState,
    // 加载状态
    validateLoading: validateMutation.isPending,
    recoveryLoading: recoveryMutation.isPending,
    // 事件处理
    handleSearch,
    handleRefresh,
    handleValidate,
    handleRecoveryClick,
    handleRecoveryOk,
    handleRecoveryCancel,
    handlePageChange,
  };
};
