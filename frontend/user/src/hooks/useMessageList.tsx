import { useState, useEffect, useCallback, useMemo } from 'react';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
  getNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  clearReadNotifications,
  type Notification,
  type NotificationListQuery,
  type NotificationStats,
} from '@/services/notification';

/**
 * 消息列表业务逻辑 Hook
 * 封装消息加载、筛选、批量操作等功能
 * @param userId - 当前用户ID (必需)
 */
export function useMessageList(userId: string) {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<NotificationListQuery>({
    page: 1,
    pageSize: 10,
  });

  // 加载消息列表
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await getNotifications(userId, query);
      setNotifications(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载消息列表失败');
    } finally {
      setLoading(false);
    }
  }, [userId, query]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getNotificationStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  // 页面加载时获取数据
  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [loadNotifications, loadStats]);

  // 刷新
  const handleRefresh = useCallback(() => {
    setSelectedNotifications([]);
    loadNotifications();
    loadStats();
  }, [loadNotifications, loadStats]);

  // 搜索
  const handleSearch = useCallback((_value: string) => {
    setQuery((prev) => ({ ...prev, page: 1 }));
    // Note: 这里需要后端支持搜索参数
    loadNotifications();
  }, [loadNotifications]);

  // 筛选变化
  const handleFilterChange = useCallback((key: keyof NotificationListQuery, value: any) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      [key]: value || undefined,
    }));
  }, []);

  // 分页变化
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setQuery((prev) => ({ ...prev, page, pageSize: pageSize || prev.pageSize }));
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedNotifications(notifications.map((n) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  }, [notifications]);

  // 选择单个通知
  const handleSelectNotification = useCallback((id: string, checked: boolean) => {
    setSelectedNotifications((prev) =>
      checked ? [...prev, id] : prev.filter((nid) => nid !== id)
    );
  }, []);

  // 批量标记已读
  const handleBatchMarkRead = useCallback(async () => {
    if (selectedNotifications.length === 0) {
      message.warning('请先选择消息');
      return;
    }

    try {
      await markAsRead(selectedNotifications);
      message.success('已标记为已读');
      setSelectedNotifications([]);
      handleRefresh();
    } catch (error) {
      message.error('标记已读失败');
    }
  }, [selectedNotifications, handleRefresh]);

  // 全部标记已读
  const handleMarkAllRead = useCallback(() => {
    if (!userId) return;
    Modal.confirm({
      title: '确认标记全部消息为已读？',
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          await markAllAsRead(userId);
          message.success('已全部标记为已读');
          handleRefresh();
        } catch (error) {
          message.error('操作失败');
        }
      },
    });
  }, [userId, handleRefresh]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedNotifications.length === 0) {
      message.warning('请先选择消息');
      return;
    }

    Modal.confirm({
      title: `确认删除选中的 ${selectedNotifications.length} 条消息？`,
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          await deleteNotifications(selectedNotifications);
          message.success('删除成功');
          setSelectedNotifications([]);
          handleRefresh();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  }, [selectedNotifications, handleRefresh]);

  // 清空已读消息
  const handleClearRead = useCallback(() => {
    Modal.confirm({
      title: '确认清空所有已读消息？',
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可恢复',
      onOk: async () => {
        try {
          await clearReadNotifications();
          message.success('已清空已读消息');
          handleRefresh();
        } catch (error) {
          message.error('操作失败');
        }
      },
    });
  }, [handleRefresh]);

  // 查看详情
  const handleViewDetail = useCallback((notification: Notification) => {
    setSelectedNotification(notification);
    setDetailModalVisible(true);
  }, []);

  // 关闭详情 Modal
  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedNotification(null);
  }, []);

  // 详情 Modal 标记已读后刷新
  const handleNotificationRead = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // 全选状态
  const selectAllChecked = useMemo(
    () => selectedNotifications.length > 0 && selectedNotifications.length === notifications.length,
    [selectedNotifications, notifications]
  );

  const selectAllIndeterminate = useMemo(
    () => selectedNotifications.length > 0 && selectedNotifications.length < notifications.length,
    [selectedNotifications, notifications]
  );

  return {
    // 数据
    loading,
    notifications,
    stats,
    total,
    query,
    selectedNotifications,
    selectedNotification,
    detailModalVisible,
    selectAllChecked,
    selectAllIndeterminate,

    // 操作方法
    handleRefresh,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    handleSelectAll,
    handleSelectNotification,
    handleBatchMarkRead,
    handleMarkAllRead,
    handleBatchDelete,
    handleClearRead,
    handleViewDetail,
    handleCloseDetail,
    handleNotificationRead,
  };
}
