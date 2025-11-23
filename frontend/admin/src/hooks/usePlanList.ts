import { useState, useMemo, useCallback } from 'react';
import { Form } from 'antd';
import type { Plan, CreatePlanDto } from '@/types';
import {
  usePlans,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
  useTogglePlanStatus,
} from './queries/usePlans';
import { usePlanTableColumns } from '@/components/Plan/PlanTableColumns';

/**
 * 套餐列表业务逻辑管理
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 乐观更新（状态切换）
 * 5. ✅ 自动缓存失效和重新获取
 */
export const usePlanList = () => {
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // 表单实例
  const [form] = Form.useForm();

  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');

  // React Query hooks
  const params = useMemo(() => ({ page, pageSize, search: searchKeyword }), [page, pageSize, searchKeyword]);
  const { data, isLoading, error, refetch } = usePlans(params);

  // Mutations
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const deleteMutation = useDeletePlan();
  const toggleStatusMutation = useTogglePlanStatus();

  // 数据源
  const plans = data?.data || [];
  const total = data?.total || 0;

  // 统计数据
  const stats = useMemo(() => {
    const activePlans = plans.filter((p: Plan) => p.isActive).length;
    const inactivePlans = plans.filter((p: Plan) => !p.isActive).length;
    return {
      total,
      active: activePlans,
      inactive: inactivePlans,
    };
  }, [plans, total]);

  /**
   * 提交表单（创建或更新）
   */
  const handleSubmit = useCallback(
    async (values: CreatePlanDto) => {
      if (editingPlan) {
        await updateMutation.mutateAsync({ id: editingPlan.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setModalVisible(false);
      setEditingPlan(null);
      form.resetFields();
    },
    [editingPlan, createMutation, updateMutation, form]
  );

  /**
   * 打开编辑模态框
   */
  const handleEdit = useCallback(
    (plan: Plan) => {
      setEditingPlan(plan);
      form.setFieldsValue(plan);
      setModalVisible(true);
    },
    [form]
  );

  /**
   * 删除套餐
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  /**
   * 切换套餐状态
   */
  const handleToggleStatus = useCallback(
    async (id: string, enabled: boolean) => {
      await toggleStatusMutation.mutateAsync({ id, enabled });
    },
    [toggleStatusMutation]
  );

  /**
   * 打开创建模态框
   */
  const handleCreate = useCallback(() => {
    setEditingPlan(null);
    form.resetFields();
    setModalVisible(true);
  }, [form]);

  /**
   * 关闭模态框
   */
  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
    setEditingPlan(null);
    form.resetFields();
  }, [form]);

  /**
   * 搜索处理
   */
  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  // 表格列配置
  const columns = usePlanTableColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onToggleStatus: handleToggleStatus,
    toggleStatusLoading: toggleStatusMutation.isPending,
  });

  return {
    // 数据状态
    plans,
    total,
    isLoading,
    error,
    refetch,
    page,
    pageSize,

    // 统计数据
    stats,

    // 搜索状态
    searchKeyword,
    handleSearch,

    // 模态框状态
    modalVisible,
    editingPlan: !!editingPlan,
    form,

    // 表格列
    columns,

    // 状态更新函数
    setPage,
    setPageSize,

    // 操作函数
    handleSubmit,
    handleCreate,
    handleModalCancel,

    // 加载状态
    confirmLoading: createMutation.isPending || updateMutation.isPending,
  };
};
