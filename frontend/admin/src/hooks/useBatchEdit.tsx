/**
 * 批量编辑 Hook
 *
 * 支持批量修改多个项目的字段值
 */

import { useState, useCallback } from 'react';

/**
 * 编辑字段配置
 */
export interface EditField<T = any> {
  /** 字段名 */
  name: keyof T;

  /** 字段标签 */
  label: string;

  /** 字段类型 */
  type: 'text' | 'number' | 'select' | 'date' | 'boolean' | 'textarea';

  /** 选项列表 (type=select 时使用) */
  options?: Array<{ label: string; value: any }>;

  /** 是否必填 */
  required?: boolean;

  /** 默认值 */
  defaultValue?: any;

  /** 提示文本 */
  placeholder?: string;

  /** 校验规则 */
  rules?: Array<{ required?: boolean; message?: string; pattern?: RegExp }>;
}

/**
 * 条件过滤器
 */
export interface ConditionalFilter<T = any> {
  /** 字段名 */
  field: keyof T;

  /** 操作符 */
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';

  /** 比较值 */
  value: any;
}

/**
 * 批量编辑选项
 */
export interface UseBatchEditOptions<T> {
  /** 可编辑的字段列表 */
  fields: EditField<T>[];

  /** 执行批量编辑的函数 */
  onBatchEdit: (ids: (string | number)[], updates: Partial<T>, filters?: ConditionalFilter<T>[]) => Promise<void>;

  /** 编辑成功回调 */
  onSuccess?: () => void;

  /** 编辑失败回调 */
  onError?: (error: Error) => void;

  /** 是否启用条件过滤 */
  enableConditionalFilters?: boolean;

  /** 可用于过滤的数据源 (用于预览) */
  dataSource?: T[];
}

export interface UseBatchEditResult<T> {
  /** 是否显示批量编辑模态框 */
  visible: boolean;

  /** 打开批量编辑模态框 */
  open: (ids: (string | number)[]) => void;

  /** 关闭批量编辑模态框 */
  close: () => void;

  /** 当前要编辑的 IDs */
  selectedIds: (string | number)[];

  /** 编辑的字段值 */
  values: Partial<T>;

  /** 设置字段值 */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;

  /** 批量设置多个字段值 */
  setValues: (updates: Partial<T>) => void;

  /** 重置字段值 */
  resetValues: () => void;

  /** 提交编辑 */
  submit: () => Promise<void>;

  /** 是否正在提交 */
  submitting: boolean;

  /** 可编辑的字段列表 */
  fields: EditField<T>[];

  /** 条件过滤器列表 */
  conditionalFilters: ConditionalFilter<T>[];

  /** 添加条件过滤器 */
  addFilter: (filter: ConditionalFilter<T>) => void;

  /** 删除条件过滤器 */
  removeFilter: (index: number) => void;

  /** 清空条件过滤器 */
  clearFilters: () => void;

  /** 是否启用条件过滤 */
  enableConditionalFilters: boolean;

  /** 预览受影响的记录数 */
  affectedCount: number;
}

/**
 * 批量编辑 Hook
 *
 * @example
 * ```tsx
 * const {
 *   visible,
 *   open,
 *   close,
 *   values,
 *   setValue,
 *   submit,
 *   submitting,
 * } = useBatchEdit({
 *   fields: [
 *     { name: 'status', label: '状态', type: 'select', options: [...] },
 *     { name: 'role', label: '角色', type: 'select', options: [...] },
 *   ],
 *   onBatchEdit: async (ids, updates) => {
 *     await api.batchUpdateUsers(ids, updates);
 *   },
 *   onSuccess: () => {
 *     message.success('批量编辑成功');
 *     queryClient.invalidateQueries(['users']);
 *   },
 * });
 *
 * // 打开批量编辑
 * <Button onClick={() => open(selectedIds)}>批量编辑</Button>
 *
 * // 渲染编辑模态框
 * <BatchEditModal
 *   visible={visible}
 *   onClose={close}
 *   values={values}
 *   onValueChange={setValue}
 *   onSubmit={submit}
 *   submitting={submitting}
 * />
 * ```
 */
/**
 * 评估条件过滤器
 */
