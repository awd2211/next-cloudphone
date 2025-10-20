import { useState } from 'react';
import { Badge, Button, Drawer, List, Empty, Tag, Space } from 'antd';
import { BellOutlined, DeleteOutlined, ClearOutlined } from '@ant-design/icons';
import { useWebSocket } from '@/contexts/WebSocketContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const NotificationCenter = () => {
  const [visible, setVisible] = useState(false);
  const { notifications, clearNotifications, removeNotification } = useWebSocket();

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'processing',
    };
    return colorMap[type] || 'default';
  };

  const getTypeText = (type: string) => {
    const textMap: Record<string, string> = {
      success: '成功',
      error: '错误',
      warning: '警告',
      info: '信息',
    };
    return textMap[type] || type;
  };

  return (
    <>
      <Badge count={notifications.length} offset={[-5, 5]}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          onClick={() => setVisible(true)}
        />
      </Badge>

      <Drawer
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>通知中心</span>
            {notifications.length > 0 && (
              <Button
                type="link"
                size="small"
                icon={<ClearOutlined />}
                onClick={clearNotifications}
              >
                清空
              </Button>
            )}
          </Space>
        }
        placement="right"
        onClose={() => setVisible(false)}
        open={visible}
        width={400}
      >
        {notifications.length === 0 ? (
          <Empty description="暂无通知" />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                actions={[
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeNotification(item.id)}
                  />,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={getTypeColor(item.type)}>{getTypeText(item.type)}</Tag>
                      {item.title}
                    </Space>
                  }
                  description={
                    <>
                      <div style={{ marginBottom: 8 }}>{item.message}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(item.timestamp).fromNow()}
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
};

export default NotificationCenter;
