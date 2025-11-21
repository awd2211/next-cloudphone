/**
 * 列自定义 Hook
 *
 * 功能:
 * 1. 管理列的显示/隐藏状态
 * 2. 持久化到 localStorage
 * 3. 提供拖拽排序能力
 * 4. 重置到默认状态
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { ColumnsType } from 'antd/es/table';

export interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
  fixed?: boolean; // 固定列不可隐藏
}

export interface UseColumnCustomizerOptions<T> {
  /** 所有可用的列配置 */
  columns: ColumnsType<T>;

  /** localStorage 存储键名 */
  storageKey: string;

  /** 默认隐藏的列 key */
  defaultHiddenKeys?: string[];

  /** 固定显示的列 key (不可隐藏) */
  fixedKeys?: string[];
}

export interface UseColumnCustomizerResult<T> {
  /** 当前可见的列 */
  visibleColumns: ColumnsType<T>;

  /** 列配置数组 */
  columnConfigs: ColumnConfig[];

  /** 切换列的显示/隐藏 */
  toggleColumn: (key: string) => void;

  /** 显示所有列 */
  showAllColumns: () => void;

  /** 隐藏所有可隐藏的列 */
  hideAllColumns: () => void;

  /** 重置到默认状态 */
  resetColumns: () => void;

  /** 设置列配置 */
  setColumnConfigs: (configs: ColumnConfig[]) => void;
}

/**
 * 列自定义 Hook
 *
 * @example
 * ```tsx
 * const { visibleColumns, columnConfigs, toggleColumn } = useColumnCustomizer({
 *   columns: deviceColumns,
 *   storageKey: 'device-list-columns',
 *   defaultHiddenKeys: ['androidVersion', 'memory'],
 *   fixedKeys: ['id', 'name', 'actions'],
 * });
 *
 * return (
 *   <>
 *     <ColumnCustomizerButton configs={columnConfigs} onToggle={toggleColumn} />
 *     <Table columns={visibleColumns} dataSource={data} />
 *   </>
 * );
 * ```
 */
export const useColumnCustomizer = <T extends Record<string, any>>({
  columns,
  storageKey,
  defaultHiddenKeys = [],
  fixedKeys = [],
}: UseColumnCustomizerOptions<T>): UseColumnCustomizerResult<T> => {
  // 初始化列配置
  const initialConfigs = useMemo<ColumnConfig[]>(() => {
    // 尝试从 localStorage 加载
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const savedConfigs = JSON.parse(saved) as ColumnConfig[];
        // 验证保存的配置是否与当前列匹配
        const savedKeys = new Set(savedConfigs.map(c => c.key));
        const currentKeys = new Set(columns.map(c => c.key as string));

        if (savedKeys.size === currentKeys.size &&
            [...savedKeys].every(k => currentKeys.has(k))) {
          return savedConfigs;
        }
      }
    } catch (_error) {
      console.warn('Failed to load column configs from localStorage:', error);
    }

    // 使用默认配置
    return columns.map(col => ({
      key: col.key as string,
      title: (typeof col.title === 'string' ? col.title : col.key) as string,
      visible: !defaultHiddenKeys.includes(col.key as string),
      fixed: fixedKeys.includes(col.key as string),
    }));
  }, [columns, storageKey, defaultHiddenKeys, fixedKeys]);

  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(initialConfigs);

  // 持久化到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnConfigs));
    } catch (_error) {
      console.warn('Failed to save column configs to localStorage:', error);
    }
  }, [columnConfigs, storageKey]);

  // 计算可见的列
  const visibleColumns = useMemo(() => {
    const visibleKeys = new Set(
      columnConfigs.filter(c => c.visible).map(c => c.key)
    );
    return columns.filter(col => visibleKeys.has(col.key as string));
  }, [columns, columnConfigs]);

  // 切换列显示
  const toggleColumn = useCallback((key: string) => {
    setColumnConfigs(prev =>
      prev.map(config =>
        config.key === key && !config.fixed
          ? { ...config, visible: !config.visible }
          : config
      )
    );
  }, []);

  // 显示所有列
  const showAllColumns = useCallback(() => {
    setColumnConfigs(prev =>
      prev.map(config => ({ ...config, visible: true }))
    );
  }, []);

  // 隐藏所有可隐藏的列
  const hideAllColumns = useCallback(() => {
    setColumnConfigs(prev =>
      prev.map(config => ({
        ...config,
        visible: config.fixed ? true : false,
      }))
    );
  }, []);

  // 重置到默认状态
  const resetColumns = useCallback(() => {
    const defaultConfigs = columns.map(col => ({
      key: col.key as string,
      title: (typeof col.title === 'string' ? col.title : col.key) as string,
      visible: !defaultHiddenKeys.includes(col.key as string),
      fixed: fixedKeys.includes(col.key as string),
    }));
    setColumnConfigs(defaultConfigs);
  }, [columns, defaultHiddenKeys, fixedKeys]);

  return {
    visibleColumns,
    columnConfigs,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    resetColumns,
    setColumnConfigs,
  };
};
