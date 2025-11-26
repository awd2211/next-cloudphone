/**
 * 通知中心组件
 *
 * 功能:
 * 1. 铃铛图标显示未读数量
 * 2. 下拉面板显示通知列表
 * 3. 通知分类筛选
 * 4. 标记已读/全部已读
 * 5. 通知设置面板
 */

import { useState, useMemo } from 'react';
import {
  Badge,
  Popover,
  Tabs,
  List,
  Button,
  Empty,
  Typography,
  Space,
  Tag,
  Tooltip,
  Switch,
  Divider,
  Avatar,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  SettingOutlined,
  MobileOutlined,
  MessageOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  SoundOutlined,
  DesktopOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { useNotifications } from '@/contexts/SocketContext';
import type { Notification, NotificationType, NotificationLevel } from '@/types/notification';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;

// 通知类型图标映射
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

// 通知级别颜色映射
const levelColorMap: Record<NotificationLevel, string> = {
  info: '#1677ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
};

// 通知级别图标映射
const levelIconMap: Record<NotificationLevel, React.ReactNode> = {
  info: <InfoCircleOutlined />,
  success: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  error: <CloseCircleOutlined />,
};

// 通知类型标签
const typeLabels: Record<NotificationType, string> = {
  device_status: '设备',
  device_error: '设备',
  sms_received: '短信',
  proxy_expired: '代理',
  proxy_quality: '代理',
  system: '系统',
  security: '安全',
  task_complete: '任务',
};

// 单条通知项
const NotificationItem = ({
  notification,
  onRead,
  onRemove,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const timeAgo = dayjs(notification.timestamp).fromNow();

  return (
    <List.Item
      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
      style={{
        padding: '12px 16px',
        background: notification.read ? 'transparent' : 'rgba(22, 119, 255, 0.04)',
        borderLeft: notification.read
          ? 'none'
          : `3px solid ${levelColorMap[notification.level]}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <List.Item.Meta
        avatar={
          <Avatar
            size={36}
            style={{
              backgroundColor: `${levelColorMap[notification.level]}15`,
              color: levelColorMap[notification.level],
            }}
            icon={typeIconMap[notification.type]}
          />
        }
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size={4}>
              <Text strong={!notification.read} style={{ fontSize: 13 }}>
                {notification.title}
              </Text>
              <Tag
                color={levelColorMap[notification.level]}
                style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}
              >
                {typeLabels[notification.type]}
              </Tag>
            </Space>
            <Space size={4}>
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined style={{ fontSize: 10 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(notification.id);
                  }}
                  style={{ width: 20, height: 20, minWidth: 20 }}
                />
              </Tooltip>
            </Space>
          </Space>
        }
        description={
          <div>
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                display: 'block',
                marginBottom: 4,
                color: notification.read ? '#8c8c8c' : '#595959',
              }}
            >
              {notification.message}
            </Text>
            <Space size={8}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {timeAgo}
              </Text>
              {!notification.read && (
                <Tag color="processing" style={{ fontSize: 10, margin: 0 }}>
                  未读
                </Tag>
              )}
            </Space>
          </div>
        }
      />
    </List.Item>
  );
};

// 通知设置面板
const NotificationSettings = () => {
  const { settings, updateSettings } = useNotifications();

  return (
    <div style={{ padding: '12px 16px' }}>
      <Title level={5} style={{ marginBottom: 16 }}>
        <SettingOutlined style={{ marginRight: 8 }} />
        通知设置
      </Title>

      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <BellOutlined />
            <Text>启用通知</Text>
          </Space>
          <Switch
            checked={settings.enabled}
            onChange={(checked) => updateSettings({ enabled: checked })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <SoundOutlined />
            <Text>声音提醒</Text>
          </Space>
          <Switch
            checked={settings.sound}
            onChange={(checked) => updateSettings({ sound: checked })}
            disabled={!settings.enabled}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <DesktopOutlined />
            <Text>桌面通知</Text>
          </Space>
          <Switch
            checked={settings.desktop}
            onChange={(checked) => updateSettings({ desktop: checked })}
            disabled={!settings.enabled}
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <Text type="secondary" style={{ fontSize: 12 }}>
          通知类型
        </Text>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <MobileOutlined />
            <Text>设备状态</Text>
          </Space>
          <Switch
            size="small"
            checked={settings.deviceStatus}
            onChange={(checked) => updateSettings({ deviceStatus: checked })}
            disabled={!settings.enabled}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <MessageOutlined />
            <Text>短信接收</Text>
          </Space>
          <Switch
            size="small"
            checked={settings.smsReceived}
            onChange={(checked) => updateSettings({ smsReceived: checked })}
            disabled={!settings.enabled}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <GlobalOutlined />
            <Text>代理警告</Text>
          </Space>
          <Switch
            size="small"
            checked={settings.proxyWarning}
            onChange={(checked) => updateSettings({ proxyWarning: checked })}
            disabled={!settings.enabled}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <InfoCircleOutlined />
            <Text>系统公告</Text>
          </Space>
          <Switch
            size="small"
            checked={settings.systemAnnouncement}
            onChange={(checked) => updateSettings({ systemAnnouncement: checked })}
            disabled={!settings.enabled}
          />
        </div>
      </Space>
    </div>
  );
};

// 通知面板内容
const NotificationPanel = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);

  // 按类型分组过滤
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter((n) => !n.read);
    if (activeTab === 'device')
      return notifications.filter((n) =>
        ['device_status', 'device_error'].includes(n.type)
      );
    if (activeTab === 'sms') return notifications.filter((n) => n.type === 'sms_received');
    if (activeTab === 'system')
      return notifications.filter((n) =>
        ['system', 'security', 'task_complete'].includes(n.type)
      );
    return notifications;
  }, [notifications, activeTab]);

  if (showSettings) {
    return (
      <div style={{ width: 360 }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Button
            type="text"
            size="small"
            onClick={() => setShowSettings(false)}
            style={{ marginRight: 8 }}
          >
            ← 返回
          </Button>
        </div>
        <NotificationSettings />
      </div>
    );
  }

  return (
    <div style={{ width: 400 }}>
      {/* 头部 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            通知中心
          </Title>
          {unreadCount > 0 && (
            <Tag color="processing">{unreadCount} 条未读</Tag>
          )}
        </Space>
        <Space>
          <Tooltip title="全部已读">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            />
          </Tooltip>
          <Tooltip title="清空通知">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={clearNotifications}
              disabled={notifications.length === 0}
            />
          </Tooltip>
          <Tooltip title="通知设置">
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setShowSettings(true)}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 分类标签 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        centered
        size="small"
        style={{ padding: '0 8px' }}
        items={[
          { key: 'all', label: '全部' },
          {
            key: 'unread',
            label: (
              <Badge count={unreadCount} size="small" offset={[8, 0]}>
                未读
              </Badge>
            ),
          },
          { key: 'device', label: '设备' },
          { key: 'sms', label: '短信' },
          { key: 'system', label: '系统' },
        ]}
      />

      {/* 通知列表 */}
      <div
        style={{
          maxHeight: 420,
          overflow: 'auto',
        }}
      >
        {filteredNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              activeTab === 'unread' ? '暂无未读消息' : '暂无通知'
            }
            style={{ padding: '40px 0' }}
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onRemove={removeNotification}
              />
            )}
            split={false}
          />
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'center',
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {notifications.length} 条通知
          </Text>
        </div>
      )}
    </div>
  );
};

// 主组件
export const NotificationCenter = () => {
  const { unreadCount, isConnected } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      content={<NotificationPanel />}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      arrow={false}
      overlayStyle={{ padding: 0 }}
      overlayInnerStyle={{ padding: 0, borderRadius: 8, overflow: 'hidden' }}
    >
      <Tooltip title={isConnected ? '通知中心' : '连接中...'}>
        <Badge
          count={unreadCount}
          size="small"
          offset={[-2, 2]}
          style={{ boxShadow: '0 0 0 1px #fff' }}
        >
          <Button
            type="text"
            icon={
              <BellOutlined
                style={{
                  fontSize: 18,
                  color: isConnected ? undefined : '#d9d9d9',
                }}
              />
            }
            className={unreadCount > 0 ? 'notification-bell-active' : ''}
          />
        </Badge>
      </Tooltip>
    </Popover>
  );
};

export default NotificationCenter;
