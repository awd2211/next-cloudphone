/**
 * 实时通知 Toast 组件
 *
 * 当新通知到来时:
 * 1. 在屏幕右下角显示 Toast 提示
 * 2. 支持多条通知堆叠显示
 * 3. 自动消失 (5秒后)
 * 4. 点击可跳转或标记已读
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { notification, Avatar, Space, Typography } from 'antd';
import {
  MobileOutlined,
  MessageOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useNotifications } from '@/contexts/SocketContext';
import type { Notification, NotificationType, NotificationLevel } from '@/types/notification';

const { Text } = Typography;

// 类型图标映射
const typeIconMap: Record<NotificationType, React.ReactNode> = {
  device_status: <MobileOutlined />,
  device_error: <MobileOutlined />,
  sms_received: <MessageOutlined />,
  proxy_expired: <GlobalOutlined />,
  proxy_quality: <GlobalOutlined />,
  system: <InfoCircleOutlined />,
  security: <SafetyCertificateOutlined />,
  task_complete: <ThunderboltOutlined />,
};

// 级别颜色映射
const levelColorMap: Record<NotificationLevel, string> = {
  info: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
};

// 级别图标映射
const levelIconMap: Record<NotificationLevel, React.ReactNode> = {
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  error: <CloseCircleOutlined />,
};

export const NotificationToast = () => {
  const { subscribe, markAsRead, settings } = useNotifications();
  const [api, contextHolder] = notification.useNotification();
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  // 显示通知 Toast
  const showToast = useCallback(
    (notif: Notification) => {
      // 检查是否已显示过
      if (shownNotificationsRef.current.has(notif.id)) {
        return;
      }
      shownNotificationsRef.current.add(notif.id);

      // 如果通知已禁用，不显示
      if (!settings.enabled) {
        return;
      }

      const levelType = notif.level === 'error' ? 'error' :
                       notif.level === 'warning' ? 'warning' :
                       notif.level === 'success' ? 'success' : 'info';

      api[levelType]({
        key: notif.id,
        message: (
          <Space size={8}>
            <Avatar
              size={24}
              style={{
                backgroundColor: `${levelColorMap[notif.level]}15`,
                color: levelColorMap[notif.level],
              }}
              icon={typeIconMap[notif.type]}
            />
            <Text strong style={{ fontSize: 14 }}>
              {notif.title}
            </Text>
          </Space>
        ),
        description: (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {notif.message}
          </Text>
        ),
        placement: 'bottomRight',
        duration: 5,
        style: {
          borderLeft: `4px solid ${levelColorMap[notif.level]}`,
          borderRadius: 8,
        },
        onClick: () => {
          markAsRead(notif.id);
          api.destroy(notif.id);
        },
      });
    },
    [api, markAsRead, settings.enabled]
  );

  // 订阅新通知
  useEffect(() => {
    const unsubscribe = subscribe('notification', (notif: unknown) => {
      showToast(notif as Notification);
    });

    return unsubscribe;
  }, [subscribe, showToast]);

  // 清理已显示的通知记录 (防止内存泄漏)
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (shownNotificationsRef.current.size > 100) {
        shownNotificationsRef.current.clear();
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(cleanup);
  }, []);

  return contextHolder;
};

export default NotificationToast;
