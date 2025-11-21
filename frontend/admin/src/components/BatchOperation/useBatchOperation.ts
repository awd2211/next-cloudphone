/**
 * 批量操作 Hook
 *
 * 提供批量操作的状态管理和执行逻辑
 * 支持并发控制、错误处理、进度跟踪
 */

import { useState, useCallback, useRef } from 'react';
import type { BatchOperationItem } from './BatchProgressModal';

export interface UseBatchOperationOptions<T> {
  /** 批量操作的标题 */
  title: string;

  /** 操作项列表 */
  items: T[];

  /** 获取操作项的唯一标识 */
  getItemId: (item: T) => string;

  /** 获取操作项的显示名称 */
  getItemName: (item: T) => string;

  /** 执行单个操作的函数 */
  operationFn: (item: T) => Promise<void>;

  /** 并发数限制（默认 5） */
  concurrency?: number;

  /** 操作完成后的回调 */
  onComplete?: (successCount: number, errorCount: number) => void;
}

export interface UseBatchOperationResult {
  /** 是否显示进度模态框 */
  visible: boolean;

  /** 模态框标题 */
  title: string;

  /** 操作项列表（带状态） */
  items: BatchOperationItem[];

  /** 开始批量操作 */
  start: () => Promise<void>;

  /** 取消批量操作 */
  cancel: () => void;

  /** 关闭模态框 */
  close: () => void;

  /** 是否正在执行 */
  isRunning: boolean;
}

/**
 * 批量操作 Hook
 *
 * @example
 * ```tsx
 * const batchDelete = useBatchOperation({
 *   title: '批量删除设备',
 *   items: selectedDevices,
 *   getItemId: (device) => device.id,
 *   getItemName: (device) => device.name,
 *   operationFn: async (device) => {
 *     await deleteDevice(device.id);
 *   },
 *   onComplete: (successCount, errorCount) => {
 *     message.success(`删除完成：成功 ${successCount} 项，失败 ${errorCount} 项`);
 *     refetch(); // 刷新列表
 *   },
 * });
 *
 * // 使用
 * <Button onClick={batchDelete.start}>批量删除</Button>
 * <BatchProgressModal {...batchDelete} />
 * ```
 */
export const useBatchOperation = <T,>(
  options: UseBatchOperationOptions<T>
): UseBatchOperationResult => {
  const {
    title,
    items: sourceItems,
    getItemId,
    getItemName,
    operationFn,
    concurrency = 5,
    onComplete,
  } = options;

  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<BatchOperationItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef(false);

  /**
   * 开始批量操作
   */
  const start = useCallback(async () => {
    if (sourceItems.length === 0) {
      return;
    }

    // 初始化操作项状态
    const initialItems: BatchOperationItem[] = sourceItems.map((item) => ({
      id: getItemId(item),
      name: getItemName(item),
      status: 'pending',
    }));

    setItems(initialItems);
    setVisible(true);
    setIsRunning(true);
    cancelRef.current = false;

    // 创建操作队列
    const queue = [...sourceItems];
    const processing = new Set<number>();
    let currentIndex = 0;

    let successCount = 0;
    let errorCount = 0;

    /**
     * 处理单个操作
     */
    const processItem = async (item: T, index: number) => {
      // 检查是否已取消
      if (cancelRef.current) {
        return;
      }

      const itemId = getItemId(item);

      // 更新状态为处理中
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: 'processing' as const } : i))
      );

      try {
        await operationFn(item);

        // 成功
        successCount++;
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, status: 'success' as const } : i))
        );
      } catch (error: any) {
        // 失败
        errorCount++;
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status: 'error' as const,
                  error: error.message || '操作失败',
                }
              : i
          )
        );
      } finally {
        processing.delete(index);
      }
    };

    /**
     * 并发执行操作
     */
    const executeWithConcurrency = async () => {
      const promises: Promise<void>[] = [];

      while (currentIndex < queue.length || processing.size > 0) {
        // 检查是否已取消
        if (cancelRef.current) {
          break;
        }

        // 启动新的操作（如果有空闲槽位）
        while (processing.size < concurrency && currentIndex < queue.length) {
          const index = currentIndex;
          const item = queue[index];
          processing.add(index);
          currentIndex++;

          const promise = processItem(item!, index);
          promises.push(promise);
        }

        // 等待至少一个操作完成
        if (promises.length > 0) {
          await Promise.race(promises);
        }

        // 清理已完成的 promises
        const stillPending = [];
        for (const promise of promises) {
          if (processing.size > 0) {
            stillPending.push(promise);
          }
        }
        promises.length = 0;
        promises.push(...stillPending);
      }

      // 等待所有操作完成
      await Promise.all(promises);
    };

    try {
      await executeWithConcurrency();
    } finally {
      setIsRunning(false);

      // 调用完成回调
      if (onComplete) {
        onComplete(successCount, errorCount);
      }
    }
  }, [sourceItems, getItemId, getItemName, operationFn, concurrency, onComplete]);

  /**
   * 取消批量操作
   */
  const cancel = useCallback(() => {
    cancelRef.current = true;
    setIsRunning(false);

    // 将所有 pending 和 processing 状态的项标记为已取消（使用 error 状态）
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'pending' || item.status === 'processing'
          ? { ...item, status: 'error' as const, error: '操作已取消' }
          : item
      )
    );
  }, []);

  /**
   * 关闭模态框
   */
  const close = useCallback(() => {
    setVisible(false);
    setItems([]);
    setIsRunning(false);
  }, []);

  return {
    visible,
    title,
    items,
    start,
    cancel,
    close,
    isRunning,
  };
};
