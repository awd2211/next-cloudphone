import { useState, useCallback } from 'react';
import { message, Form } from 'antd';
import { api } from '@/utils/api';
import type { DeviceGroup } from './useDeviceGroups';

interface UseBatchOperationReturn {
  // 状态
  batchOpVisible: boolean;
  selectedGroup: DeviceGroup | null;
  batchProgress: number;
  batchForm: ReturnType<typeof Form.useForm>[0];

  // 操作方法
  openBatchOperation: (group: DeviceGroup) => void;
  handleBatchOperation: () => Promise<void>;
  setBatchOpVisible: (visible: boolean) => void;
}

/**
 * 批量操作管理 Hook
 * 封装设备分组的批量操作功能
 */
export const useBatchOperation = (): UseBatchOperationReturn => {
  const [batchOpVisible, setBatchOpVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchForm] = Form.useForm();

  // 打开批量操作 Modal
  const openBatchOperation = useCallback(
    (group: DeviceGroup) => {
      setSelectedGroup(group);
      setBatchOpVisible(true);
      batchForm.resetFields();
      setBatchProgress(0);
    },
    [batchForm]
  );

  // 执行批量操作
  const handleBatchOperation = useCallback(async () => {
    try {
      const values = await batchForm.validateFields();
      await api.post('/devices/groups/batch-operation', {
        groupId: selectedGroup!.id,
        operation: values.operation,
        params: values.params ? JSON.parse(values.params) : {},
      });

      // 模拟进度
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setBatchProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          message.success('批量操作完成');
          setBatchOpVisible(false);
        }
      }, 500);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    }
  }, [selectedGroup, batchForm]);

  return {
    batchOpVisible,
    selectedGroup,
    batchProgress,
    batchForm,
    openBatchOperation,
    handleBatchOperation,
    setBatchOpVisible,
  };
};
