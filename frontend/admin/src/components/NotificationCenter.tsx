import React, { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Button, Empty, Spin } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { getNotifications, getUnreadCount, markAsRead, notificationWS, type Notification } from '@/services/notification';
import { useNavigate } from 'react-router-dom';

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // 获取当前用户 ID（从认证状态中获取）
  const userId = localStorage.getItem('userId') || 'test-user-id';

  // 加载通知列表
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications({ page: 1, limit: 10 });
      setNotifications(response.data);
      const countResponse = await getUnreadCount();
      setUnreadCount(countResponse.count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // 标记通知为已读
  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // 点击通知
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setDropdownOpen(false);
    }
  };

  // 初始化 WebSocket 和加载通知
  useEffect(() => {
    loadNotifications();

    // 连接 WebSocket
    notificationWS.connect(userId);

    // 监听新通知
    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
      setUnreadCount(prev => prev + 1);

      // 可以在这里显示浏览器通知
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.content,
          icon: '/logo.png',
        });
      }
    };

    notificationWS.on('notification', handleNewNotification);

    // 请求浏览器通知权限
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      notificationWS.off('notification', handleNewNotification);
    };
  }, [userId]);

  const dropdownMenu = (
    <div style={{ width: 360, maxHeight: 480, overflow: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>通知中心</span>
        {unreadCount > 0 && (
          <span style={{ color: '#999', fontSize: 14 }}>{unreadCount} 条未读</span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <Empty description="暂无通知" style={{ padding: 40 }} />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: item.isRead ? '#fff' : '#f0f7ff',
                borderBottom: '1px solid #f0f0f0',
              }}
              onClick={() => handleNotificationClick(item)}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: item.isRead ? 'normal' : 600 }}>{item.title}</span>
                    {!item.isRead && <Badge status="processing" />}
                  </div>
                }
                description={
                  <>
                    <div style={{ marginBottom: 4 }}>{item.content}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}

      <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
        <Button type="link" onClick={() => { navigate('/notifications'); setDropdownOpen(false); }}>
          查看全部通知
        </Button>
      </div>
    </div>
  );

  return (
    <Dropdown
      popupRender={() => dropdownMenu}
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement="bottomRight"
    >
      <Badge count={unreadCount} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          style={{ height: 40, width: 40 }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationCenter;
