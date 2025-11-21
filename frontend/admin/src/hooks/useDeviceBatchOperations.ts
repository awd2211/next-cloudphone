import { useCallback } from 'react';
import { message } from 'antd';
import { useBatchOperation } from '@/components/BatchOperation/useBatchOperation';
import { startDevice, stopDevice, rebootDevice, deleteDevice } from '@/services/device';
import { queryClient } from '@/lib/react-query';
import { deviceKeys } from './queries';

interface UseDeviceBatchOperationsProps {
  selectedRowKeys: React.Key[];
  devices: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

/**
 * 设备批量操作 Hook (优化版 - 带进度展示)
 *
 * 优化点:
 * 1. ✅ 使用 BatchProgressModal 显示实时进度
 * 2. ✅ 并发控制 (默认 5 个并发)
 * 3. ✅ 失败重试机制
 * 4. ✅ 详细的错误信息展示
 */
export const useDeviceBatchOperations = ({
  selectedRowKeys,
  devices,
  onSuccess,
}: UseDeviceBatchOperationsProps) => {
  // 批量启动
  const batchStart = useBatchOperation({
    title: '批量启动设备',
    items: devices.filter((d) => selectedRowKeys.includes(d.id)),
    getItemId: (device) => device.id,
    getItemName: (device) => device.name,
    operationFn: async (device) => {
      await startDevice(device.id);
    },
    onComplete: (successCount, errorCount) => {
      if (successCount > 0) {
        message.success(`成功启动 ${successCount} 台设备${errorCount > 0 ? `, ${errorCount} 台失败` : ''}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
        onSuccess?.();
      }
    },
  });

  // 批量停止
  const batchStop = useBatchOperation({
    title: '批量停止设备',
    items: devices.filter((d) => selectedRowKeys.includes(d.id)),
    getItemId: (device) => device.id,
    getItemName: (device) => device.name,
    operationFn: async (device) => {
      await stopDevice(device.id);
    },
    onComplete: (successCount, errorCount) => {
      if (successCount > 0) {
        message.success(`成功停止 ${successCount} 台设备${errorCount > 0 ? `, ${errorCount} 台失败` : ''}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
        onSuccess?.();
      }
    },
  });

  // 批量重启
  const batchReboot = useBatchOperation({
    title: '批量重启设备',
    items: devices.filter((d) => selectedRowKeys.includes(d.id)),
    getItemId: (device) => device.id,
    getItemName: (device) => device.name,
    operationFn: async (device) => {
      await rebootDevice(device.id);
    },
    onComplete: (successCount, errorCount) => {
      if (successCount > 0) {
        message.success(`成功重启 ${successCount} 台设备${errorCount > 0 ? `, ${errorCount} 台失败` : ''}`);
        // 重启需要延迟一下再刷新列表
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        }, 2000);
        onSuccess?.();
      }
    },
  });

  // 批量删除
  const batchDelete = useBatchOperation({
    title: '批量删除设备',
    items: devices.filter((d) => selectedRowKeys.includes(d.id)),
    getItemId: (device) => device.id,
    getItemName: (device) => device.name,
    operationFn: async (device) => {
      await deleteDevice(device.id);
    },
    onComplete: (successCount, errorCount) => {
      if (successCount > 0) {
        message.success(`成功删除 ${successCount} 台设备${errorCount > 0 ? `, ${errorCount} 台失败` : ''}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
        onSuccess?.();
      }
    },
  });

  const handleBatchStart = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要启动的设备');
      return;
    }
    batchStart.start();
  }, [selectedRowKeys, batchStart]);

  const handleBatchStop = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要停止的设备');
      return;
    }
    batchStop.start();
  }, [selectedRowKeys, batchStop]);

  const handleBatchReboot = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要重启的设备');
      return;
    }
    batchReboot.start();
  }, [selectedRowKeys, batchReboot]);

  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的设备');
      return;
    }
    batchDelete.start();
  }, [selectedRowKeys, batchDelete]);

  return {
    handleBatchStart,
    handleBatchStop,
    handleBatchReboot,
    handleBatchDelete,
    // 进度模态框状态
    batchStartProgress: batchStart,
    batchStopProgress: batchStop,
    batchRebootProgress: batchReboot,
    batchDeleteProgress: batchDelete,
  };
};
