import { useCallback } from 'react';
import { message } from 'antd';
import { useAsyncOperation } from './useAsyncOperation';
import {
  batchStartDevices,
  batchStopDevices,
  batchRebootDevices,
  batchDeleteDevices,
} from '@/services/device';
import { queryClient } from '@/lib/react-query';
import { deviceKeys } from './useDevices';

interface UseDeviceBatchOperationsProps {
  selectedRowKeys: React.Key[];
  onSuccess?: () => void;
}

/**
 * 设备批量操作 Hook
 * 封装批量启动、停止、重启、删除逻辑
 */
export const useDeviceBatchOperations = ({
  selectedRowKeys,
  onSuccess,
}: UseDeviceBatchOperationsProps) => {
  const { execute: executeBatchOperation } = useAsyncOperation();

  const handleBatchStart = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要启动的设备');
      return;
    }

    await executeBatchOperation(() => batchStartDevices(selectedRowKeys as string[]), {
      successMessage: `成功启动 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量启动${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      },
    });
  }, [selectedRowKeys, executeBatchOperation, onSuccess]);

  const handleBatchStop = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要停止的设备');
      return;
    }

    await executeBatchOperation(() => batchStopDevices(selectedRowKeys as string[]), {
      successMessage: `成功停止 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量停止${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      },
    });
  }, [selectedRowKeys, executeBatchOperation, onSuccess]);

  const handleBatchReboot = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要重启的设备');
      return;
    }

    await executeBatchOperation(() => batchRebootDevices(selectedRowKeys as string[]), {
      successMessage: `成功重启 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量重启${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        onSuccess?.();
        // 重启需要延迟一下再刷新列表
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        }, 2000);
      },
    });
  }, [selectedRowKeys, executeBatchOperation, onSuccess]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的设备');
      return;
    }

    await executeBatchOperation(() => batchDeleteDevices(selectedRowKeys as string[]), {
      successMessage: `成功删除 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量删除${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        onSuccess?.();
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      },
    });
  }, [selectedRowKeys, executeBatchOperation, onSuccess]);

  return {
    handleBatchStart,
    handleBatchStop,
    handleBatchReboot,
    handleBatchDelete,
  };
};
