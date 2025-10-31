import React, { useEffect } from 'react';
import { Modal, Tag, Button, Space, Typography, Divider } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  markAsRead,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  type Notification,
} from '@/services/notification';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Paragraph } = Typography;

interface MessageDetailModalProps {
  visible: boolean;
  notification: Notification | null;
  onClose: () => void;
  onRead?: () => void;
}

// 通知类型配置
const notificationTypeConfig: Record<
  NotificationType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  [NotificationType.SYSTEM]: {
    label: '系统通知',
    color: 'blue',
    icon: <ExclamationCircleOutlined />,
  },
  [NotificationType.TICKET_REPLY]: {
    label: '工单回复',
    color: 'green',
    icon: <CheckCircleOutlined />,
  },
  [NotificationType.TICKET_RESOLVED]: {
    label: '工单已解决',
    color: 'success',
    icon: <CheckCircleOutlined />,
  },
  [NotificationType.BALANCE_LOW]: {
    label: '余额不足',
    color: 'red',
    icon: <ExclamationCircleOutlined />,
  },
  [NotificationType.BALANCE_RECHARGED]: {
    label: '充值成功',
    color: 'green',
    icon: <CheckCircleOutlined />,
  },
  [NotificationType.ORDER_COMPLETED]: {
    label: '订单完成',
    color: 'success',
    icon: <CheckCircleOutlined />,
  },
  [NotificationType.ORDER_FAILED]: {
    label: '订单失败',
    color: 'error',
    icon: <ExclamationCircleOutlined />,
  },
  [NotificationType.DEVICE_READY]: {
    label: '设备就绪',
    color: 'cyan',
    icon: <CheckCircleOutlined />,
  },
  [NotificationType.DEVICE_ERROR]: {
    label: '设备异常',
    color: 'red',
    icon: <ExclamationCircleOutlined />,
  },
  [NotificationType.APP_INSTALLED]: {
    label: '应用安装完成',
    color: 'purple',
    icon: <CheckCircleOutlined />,
  },
  [NotificationType.PROMOTION]: {
    label: '促销活动',
    color: 'orange',
    icon: <ExclamationCircleOutlined />,
  },
  [NotificationType.MAINTENANCE]: {
    label: '维护通知',
    color: 'warning',
    icon: <ExclamationCircleOutlined />,
  },
  [NotificationType.SECURITY]: {
    label: '安全提醒',
    color: 'red',
    icon: <ExclamationCircleOutlined />,
  },
};

// 优先级配置
const priorityConfig: Record<NotificationPriority, { label: string; color: string }> = {
  [NotificationPriority.LOW]: { label: '低', color: 'default' },
  [NotificationPriority.NORMAL]: { label: '普通', color: 'blue' },
  [NotificationPriority.HIGH]: { label: '高', color: 'orange' },
  [NotificationPriority.URGENT]: { label: '紧急', color: 'red' },
};

export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  visible,
  notification,
  onClose,
  onRead,
}) => {
  const navigate = useNavigate();

  // 当打开 Modal 且消息未读时，标记为已读
  useEffect(() => {
    if (visible && notification && notification.status === NotificationStatus.UNREAD) {
      markAsRead([notification.id])
        .then(() => {
          onRead?.();
        })
        .catch((error) => {
          console.error('标记已读失败:', error);
        });
    }
  }, [visible, notification]);

  if (!notification) {
    return null;
  }

  const typeConfig = notificationTypeConfig[notification.type];

  // 处理操作按钮点击
  const handleAction = () => {
    if (notification.actionUrl) {
      // 如果是内部链接，使用路由跳转
      if (notification.actionUrl.startsWith('/')) {
        navigate(notification.actionUrl);
        onClose();
      } else {
        // 外部链接，新窗口打开
        window.open(notification.actionUrl, '_blank');
      }
    }
  };

  return (
    <Modal
      title={
        <Space>
          {typeConfig.icon}
          <span>{notification.title}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        notification.actionUrl && notification.actionText && (
          <Button key="action" type="primary" icon={<LinkOutlined />} onClick={handleAction}>
            {notification.actionText}
          </Button>
        ),
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={600}
    >
      {/* 元信息 */}
      <Space wrap style={{ marginBottom: '16px' }}>
        <Tag color={typeConfig.color} icon={typeConfig.icon}>
          {typeConfig.label}
        </Tag>

        {notification.priority !== NotificationPriority.NORMAL && (
          <Tag color={priorityConfig[notification.priority].color}>
            {priorityConfig[notification.priority].label}优先级
          </Tag>
        )}

        <Tag
          icon={<ClockCircleOutlined />}
          color={notification.status === NotificationStatus.UNREAD ? 'blue' : 'default'}
        >
          {notification.status === NotificationStatus.UNREAD ? '未读' : '已读'}
        </Tag>
      </Space>

      <Divider style={{ margin: '16px 0' }} />

      {/* 通知内容 */}
      <Paragraph
        style={{
          fontSize: '14px',
          lineHeight: '1.8',
          whiteSpace: 'pre-wrap',
          marginBottom: '24px',
        }}
      >
        {notification.content}
      </Paragraph>

      {/* 额外信息 */}
      {notification.metadata && Object.keys(notification.metadata).length > 0 && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div
            style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
            }}
          >
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <strong>相关信息：</strong>
            </Text>
            {Object.entries(notification.metadata).map(([key, value]) => (
              <div key={key} style={{ marginTop: '4px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {key}: {String(value)}
                </Text>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 时间信息 */}
      <Divider style={{ margin: '16px 0' }} />
      <Space direction="vertical" size={4}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <ClockCircleOutlined /> 发送时间:{' '}
          {dayjs(notification.createdAt).format('YYYY-MM-DD HH:mm:ss')} (
          {dayjs(notification.createdAt).fromNow()})
        </Text>

        {notification.readAt && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <CheckCircleOutlined /> 阅读时间:{' '}
            {dayjs(notification.readAt).format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        )}

        {notification.expiresAt && (
          <Text type="warning" style={{ fontSize: '12px' }}>
            <ExclamationCircleOutlined /> 过期时间:{' '}
            {dayjs(notification.expiresAt).format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        )}
      </Space>
    </Modal>
  );
};

export default MessageDetailModal;
