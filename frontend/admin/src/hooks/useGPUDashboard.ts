import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import type { GPUDevice, GPUStats, GPUAllocation } from '@/types';
import {
  getGPUDevices,
  getGPUStats,
  allocateGPU,
  deallocateGPU,
  getGPUAllocations,
} from '@/services/gpu';
import { useSafeApi } from './useSafeApi';
import {
  GPUDevicesResponseSchema,
  GPUStatsSchema,
  GPUAllocationsResponseSchema,
} from '@/schemas/api.schemas';

/**
 * GPU 管理面板业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (GPU设备、统计、分配记录) - 使用 useSafeApi + Zod 验证
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

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载 GPU 设备列表
   */
  const {
    data: gpusResponse,
    loading,
    execute: executeLoadGPUs,
  } = useSafeApi(
    () => getGPUDevices({ page: 1, pageSize: 100 }),
    GPUDevicesResponseSchema,
    {
      errorMessage: '加载 GPU 列表失败',
      fallbackValue: { data: [] },
    }
  );

  const gpus = gpusResponse?.data || [];

  /**
   * 加载 GPU 统计
   */
  const {
    data: stats,
    execute: executeLoadStats,
  } = useSafeApi(
    getGPUStats,
    GPUStatsSchema,
    {
      errorMessage: '加载统计失败',
      fallbackValue: null,
    }
  );

  /**
   * 加载 GPU 分配记录
   */
  const {
    data: allocationsResponse,
    execute: executeLoadAllocations,
  } = useSafeApi(
    () => getGPUAllocations({ page: 1, pageSize: 50, status: 'active' }),
    GPUAllocationsResponseSchema,
    {
      errorMessage: '加载分配记录失败',
      fallbackValue: { data: [] },
      manual: true,
    }
  );

  const allocations = allocationsResponse?.data || [];

  /**
   * 初始化加载
   */
  useEffect(() => {
    executeLoadGPUs();
    executeLoadStats();
  }, [executeLoadGPUs, executeLoadStats]);

  /**
   * Tab 切换时加载分配记录
   */
  useEffect(() => {
    if (activeTab === 'allocations') {
      executeLoadAllocations();
    }
  }, [activeTab, executeLoadAllocations]);

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
      executeLoadGPUs();
      executeLoadStats();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('分配失败');
    }
  }, [form, selectedGPU, executeLoadGPUs, executeLoadStats]);

  /**
   * 释放 GPU
   */
  const handleDeallocate = useCallback(
    async (gpuId: string, deviceId?: string) => {
      try {
        await deallocateGPU(gpuId, deviceId);
        message.success('GPU 已释放');
        executeLoadGPUs();
        executeLoadStats();
        executeLoadAllocations();
      } catch (error) {
        message.error('释放失败');
      }
    },
    [executeLoadGPUs, executeLoadStats, executeLoadAllocations],
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
