import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import type { GPUDevice } from '@/types';
import {
  getGPUDevices,
  getGPUStats,
  allocateGPU,
  deallocateGPU,
  getGPUAllocations,
} from '@/services/gpu';
import { useValidatedQuery } from '@/hooks/utils';
import {
  GPUDevicesResponseSchema,
  GPUStatsSchema,
  GPUAllocationsResponseSchema,
} from '@/schemas/api.schemas';

/**
 * GPU 管理面板业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (GPU设备、统计、分配记录) - 使用 useValidatedQuery + Zod 验证
 * 2. GPU 分配和释放
 * 3. Modal 状态管理
 * 4. Tab 管理
 */
export const useGPUDashboard = () => {
  // ===== 状态管理 =====
  const [allocateVisible, setAllocateVisible] = useState(false);
  const [selectedGPU, setSelectedGPU] = useState<GPUDevice | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('devices');

  const [form] = Form.useForm();

  // ===== 数据加载 (使用 useValidatedQuery) =====

  /**
   * 加载 GPU 设备列表
   */
  const {
    data: gpusResponse,
    isLoading: loading,
    refetch: loadGPUs,
  } = useValidatedQuery({
    queryKey: ['gpu-devices'],
    queryFn: () => getGPUDevices({ page: 1, pageSize: 100 }),
    schema: GPUDevicesResponseSchema,
    apiErrorMessage: '加载 GPU 列表失败',
    fallbackValue: { data: [] },
    staleTime: 30 * 1000, // GPU设备列表30秒缓存
  });

  const gpus = gpusResponse?.data || [];

  /**
   * 加载 GPU 统计
   */
  const {
    data: stats,
    refetch: loadStats,
  } = useValidatedQuery({
    queryKey: ['gpu-stats'],
    queryFn: getGPUStats,
    schema: GPUStatsSchema,
    apiErrorMessage: '加载统计失败',
    fallbackValue: null,
    staleTime: 30 * 1000, // GPU统计30秒缓存
  });

  /**
   * 加载 GPU 分配记录（仅当 activeTab === 'allocations' 时加载）
   */
  const {
    data: allocationsResponse,
    refetch: loadAllocations,
  } = useValidatedQuery({
    queryKey: ['gpu-allocations', 'active'],
    queryFn: () => getGPUAllocations({ page: 1, pageSize: 50, status: 'active' }),
    schema: GPUAllocationsResponseSchema,
    apiErrorMessage: '加载分配记录失败',
    fallbackValue: { data: [] },
    enabled: activeTab === 'allocations', // 仅在 allocations tab 时加载
    staleTime: 30 * 1000,
  });

  const allocations = allocationsResponse?.data || [];

  // ===== 事件处理 =====

  /**
   * 打开分配模态框
   */
  const openAllocateModal = useCallback(
    (gpu: GPUDevice) => {
      if (gpu.allocatedTo) {
        message.warning('该 GPU 已被分配');
        return;
      }
      setSelectedGPU(gpu);
      setAllocateVisible(true);
      form.resetFields();
    },
    [form],
  );

  /**
   * 执行分配
   */
  const handleAllocate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      await allocateGPU(selectedGPU!.id, values.deviceId, values.mode);
      message.success('GPU 分配成功');
      setAllocateVisible(false);
      loadGPUs();
      loadStats();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('分配失败');
    }
  }, [form, selectedGPU, loadGPUs, loadStats]);

  /**
   * 释放 GPU
   */
  const handleDeallocate = useCallback(
    async (gpuId: string, deviceId?: string) => {
      try {
        await deallocateGPU(gpuId, deviceId);
        message.success('GPU 已释放');
        loadGPUs();
        loadStats();
        loadAllocations();
      } catch (_error) {
        message.error('释放失败');
      }
    },
    [loadGPUs, loadStats, loadAllocations],
  );

  /**
   * 查看详情
   */
  const viewDetail = useCallback((gpu: GPUDevice) => {
    setSelectedGPU(gpu);
    setDetailVisible(true);
  }, []);

  return {
    // 数据
    gpus,
    stats,
    allocations,
    loading,

    // Modal 状态
    allocateVisible,
    setAllocateVisible,
    selectedGPU,
    detailVisible,
    setDetailVisible,

    // Tab 状态
    activeTab,
    setActiveTab,

    // Form
    form,

    // 操作方法
    openAllocateModal,
    handleAllocate,
    handleDeallocate,
    viewDetail,
  };
};
