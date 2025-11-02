import React from 'react';
import { Card, List, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  MessageStatsCards,
  MessageFilterBar,
  MessageListItem,
} from '@/components/Message';
import { MessageDetailModal } from '@/components/MessageDetailModal';
import { useMessageList } from '@/hooks/useMessageList';

/**
 * 消息列表页面
 * 展示所有通知消息，支持筛选、批量操作和查看详情
 */
const MessageList: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    notifications,
    stats,
    total,
    query,
    selectedNotifications,
    selectedNotification,
    detailModalVisible,
    selectAllChecked,
    selectAllIndeterminate,
    handleRefresh,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    handleSelectAll,
    handleSelectNotification,
    handleBatchMarkRead,
    handleMarkAllRead,
    handleBatchDelete,
    handleClearRead,
    handleViewDetail,
    handleCloseDetail,
    handleNotificationRead,
  } = useMessageList();

  return (
    <div>
      {/* 统计卡片 */}
      <MessageStatsCards stats={stats} />

      {/* 筛选工具栏 */}
      <MessageFilterBar
        selectedCount={selectedNotifications.length}
        selectAllChecked={selectAllChecked}
        selectAllIndeterminate={selectAllIndeterminate}
        onSearch={handleSearch}
        onStatusChange={(status) => handleFilterChange('status', status)}
        onTypeChange={(type) => handleFilterChange('type', type)}
        onPriorityChange={(priority) => handleFilterChange('priority', priority)}
        onSettingsClick={() => navigate('/messages/settings')}
        onSelectAll={handleSelectAll}
        onBatchMarkRead={handleBatchMarkRead}
        onBatchDelete={handleBatchDelete}
        onMarkAllRead={handleMarkAllRead}
        onClearRead={handleClearRead}
        onRefresh={handleRefresh}
      />

      {/* 消息列表 */}
      <Card>
        <List
          loading={loading}
          dataSource={notifications}
          locale={{ emptyText: <Empty description="暂无消息" /> }}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条消息`,
            onChange: handlePageChange,
          }}
          renderItem={(notification) => (
            <MessageListItem
              key={notification.id}
              notification={notification}
              selected={selectedNotifications.includes(notification.id)}
              onSelect={handleSelectNotification}
              onClick={() => handleViewDetail(notification)}
            />
          )}
        />
      </Card>

      {/* 消息详情 Modal */}
      <MessageDetailModal
        visible={detailModalVisible}
        notification={selectedNotification}
        onClose={handleCloseDetail}
        onRead={handleNotificationRead}
      />
    </div>
  );
};

export default MessageList;