const evaluateFilter = <T,>(item: T, filter: ConditionalFilter<T>): boolean => {
  const fieldValue = item[filter.field];
  const { operator, value } = filter;

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'notEquals':
      return fieldValue !== value;
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'notContains':
      return !String(fieldValue).includes(String(value));
    case 'greaterThan':
      return Number(fieldValue) > Number(value);
    case 'lessThan':
      return Number(fieldValue) < Number(value);
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'notIn':
      return Array.isArray(value) && !value.includes(fieldValue);
    default:
      return true;
  }
};

/**
 * 过滤数据源
 */
const filterDataSource = <T,>(
  dataSource: T[],
  filters: ConditionalFilter<T>[]
): T[] => {
  if (filters.length === 0) return dataSource;

  return dataSource.filter((item) =>
    filters.every((filter) => evaluateFilter(item, filter))
  );
};

export const useBatchEdit = <T extends Record<string, any> = Record<string, any>>(
  options: UseBatchEditOptions<T>
): UseBatchEditResult<T> => {
  const {
    fields,
    onBatchEdit,
    onSuccess,
    onError,
    enableConditionalFilters = false,
    dataSource = [],
  } = options;

  const [visible, setVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [values, setValuesState] = useState<Partial<T>>({});
  const [submitting, setSubmitting] = useState(false);
  const [conditionalFilters, setConditionalFilters] = useState<ConditionalFilter<T>[]>([]);

  // 打开编辑模态框
  const open = useCallback((ids: (string | number)[]) => {
    setSelectedIds(ids);
    setVisible(true);

    // 设置默认值
    const defaultValues: Partial<T> = {};
    fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.name] = field.defaultValue;
      }
    });
    setValuesState(defaultValues);
  }, [fields]);

  // 关闭编辑模态框
  const close = useCallback(() => {
    setVisible(false);
    setSelectedIds([]);
    setValuesState({});
    setConditionalFilters([]);
  }, []);

  // 设置单个字段值
  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // 批量设置多个字段值
  const setValues = useCallback((updates: Partial<T>) => {
    setValuesState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // 重置字段值
  const resetValues = useCallback(() => {
    setValuesState({});
  }, []);

  // 添加条件过滤器
  const addFilter = useCallback((filter: ConditionalFilter<T>) => {
    setConditionalFilters((prev) => [...prev, filter]);
  }, []);

  // 删除条件过滤器
  const removeFilter = useCallback((index: number) => {
    setConditionalFilters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 清空条件过滤器
  const clearFilters = useCallback(() => {
    setConditionalFilters([]);
  }, []);

  // 计算受影响的记录数
  const affectedCount = useCallback(() => {
    if (!enableConditionalFilters || conditionalFilters.length === 0) {
      return selectedIds.length;
    }

    // 从dataSource中过滤出选中的项
    const selectedItems = dataSource.filter((item: any) =>
      selectedIds.includes(item.id)
    );

    // 应用条件过滤器
    const filteredItems = filterDataSource(selectedItems, conditionalFilters);

    return filteredItems.length;
  }, [enableConditionalFilters, conditionalFilters, selectedIds, dataSource])();

  // 提交编辑
  const submit = useCallback(async () => {
    // 验证是否有修改
    if (Object.keys(values).length === 0) {
      throw new Error('请至少修改一个字段');
    }

    // 验证必填字段
    const errors: string[] = [];
    fields.forEach((field) => {
      if (field.required && !values[field.name]) {
        errors.push(`${field.label}不能为空`);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    setSubmitting(true);

    try {
      await onBatchEdit(
        selectedIds,
        values,
        enableConditionalFilters ? conditionalFilters : undefined
      );
      onSuccess?.();
      close();
    } catch (_error) {
      onError?.(error as Error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [
    selectedIds,
    values,
    fields,
    onBatchEdit,
    onSuccess,
    onError,
    close,
    enableConditionalFilters,
    conditionalFilters,
  ]);

  return {
    visible,
    open,
    close,
    selectedIds,
    values,
    setValue,
    setValues,
    resetValues,
    submit,
    submitting,
    fields,
    conditionalFilters,
    addFilter,
    removeFilter,
    clearFilters,
    enableConditionalFilters,
    affectedCount,
  };
};
