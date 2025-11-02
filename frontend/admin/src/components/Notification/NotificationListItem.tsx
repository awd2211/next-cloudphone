import React from 'react';
import { List, Button, Space, Tag, Badge, Popconfirm } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons';
import type { Notification } from '@/services/notification';
import dayjs from 'dayjs';

interface NotificationListItemProps {
  item: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  getTypeConfig: (type: string) => { color: string; text: string };
}

export const NotificationListItem: React.FC<NotificationListItemProps> = React.memo(
  ({ item, onMarkAsRead, onDelete, getTypeConfig }) => {
    return (
      <List.Item
        key={item.id}
        style={{
          background: item.isRead ? '#fff' : '#f0f9ff',
          padding: '16px',
          marginBottom: 8,
          borderRadius: 4,
          border: '1px solid #e8e8e8',
        }}
        actions={[
          !item.isRead && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => onMarkAsRead(item.id)}
            >
              标记已读
            </Button>
          ),
          <Popconfirm
            key="delete"
            title="确定要删除这条通知吗？"
            onConfirm={() => onDelete(item.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>,
        ].filter(Boolean)}
      >
        <List.Item.Meta
          avatar={
            <BellOutlined style={{ fontSize: 24, color: getTypeConfig(item.type).color }} />
          }
          title={
            <Space>
              {!item.isRead && <Badge status="processing" />}
              <span style={{ fontWeight: item.isRead ? 'normal' : 'bold' }}>{item.title}</span>
              <Tag color={getTypeConfig(item.type).color}>{getTypeConfig(item.type).text}</Tag>
            </Space>
          }
          description={
            <div>
              <p style={{ margin: '8px 0', color: '#666' }}>{item.content}</p>
              <div style={{ fontSize: 12, color: '#999' }}>
                {dayjs(item.createdAt).fromNow()}
                {item.readAt && (
                  <span style={{ marginLeft: 16 }}>
                    已读于 {dayjs(item.readAt).format('YYYY-MM-DD HH:mm')}
                  </span>
                )}
              </div>
            </div>
          }
        />
      </List.Item>
    );
  }
);

NotificationListItem.displayName = 'NotificationListItem';
