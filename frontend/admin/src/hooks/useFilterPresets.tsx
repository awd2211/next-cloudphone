/**
 * 筛选方案管理 Hook
 *
 * 支持保存、加载、删除筛选方案,提升用户筛选效率
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * 筛选方案接口
 */
export interface FilterPreset<T = Record<string, any>> {
  /** 唯一标识符 */
  id: string;

  /** 方案名称 */
  name: string;

  /** 方案描述 */
  description?: string;

  /** 筛选条件 */
  filters: T;

  /** 是否为默认方案 */
  isDefault?: boolean;

  /** 创建时间 */
  createdAt: string;

  /** 更新时间 */
  updatedAt?: string;
}

export interface UseFilterPresetsOptions<T> {
  /** LocalStorage 存储键 */
  storageKey: string;

  /** 初始筛选条件 */
  initialFilters?: T;

  /** 默认方案列表 */
  defaultPresets?: FilterPreset<T>[];
}

export interface UseFilterPresetsResult<T> {
  /** 当前筛选条件 */
  filters: T;

  /** 设置筛选条件 */
  setFilters: (filters: T) => void;

  /** 所有方案列表 */
  presets: FilterPreset<T>[];

  /** 当前激活的方案 ID */
  activePresetId: string | null;

  /** 保存当前筛选条件为方案 */
  savePreset: (name: string, description?: string) => void;

  /** 加载方案 */
  loadPreset: (presetId: string) => void;

  /** 更新方案 */
  updatePreset: (presetId: string, updates: Partial<FilterPreset<T>>) => void;

  /** 删除方案 */
  deletePreset: (presetId: string) => void;

  /** 设置默认方案 */
  setDefaultPreset: (presetId: string | null) => void;

  /** 导入方案 */
  importPresets: (presets: FilterPreset<T>[]) => void;

  /** 重置筛选条件 */
  resetFilters: () => void;
}

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * 筛选方案管理 Hook
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setFilters,
 *   presets,
 *   savePreset,
 *   loadPreset,
 *   deletePreset,
 * } = useFilterPresets({
 *   storageKey: 'user-list-presets',
 *   initialFilters: { status: '', role: '' },
 * });
 *
 * // 保存当前筛选条件
 * savePreset('活跃用户', '状态为 active 的用户');
 *
 * // 加载已保存的方案
 * loadPreset(presetId);
 * ```
 */
export const useFilterPresets = <T extends Record<string, any> = Record<string, any>>(
  options: UseFilterPresetsOptions<T>
): UseFilterPresetsResult<T> => {
  const { storageKey, initialFilters = {} as T, defaultPresets = [] } = options;

  // 从 localStorage 加载方案列表
  const loadPresets = useCallback((): FilterPreset<T>[] => {
    try {
      const saved = localStorage.getItem(`${storageKey}_presets`);
      if (saved) {
        const parsed = JSON.parse(saved) as FilterPreset<T>[];
        // 合并默认方案
        const savedIds = new Set(parsed.map((p) => p.id));
        const uniqueDefaultPresets = defaultPresets.filter((p) => !savedIds.has(p.id));
        return [...parsed, ...uniqueDefaultPresets];
      }
    } catch (error) {
      console.warn('Failed to load filter presets from localStorage:', error);
    }
    return defaultPresets;
  }, [storageKey, defaultPresets]);

  const [presets, setPresets] = useState<FilterPreset<T>[]>(loadPresets);
  const [filters, setFiltersState] = useState<T>(initialFilters);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // 保存方案列表到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_presets`, JSON.stringify(presets));
    } catch (error) {
      console.warn('Failed to save filter presets to localStorage:', error);
    }
  }, [presets, storageKey]);

  // 加载默认方案 (如果有)
  useEffect(() => {
    const defaultPreset = presets.find((p) => p.isDefault);
    if (defaultPreset && !activePresetId) {
      setFiltersState(defaultPreset.filters);
      setActivePresetId(defaultPreset.id);
    }
  }, []); // 只在初始化时执行

  // 设置筛选条件 (清除激活的方案)
  const setFilters = useCallback((newFilters: T) => {
    setFiltersState(newFilters);
    setActivePresetId(null);
  }, []);

  // 保存当前筛选条件为方案
  const savePreset = useCallback(
    (name: string, description?: string) => {
      const newPreset: FilterPreset<T> = {
        id: generateId(),
        name,
        description,
        filters,
        createdAt: new Date().toISOString(),
      };

      setPresets((prev) => [...prev, newPreset]);
      setActivePresetId(newPreset.id);
    },
    [filters]
  );

  // 加载方案
  const loadPreset = useCallback((presetId: string) => {
    setPresets((prev) => {
      const preset = prev.find((p) => p.id === presetId);
      if (preset) {
        setFiltersState(preset.filters);
        setActivePresetId(presetId);
      }
      return prev;
    });
  }, []);

  // 更新方案
  const updatePreset = useCallback(
    (presetId: string, updates: Partial<FilterPreset<T>>) => {
      setPresets((prev) =>
        prev.map((preset) =>
          preset.id === presetId
            ? { ...preset, ...updates, updatedAt: new Date().toISOString() }
            : preset
        )
      );
    },
    []
  );

  // 删除方案
  const deletePreset = useCallback((presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    setActivePresetId((prevId) => (prevId === presetId ? null : prevId));
  }, []);

  // 设置默认方案
  const setDefaultPreset = useCallback((presetId: string | null) => {
    setPresets((prev) =>
      prev.map((preset) => ({
        ...preset,
        isDefault: preset.id === presetId,
      }))
    );
  }, []);

  // 导入方案
  const importPresets = useCallback((importedPresets: FilterPreset<T>[]) => {
    setPresets((prev) => {
      // 去重:使用导入的方案覆盖同名方案
      const prevMap = new Map(prev.map((p) => [p.name, p]));
      const importedMap = new Map(importedPresets.map((p) => [p.name, p]));

      // 合并方案,导入的方案优先
      const merged = new Map([...prevMap, ...importedMap]);

      return Array.from(merged.values());
    });
  }, []);

  // 重置筛选条件
  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
    setActivePresetId(null);
  }, [initialFilters]);

  return {
    filters,
    setFilters,
    presets,
    activePresetId,
    savePreset,
    loadPreset,
    updatePreset,
    deletePreset,
    setDefaultPreset,
    importPresets,
    resetFilters,
  };
};
