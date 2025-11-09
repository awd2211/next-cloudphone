import { useState, useMemo, useCallback } from 'react';
import { Form, message } from 'antd';
import type { User } from '@/types';
import type { ErrorInfo } from '@/components/ErrorAlert';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/components/User';
import { useFilterState } from './useFilterState';

/**
 * 用户列表页面状态管理 Hook
 *
 * 功能:
 * 1. 统一管理所有 Modal 状态
 * 2. 统一管理所有 Form 实例
 * 3. 提供筛选、分页、选择等状态
 * 4. 封装常用的事件处理逻辑
 * 5. ✅ URL 筛选器持久化 - 支持分享筛选后的链接
 */
export const useUserListState = () => {
  // ===== 分页和筛选状态 (使用 URL 持久化) =====
  const { filters, setFilters } = useFilterState({
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    username: '',
    email: '',
    phone: '',
    status: '',
    roleId: '',
    minBalance: undefined as number | undefined,
    maxBalance: undefined as number | undefined,
    startDate: '',
    endDate: '',
  });

  // ===== Modal 状态 =====
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);

  // ===== 业务状态 =====
  const [balanceType, setBalanceType] = useState<'recharge' | 'deduct'>('recharge');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceError, setBalanceError] = useState<ErrorInfo | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [visibleEmails, setVisibleEmails] = useState<Set<string>>(new Set());

  // ===== 筛选展开状态 (不需要持久化) =====
  const [filterExpanded, setFilterExpanded] = useState(false);

  // ===== Form 实例 =====
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  // ===== 计算属性 =====
  const params = useMemo(() => {
    // filters 已经包含所有筛选条件,直接作为 params 返回
    return filters;
  }, [filters]);

  const hasFilters = useMemo(() => {
    // 排除 page 和 pageSize,只检查实际的筛选条件
    return Object.keys(filters).some(
      (key) =>
        key !== 'page' &&
        key !== 'pageSize' &&
        filters[key] !== undefined &&
        filters[key] !== ''
    );
  }, [filters]);

  // ===== 事件处理 =====
  const handleEdit = useCallback(
    (record: User) => {
      setSelectedUser(record);
      editForm.setFieldsValue({
        email: record.email,
        phone: record.phone,
        status: record.status,
        roleIds: record.roles?.map((r) => r.id) || [],
      });
      setEditModalVisible(true);
    },
    [editForm]
  );

  const openRecharge = useCallback((record: User) => {
    setSelectedUser(record);
    setBalanceType('recharge');
    setBalanceModalVisible(true);
  }, []);

  const openDeduct = useCallback((record: User) => {
    setSelectedUser(record);
    setBalanceType('deduct');
    setBalanceModalVisible(true);
  }, []);

  const openResetPassword = useCallback((record: User) => {
    setSelectedUser(record);
    setResetPasswordModalVisible(true);
  }, []);

  const handleFilterChange = useCallback(
    (field: string, value: any) => {
      setFilters({ [field]: value, page: 1 }); // 筛选时重置到第一页
    },
    [setFilters]
  );

  const handleClearFilters = useCallback(() => {
    // 保留 page 和 pageSize,清除其他筛选条件
    setFilters({
      page: DEFAULT_PAGE,
      pageSize: filters.pageSize,
      username: '',
      email: '',
      phone: '',
      status: '',
      roleId: '',
      minBalance: undefined,
      maxBalance: undefined,
      startDate: '',
      endDate: '',
    });
    filterForm.resetFields();
  }, [setFilters, filters.pageSize, filterForm]);

  const handleExport = useCallback(async () => {
    message.info('导出功能开发中...');
  }, []);

  const handleImport = useCallback(async () => {
    message.info('导入功能开发中...');
  }, []);

  const toggleEmailVisibility = useCallback((userId: string) => {
    setVisibleEmails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    setSelectedUser(null);
    form.resetFields();
  }, [form]);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    setSelectedUser(null);
    editForm.resetFields();
  }, [editForm]);

  const closeBalanceModal = useCallback(() => {
    setBalanceModalVisible(false);
    setSelectedUser(null);
    setBalanceError(null);
    balanceForm.resetFields();
  }, [balanceForm]);

  const closeResetPasswordModal = useCallback(() => {
    setResetPasswordModalVisible(false);
    setSelectedUser(null);
    resetPasswordForm.resetFields();
  }, [resetPasswordForm]);

  return {
    // 分页 (从 filters 中获取)
    page: filters.page,
    pageSize: filters.pageSize,
    setPage: (page: number) => setFilters({ page }),
    setPageSize: (pageSize: number) => setFilters({ pageSize, page: 1 }), // 改变每页条数时重置到第一页
    params,

    // Modal 状态
    createModalVisible,
    setCreateModalVisible,
    editModalVisible,
    balanceModalVisible,
    resetPasswordModalVisible,

    // 业务状态
    balanceType,
    selectedUser,
    balanceError,
    setBalanceError,
    selectedRowKeys,
    setSelectedRowKeys,
    visibleEmails,

    // 筛选
    filterExpanded,
    setFilterExpanded,
    filters,
    hasFilters,

    // Form
    form,
    editForm,
    balanceForm,
    resetPasswordForm,
    filterForm,

    // 事件处理
    handleEdit,
    openRecharge,
    openDeduct,
    openResetPassword,
    handleFilterChange,
    handleClearFilters,
    handleExport,
    handleImport,
    toggleEmailVisibility,
    closeCreateModal,
    closeEditModal,
    closeBalanceModal,
    closeResetPasswordModal,
  };
};
