import React, { useState, memo, useCallback, useMemo } from 'react';
import { Badge, Dropdown, List, Button, Empty, Spin } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import type { Notification } from '@/services/notification';
import { useNavigate } from 'react-router-dom';
import { useNotificationCenter } from '@/hooks/queries/useNotificationCenter';

const NotificationCenter: React.FC = memo(() => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ✅ 使用重构后的 hook (hook 内部会从 localStorage 获取 userId)
  const {
    notifications,
    unreadCount,
    loading,
    handleMarkAsRead,
  } = useNotificationCenter();

  // ✅ 使用 useCallback 包装点击处理函数
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        handleMarkAsRead(notification.id);
      }
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
        setDropdownOpen(false);
      }
    },
    [handleMarkAsRead, navigate]
  );

  // ✅ 使用 useCallback 包装查看全部按钮的点击处理
  const handleViewAll = useCallback(() => {
    navigate('/admin/notifications');
    setDropdownOpen(false);
  }, [navigate]);

  const dropdownMenu = (
    <div
      style={{
        width: 360,
        maxHeight: 480,
        overflow: 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
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
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
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
        <Button type="link" onClick={handleViewAll}>
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
});

NotificationCenter.displayName = 'NotificationCenter';

export default NotificationCenter;
