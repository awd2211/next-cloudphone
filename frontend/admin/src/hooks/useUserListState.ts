import { useState, useMemo, useCallback } from 'react';
import { Form, message } from 'antd';
import type { User } from '@/types';
import type { EnhancedError } from '@/components/EnhancedErrorAlert';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/components/User';

/**
 * 用户列表页面状态管理 Hook
 *
 * 功能:
 * 1. 统一管理所有 Modal 状态
 * 2. 统一管理所有 Form 实例
 * 3. 提供筛选、分页、选择等状态
 * 4. 封装常用的事件处理逻辑
 */
export const useUserListState = () => {
  // ===== 分页状态 =====
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // ===== Modal 状态 =====
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);

  // ===== 业务状态 =====
  const [balanceType, setBalanceType] = useState<'recharge' | 'deduct'>('recharge');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceError, setBalanceError] = useState<EnhancedError | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [visibleEmails, setVisibleEmails] = useState<Set<string>>(new Set());

  // ===== 筛选状态 =====
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [filters, setFilters] = useState<any>({});

  // ===== Form 实例 =====
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  // ===== 计算属性 =====
  const params = useMemo(() => {
    const queryParams: any = { page, pageSize };
    if (filters.username) queryParams.username = filters.username;
    if (filters.email) queryParams.email = filters.email;
    if (filters.phone) queryParams.phone = filters.phone;
    if (filters.status) queryParams.status = filters.status;
    if (filters.roleId) queryParams.roleId = filters.roleId;
    if (filters.minBalance !== undefined) queryParams.minBalance = filters.minBalance;
    if (filters.maxBalance !== undefined) queryParams.maxBalance = filters.maxBalance;
    if (filters.startDate) queryParams.startDate = filters.startDate;
    if (filters.endDate) queryParams.endDate = filters.endDate;
    return queryParams;
  }, [page, pageSize, filters]);

  const hasFilters = useMemo(() => {
    return Object.keys(filters).some((key) => filters[key] !== undefined && filters[key] !== '');
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

  const handleFilterChange = useCallback((field: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    filterForm.resetFields();
    setPage(1);
  }, [filterForm]);

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
    // 分页
    page,
    pageSize,
    setPage,
    setPageSize,
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
