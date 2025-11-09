import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

/**
 * 通知类型
 */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

/**
 * 通知类型配置
 */
const notificationTypeConfigs: Record<string, { icon: string; color: string; label: string }> = {
  system: { icon: '🔔', color: 'blue', label: '系统通知' },
  device: { icon: '📱', color: 'green', label: '设备通知' },
  billing: { icon: '💰', color: 'orange', label: '账单通知' },
  security: { icon: '🔒', color: 'red', label: '安全通知' },
  app: { icon: '📦', color: 'purple', label: '应用通知' },
};

/**
 * 通知中心业务逻辑 Hook
 *
 * 完整功能：
 * 1. ✅ 分页查询（支持 page/pageSize）
 * 2. ✅ 按状态筛选（全部/未读/已读）
 * 3. ✅ 标记已读/全部标记已读
 * 4. ✅ 删除通知
 * 5. ✅ 创建通知（管理员功能）
 * 6. ✅ 模态框管理
 */
export const useNotificationCenter = () => {
  // ===== 分页和筛选状态 =====
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'read'>('all');

  // ===== 模态框状态 =====
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  const queryClient = useQueryClient();

  // ===== 计算查询参数 =====
  const queryParams = useMemo(() => {
    const params: any = { page, pageSize };

    // 根据选中的标签筛选
    if (selectedTab === 'unread') {
      params.unreadOnly = true;
    } else if (selectedTab === 'read') {
      params.readOnly = true;
    }

    return params;
  }, [page, pageSize, selectedTab]);

  // ===== 查询通知列表 =====
  const { data: notificationsResponse, isLoading } = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: async () => {
      // ✅ 从 localStorage 获取当前用户 ID
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('未找到用户信息，请重新登录');
      }

      // ✅ 调用正确的后端端点: /notifications/user/:userId
      const response = await request.get(`/notifications/user/${userId}`, { params: queryParams });
      return response;
    },
    staleTime: 10 * 1000, // 10 秒
  });

  // 解构响应数据
  const notifications = notificationsResponse?.data || [];
  const total = notificationsResponse?.total || 0;

  // ===== Mutations =====

  /**
   * 标记通知为已读
   */
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      message.success('已标记为已读');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      message.error('标记失败');
    },
  });

  /**
   * 全部标记为已读
   */
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      // ✅ 从 localStorage 获取当前用户 ID
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('未找到用户信息，请重新登录');
      }

      // ✅ 发送 userId 到后端
      return await request.post('/notifications/read-all', { userId });
    },
    onSuccess: () => {
      message.success('已全部标记为已读');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      message.error('操作失败');
    },
  });

  /**
   * 删除通知
   */
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      message.success('通知已删除');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  /**
   * 创建通知（管理员）
   */
  const createNotificationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await request.post('/notifications', data);
    },
    onSuccess: () => {
      message.success('通知已发送');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setCreateModalVisible(false);
      form.resetFields();
    },
    onError: () => {
      message.error('发送失败');
    },
  });

  // ===== 事件处理函数 =====

  /**
   * 标记已读
   */
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation]
  );

  /**
   * 全部标记为已读
   */
  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync();
  }, [markAllAsReadMutation]);

  /**
   * 删除通知
   */
  const handleDelete = useCallback(
    async (id: string) => {
      await deleteNotificationMutation.mutateAsync(id);
    },
    [deleteNotificationMutation]
  );

  /**
   * 创建通知
   */
  const handleCreate = useCallback(
    async (values: any) => {
      await createNotificationMutation.mutateAsync(values);
    },
    [createNotificationMutation]
  );

  /**
   * 打开创建模态框
   */
  const handleOpenCreateModal = useCallback(() => {
    setCreateModalVisible(true);
    form.resetFields();
  }, [form]);

  /**
   * 关闭创建模态框
   */
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  /**
   * 获取通知类型配置
   */
  const getTypeConfig = useCallback((type: string) => {
    return notificationTypeConfigs[type] || { icon: '📬', color: 'default', label: '通知' };
  }, []);

  /**
   * 切换标签时重置到第一页
   */
  const handleTabChange = useCallback((tab: 'all' | 'unread' | 'read') => {
    setSelectedTab(tab);
    setPage(1);
  }, []);

  return {
    // 数据
    notifications,
    loading: isLoading,
    total,

    // 分页
    page,
    pageSize,
    setPage,

    // 标签
    selectedTab,
    setSelectedTab: handleTabChange,

    // 模态框
    createModalVisible,
    form,

    // 操作方法
    handleCreate,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
    handleOpenCreateModal,
    handleCloseCreateModal,
    getTypeConfig,
  };
};
