import React, { useState, useMemo } from 'react';
import { List, Badge, Space, Tag, Checkbox, Divider } from 'antd';
import { BellOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  type Notification,
} from '@/services/notification';

interface MessageListItemProps {
  notification: Notification;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: () => void;
}

/**
 * 消息列表项组件
 * 展示单条消息的详细信息，支持已读/未读状态和选择
 */
export const MessageListItem: React.FC<MessageListItemProps> = React.memo(({
  notification,
  selected,
  onSelect,
  onClick,
}) => {
  const [hover, setHover] = useState(false);
  const isUnread = notification.status === NotificationStatus.UNREAD;

  // 通知类型配置
  const notificationTypeConfig: Record<NotificationType, { label: string; color: string }> = useMemo(() => ({
    [NotificationType.SYSTEM]: { label: '系统通知', color: 'blue' },
    [NotificationType.TICKET_REPLY]: { label: '工单回复', color: 'green' },
    [NotificationType.TICKET_RESOLVED]: { label: '工单已解决', color: 'success' },
    [NotificationType.BALANCE_LOW]: { label: '余额不足', color: 'red' },
    [NotificationType.BALANCE_RECHARGED]: { label: '充值成功', color: 'green' },
    [NotificationType.ORDER_COMPLETED]: { label: '订单完成', color: 'success' },
    [NotificationType.ORDER_FAILED]: { label: '订单失败', color: 'error' },
    [NotificationType.DEVICE_READY]: { label: '设备就绪', color: 'cyan' },
    [NotificationType.DEVICE_ERROR]: { label: '设备异常', color: 'red' },
    [NotificationType.APP_INSTALLED]: { label: '应用安装完成', color: 'purple' },
    [NotificationType.PROMOTION]: { label: '促销活动', color: 'orange' },
    [NotificationType.MAINTENANCE]: { label: '维护通知', color: 'warning' },
    [NotificationType.SECURITY]: { label: '安全提醒', color: 'red' },
  }), []);

  // 优先级配置
  const priorityConfig: Record<NotificationPriority, { label: string; color: string }> = useMemo(() => ({
    [NotificationPriority.LOW]: { label: '低', color: 'default' },
    [NotificationPriority.NORMAL]: { label: '普通', color: 'blue' },
    [NotificationPriority.HIGH]: { label: '高', color: 'orange' },
    [NotificationPriority.URGENT]: { label: '紧急', color: 'red' },
  }), []);

  const typeConfig = notificationTypeConfig[notification.type];
  const backgroundColor = hover ? (isUnread ? '#e6f4ff' : '#f5f5f5') : (isUnread ? '#f0f7ff' : 'transparent');

  return (
    <List.Item
      style={{
        backgroundColor,
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      actions={[
        <Checkbox
          key="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(notification.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
        />,
      ]}
    >
      <List.Item.Meta
        avatar={
          <Badge dot={isUnread}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: `${typeConfig.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              <BellOutlined style={{ color: typeConfig.color }} />
            </div>
          </Badge>
        }
        title={
          <Space>
            {isUnread && <Badge status="processing" />}
            <span style={{ fontWeight: isUnread ? 600 : 400 }}>{notification.title}</span>
            <Tag color={typeConfig.color}>{typeConfig.label}</Tag>
            {notification.priority !== NotificationPriority.NORMAL && (
              <Tag color={priorityConfig[notification.priority].color}>
                {priorityConfig[notification.priority].label}
              </Tag>
            )}
          </Space>
        }
        description={
          <div>
            <div
              style={{
                color: '#666',
                marginBottom: 8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {notification.content}
            </div>
            <Space size="small" style={{ fontSize: 12, color: '#999' }}>
              <ClockCircleOutlined />
              <span>{dayjs(notification.createdAt).fromNow()}</span>
              {notification.readAt && (
                <>
                  <Divider type="vertical" />
                  <CheckCircleOutlined />
                  <span>已读于 {dayjs(notification.readAt).format('MM-DD HH:mm')}</span>
                </>
              )}
            </Space>
          </div>
        }
      />
    </List.Item>
  );
});

MessageListItem.displayName = 'MessageListItem';
