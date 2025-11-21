import React, { useState, useCallback, useMemo } from 'react';
import { Card, List, Empty, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
  MessageStatsCards,
  MessageFilterBar,
  MessageListItem,
} from '@/components/Message';
import { MessageDetailModal } from '@/components/MessageDetailModal';
import {
  useNotifications,
  useNotificationStats,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotifications,
  useClearReadNotifications,
} from '@/hooks/queries';
import type { NotificationListQuery, Notification } from '@/services/notification';

/**
 * 消息列表页面
 *
 * 功能：
 * 1. 消息列表展示（支持分页）
 * 2. 消息统计（总数、未读数等）
 * 3. 筛选（按状态、类型、优先级）
 * 4. 批量操作（标记已读、删除、清空已读）
 * 5. 查看消息详情
 */
const MessageList: React.FC = () => {
  const navigate = useNavigate();

  // 本地状态
  const [query, setQuery] = useState<NotificationListQuery>({
    page: 1,
    pageSize: 10,
  });
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // React Query hooks
  const { data: notificationsData, isLoading: loading, refetch: refetchNotifications } = useNotifications(query);
  const { data: stats, refetch: refetchStats } = useNotificationStats();

  const markAsRead = useMarkAsRead();
  const markAllNotificationsRead = useMarkAllAsRead();
  const deleteNotifications = useDeleteNotifications();
  const clearReadNotifications = useClearReadNotifications();

  // NotificationListResponse: { items, total, unreadCount, page, pageSize }
  const notifications: Notification[] = notificationsData?.items || [];
  const total = notificationsData?.total ?? 0;

  // 全选状态计算
  const selectAllChecked = useMemo(() => {
    return notifications.length > 0 && selectedNotifications.length === notifications.length;
  }, [notifications.length, selectedNotifications.length]);

  const selectAllIndeterminate = useMemo(() => {
    return selectedNotifications.length > 0 && selectedNotifications.length < notifications.length;
  }, [notifications.length, selectedNotifications.length]);

  // 操作处理
  const handleRefresh = useCallback(() => {
    setSelectedNotifications([]);
    refetchNotifications();
    refetchStats();
  }, [refetchNotifications, refetchStats]);

  const handleSearch = useCallback((_value: string) => {
    setQuery((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((key: keyof NotificationListQuery, value: NotificationListQuery[keyof NotificationListQuery]) => {
    setQuery((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setQuery((prev) => ({ ...prev, page, pageSize }));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectAllChecked) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map((n) => n.id));
    }
  }, [selectAllChecked, notifications]);

  const handleSelectNotification = useCallback((id: string, checked: boolean) => {
    setSelectedNotifications((prev) =>
      checked ? [...prev, id] : prev.filter((nid) => nid !== id)
    );
  }, []);

  const handleBatchMarkRead = useCallback(async () => {
    if (selectedNotifications.length === 0) return;
    await markAsRead.mutateAsync(selectedNotifications);
    setSelectedNotifications([]);
  }, [selectedNotifications, markAsRead]);

  const handleMarkAllRead = useCallback(async () => {
    Modal.confirm({
      title: '确认标记全部已读',
      icon: <ExclamationCircleOutlined />,
      content: '确定要将所有消息标记为已读吗？',
      onOk: async () => {
        await markAllNotificationsRead.mutateAsync();
      },
    });
  }, [markAllNotificationsRead]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedNotifications.length === 0) return;
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedNotifications.length} 条消息吗？`,
      onOk: async () => {
        await deleteNotifications.mutateAsync(selectedNotifications);
        setSelectedNotifications([]);
      },
    });
  }, [selectedNotifications, deleteNotifications]);

  const handleClearRead = useCallback(async () => {
    Modal.confirm({
      title: '确认清空已读',
      icon: <ExclamationCircleOutlined />,
      content: '确定要清空所有已读消息吗？此操作不可恢复。',
      onOk: async () => {
        await clearReadNotifications.mutateAsync();
      },
    });
  }, [clearReadNotifications]);

  const handleViewDetail = useCallback((notification: Notification) => {
    setSelectedNotification(notification);
    setDetailModalVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedNotification(null);
  }, []);

  // 组件内部已调用 markAsRead，这里只需要提供刷新回调
  const handleNotificationRead = useCallback(() => {
    // 刷新数据由 React Query 自动处理
  }, []);

  return (
    <div>
      {/* 统计卡片 */}
      <MessageStatsCards stats={stats ?? null} />

      {/* 筛选工具栏 */}
      <MessageFilterBar
        selectedCount={selectedNotifications.length}
        selectAllChecked={selectAllChecked}
        selectAllIndeterminate={selectAllIndeterminate}
        onSearch={handleSearch}
        onStatusChange={(status) => handleFilterChange('status', status)}
        onTypeChange={(type) => handleFilterChange('type', type)}
        onPriorityChange={(priority) => handleFilterChange('priority', priority)}
        onSettingsClick={() => navigate('/messages/settings')}
        onSelectAll={handleSelectAll}
        onBatchMarkRead={handleBatchMarkRead}
        onBatchDelete={handleBatchDelete}
        onMarkAllRead={handleMarkAllRead}
        onClearRead={handleClearRead}
        onRefresh={handleRefresh}
      />

      {/* 消息列表 */}
      <Card>
        <List
          loading={loading}
          dataSource={notifications}
          locale={{ emptyText: <Empty description="暂无消息" /> }}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条消息`,
            onChange: handlePageChange,
          }}
          renderItem={(notification) => (
            <MessageListItem
              key={notification.id}
              notification={notification}
              selected={selectedNotifications.includes(notification.id)}
              onSelect={handleSelectNotification}
              onClick={() => handleViewDetail(notification)}
            />
          )}
        />
      </Card>

      {/* 消息详情 Modal */}
      <MessageDetailModal
        visible={detailModalVisible}
        notification={selectedNotification}
        onClose={handleCloseDetail}
        onRead={handleNotificationRead}
      />
    </div>
  );
};

export default MessageList;
