import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type Notification,
  type CreateNotificationDto,
} from '@/services/notification';

export const useNotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [form] = Form.useForm();

  /**
   * 加载通知列表
   */
  const loadNotifications = useCallback(
    async (isRead?: boolean) => {
      setLoading(true);
      try {
        const params: any = { page, pageSize };
        if (isRead !== undefined) params.isRead = isRead;
        const res = await getNotifications(params);
        setNotifications(res.data);
        setTotal(res.total);
      } catch (error) {
        message.error('加载通知失败');
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  /**
   * 根据选中的Tab加载数据
   */
  useEffect(() => {
    if (selectedTab === 'all') {
      loadNotifications();
    } else if (selectedTab === 'unread') {
      loadNotifications(false);
    } else {
      loadNotifications(true);
    }
  }, [page, selectedTab, loadNotifications]);

  /**
   * 创建通知
   */
  const handleCreate = useCallback(
    async (values: CreateNotificationDto) => {
      try {
        await createNotification(values);
        message.success('发送通知成功');
        setCreateModalVisible(false);
        form.resetFields();
        loadNotifications();
      } catch (error) {
        message.error('发送通知失败');
      }
    },
    [form, loadNotifications]
  );

  /**
   * 标记单个为已读
   */
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await markAsRead(id);
        message.success('已标记为已读');
        loadNotifications();
      } catch (error) {
        message.error('操作失败');
      }
    },
    [loadNotifications]
  );

  /**
   * 全部标记为已读
   */
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      message.success('全部标记为已读');
      loadNotifications();
    } catch (error) {
      message.error('操作失败');
    }
  }, [loadNotifications]);

  /**
   * 删除通知
   */
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteNotification(id);
        message.success('删除成功');
        loadNotifications();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadNotifications]
  );

  /**
   * 获取通知类型配置
   */
  const getTypeConfig = useCallback((type: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      info: { color: 'blue', text: '信息' },
      warning: { color: 'orange', text: '警告' },
      error: { color: 'red', text: '错误' },
      success: { color: 'green', text: '成功' },
      announcement: { color: 'purple', text: '公告' },
    };
    return configs[type] || configs.info;
  }, []);

  /**
   * 打开创建模态框
   */
  const handleOpenCreateModal = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  /**
   * 关闭创建模态框
   */
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  return {
    // 数据状态
    notifications,
    loading,
    total,
    page,
    pageSize,
    selectedTab,
    // 模态框状态
    createModalVisible,
    form,
    // 状态更新函数
    setPage,
    setSelectedTab,
    // 操作函数
    handleCreate,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
    handleOpenCreateModal,
    handleCloseCreateModal,
    // 工具函数
    getTypeConfig,
  };
};
