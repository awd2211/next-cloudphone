import React, { useMemo } from 'react';
import { Card, Space, Input, Select, Button, Checkbox, Divider } from 'antd';
import { SettingOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '@/services/notification';

const { Search } = Input;
const { Option } = Select;

interface MessageFilterBarProps {
  selectedCount: number;
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
  onSearch: (value: string) => void;
  onStatusChange: (status?: NotificationStatus) => void;
  onTypeChange: (type?: NotificationType) => void;
  onPriorityChange: (priority?: NotificationPriority) => void;
  onSettingsClick: () => void;
  onSelectAll: (checked: boolean) => void;
  onBatchMarkRead: () => void;
  onBatchDelete: () => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
  onRefresh: () => void;
}

/**
 * 消息筛选工具栏组件
 * 包含搜索、状态筛选、类型筛选、优先级筛选和批量操作
 */
export const MessageFilterBar: React.FC<MessageFilterBarProps> = React.memo(({
  selectedCount,
  selectAllChecked,
  selectAllIndeterminate,
  onSearch,
  onStatusChange,
  onTypeChange,
  onPriorityChange,
  onSettingsClick,
  onSelectAll,
  onBatchMarkRead,
  onBatchDelete,
  onMarkAllRead,
  onClearRead,
  onRefresh,
}) => {
  // 通知类型配置
  const notificationTypeOptions = useMemo(() => [
    { label: '系统通知', value: NotificationType.SYSTEM },
    { label: '工单回复', value: NotificationType.TICKET_REPLY },
    { label: '工单已解决', value: NotificationType.TICKET_RESOLVED },
    { label: '余额不足', value: NotificationType.BALANCE_LOW },
    { label: '充值成功', value: NotificationType.BALANCE_RECHARGED },
    { label: '订单完成', value: NotificationType.ORDER_COMPLETED },
    { label: '订单失败', value: NotificationType.ORDER_FAILED },
    { label: '设备就绪', value: NotificationType.DEVICE_READY },
    { label: '设备异常', value: NotificationType.DEVICE_ERROR },
    { label: '应用安装完成', value: NotificationType.APP_INSTALLED },
    { label: '促销活动', value: NotificationType.PROMOTION },
    { label: '维护通知', value: NotificationType.MAINTENANCE },
    { label: '安全提醒', value: NotificationType.SECURITY },
  ], []);

  // 优先级配置
  const priorityOptions = useMemo(() => [
    { label: '低', value: NotificationPriority.LOW },
    { label: '普通', value: NotificationPriority.NORMAL },
    { label: '高', value: NotificationPriority.HIGH },
    { label: '紧急', value: NotificationPriority.URGENT },
  ], []);

  return (
    <Card style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 搜索和筛选 */}
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Search
              placeholder="搜索消息标题或内容"
              onSearch={onSearch}
              style={{ width: 250 }}
              allowClear
            />

            <Select
              placeholder="状态"
              style={{ width: 120 }}
              allowClear
              onChange={onStatusChange}
            >
              <Option value={NotificationStatus.UNREAD}>未读</Option>
              <Option value={NotificationStatus.READ}>已读</Option>
            </Select>

            <Select
              placeholder="类型"
              style={{ width: 140 }}
              allowClear
              onChange={onTypeChange}
            >
              {notificationTypeOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="优先级"
              style={{ width: 120 }}
              allowClear
              onChange={onPriorityChange}
            >
              {priorityOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Space>

          <Button icon={<SettingOutlined />} onClick={onSettingsClick}>
            消息设置
          </Button>
        </Space>

        {/* 批量操作 */}
        <Space wrap>
          <Checkbox
            checked={selectAllChecked}
            indeterminate={selectAllIndeterminate}
            onChange={(e) => onSelectAll(e.target.checked)}
          >
            全选
          </Checkbox>

          <Button
            size="small"
            disabled={selectedCount === 0}
            onClick={onBatchMarkRead}
          >
            标记已读 ({selectedCount})
          </Button>

          <Button
            size="small"
            danger
            disabled={selectedCount === 0}
            icon={<DeleteOutlined />}
            onClick={onBatchDelete}
          >
            删除 ({selectedCount})
          </Button>

          <Divider type="vertical" />

          <Button size="small" onClick={onMarkAllRead}>
            全部已读
          </Button>

          <Button size="small" onClick={onClearRead}>
            清空已读
          </Button>

          <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </Space>
      </Space>
    </Card>
  );
});

MessageFilterBar.displayName = 'MessageFilterBar';
