import React from 'react';
import { List, Card, Badge, Button, Space, Tabs } from 'antd';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';
import { NotificationListItem, CreateNotificationModal } from '@/components/Notification';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const NotificationCenter: React.FC = () => {
  const {
    notifications,
    loading,
    total,
    page,
    pageSize,
    selectedTab,
    createModalVisible,
    form,
    setPage,
    setSelectedTab,
    handleCreate,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleDelete,
    handleOpenCreateModal,
    handleCloseCreateModal,
    getTypeConfig,
  } = useNotificationCenter();

  const tabItems = [
    {
      key: 'all',
      label: '全部通知',
    },
    {
      key: 'unread',
      label: (
        <Badge count={notifications.filter((n) => !n.isRead).length} offset={[10, 0]}>
          未读通知
        </Badge>
      ),
    },
    {
      key: 'read',
      label: '已读通知',
    },
  ];

  return (
    <div>
      <h2>通知中心</h2>

      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            发送通知
          </Button>
          <Button icon={<CheckOutlined />} onClick={handleMarkAllAsRead}>
            全部标记为已读
          </Button>
        </Space>
      </Card>

      <Tabs activeKey={selectedTab} items={tabItems} onChange={setSelectedTab} />

      <List
        loading={loading}
        dataSource={notifications}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (total) => `共 ${total} 条`,
          onChange: setPage,
        }}
        renderItem={(item) => (
          <NotificationListItem
            key={item.id}
            item={item}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            getTypeConfig={getTypeConfig}
          />
        )}
      />

      <CreateNotificationModal
        visible={createModalVisible}
        form={form}
        onFinish={handleCreate}
        onCancel={handleCloseCreateModal}
      />
    </div>
  );
};

export default NotificationCenter;
