import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Empty,
  Statistic,
  Row,
  Col,
  Checkbox,
  message,
  Modal,
  Badge,
  Divider,
  Tooltip,
} from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  getNotifications,
  getNotificationStats,
  markAsRead,
  markAllAsRead,
  deleteNotifications,
  clearReadNotifications,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  type Notification,
  type NotificationListQuery,
  type NotificationStats,
} from '@/services/notification';
import { MessageDetailModal } from '@/components/MessageDetailModal';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Search } = Input;
const { Option } = Select;

// 通知类型配置
const notificationTypeConfig: Record<NotificationType, { label: string; color: string }> = {
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
};

// 优先级配置
const priorityConfig: Record<NotificationPriority, { label: string; color: string }> = {
  [NotificationPriority.LOW]: { label: '低', color: 'default' },
  [NotificationPriority.NORMAL]: { label: '普通', color: 'blue' },
  [NotificationPriority.HIGH]: { label: '高', color: 'orange' },
  [NotificationPriority.URGENT]: { label: '紧急', color: 'red' },
};

const MessageList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<NotificationListQuery>({
    page: 1,
    pageSize: 10,
  });

  // 加载消息列表
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications(query);
      setNotifications(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载消息列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const statsData = await getNotificationStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [query]);

  // 刷新
  const handleRefresh = () => {
    setSelectedNotifications([]);
    loadNotifications();
    loadStats();
  };

  // 搜索
  const handleSearch = (value: string) => {
    setQuery({ ...query, page: 1 });
    // Note: 这里需要后端支持搜索参数
    loadNotifications();
  };

  // 筛选变化
  const handleFilterChange = (key: keyof NotificationListQuery, value: any) => {
    setQuery({
      ...query,
      page: 1,
      [key]: value || undefined,
    });
  };

  // 分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setQuery({ ...query, page, pageSize: pageSize || query.pageSize });
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(notifications.map((n) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  // 选择单个通知
  const handleSelectNotification = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications([...selectedNotifications, id]);
    } else {
      setSelectedNotifications(selectedNotifications.filter((nid) => nid !== id));
    }
  };

  // 批量标记已读
  const handleBatchMarkRead = async () => {
    if (selectedNotifications.length === 0) {
      message.warning('请先选择消息');
      return;
    }

    try {
      await markAsRead(selectedNotifications);
      message.success('已标记为已读');
      setSelectedNotifications([]);
      handleRefresh();
    } catch (error) {
      message.error('标记已读失败');
    }
  };

  // 全部标记已读
  const handleMarkAllRead = () => {
    Modal.confirm({
      title: '确认标记全部消息为已读？',
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          await markAllAsRead();
          message.success('已全部标记为已读');
          handleRefresh();
        } catch (error) {
          message.error('操作失败');
        }
      },
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedNotifications.length === 0) {
      message.warning('请先选择消息');
      return;
    }

    Modal.confirm({
      title: `确认删除选中的 ${selectedNotifications.length} 条消息？`,
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          await deleteNotifications(selectedNotifications);
          message.success('删除成功');
          setSelectedNotifications([]);
          handleRefresh();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 清空已读消息
  const handleClearRead = () => {
    Modal.confirm({
      title: '确认清空所有已读消息？',
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可恢复',
      onOk: async () => {
        try {
          await clearReadNotifications();
          message.success('已清空已读消息');
          handleRefresh();
        } catch (error) {
          message.error('操作失败');
        }
      },
    });
  };

  // 查看详情
  const handleViewDetail = (notification: Notification) => {
    setSelectedNotification(notification);
    setDetailModalVisible(true);
  };

  // 关闭详情 Modal
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedNotification(null);
  };

  // 详情 Modal 标记已读后刷新
  const handleNotificationRead = () => {
    handleRefresh();
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="全部消息"
              value={stats?.total || 0}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="未读消息"
              value={stats?.unread || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日消息"
              value={stats?.today || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本周消息"
              value={stats?.thisWeek || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 搜索和筛选 */}
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap>
              <Search
                placeholder="搜索消息标题或内容"
                onSearch={handleSearch}
                style={{ width: 250 }}
                allowClear
              />

              <Select
                placeholder="状态"
                style={{ width: 120 }}
                allowClear
                onChange={(value) => handleFilterChange('status', value)}
              >
                <Option value={NotificationStatus.UNREAD}>未读</Option>
                <Option value={NotificationStatus.READ}>已读</Option>
              </Select>

              <Select
                placeholder="类型"
                style={{ width: 140 }}
                allowClear
                onChange={(value) => handleFilterChange('type', value)}
              >
                {Object.entries(notificationTypeConfig).map(([key, config]) => (
                  <Option key={key} value={key}>
                    {config.label}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="优先级"
                style={{ width: 120 }}
                allowClear
                onChange={(value) => handleFilterChange('priority', value)}
              >
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <Option key={key} value={key}>
                    {config.label}
                  </Option>
                ))}
              </Select>
            </Space>

            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate('/messages/settings')}
            >
              消息设置
            </Button>
          </Space>

          {/* 批量操作 */}
          <Space wrap>
            <Checkbox
              checked={
                selectedNotifications.length > 0 &&
                selectedNotifications.length === notifications.length
              }
              indeterminate={
                selectedNotifications.length > 0 &&
                selectedNotifications.length < notifications.length
              }
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              全选
            </Checkbox>

            <Button
              size="small"
              disabled={selectedNotifications.length === 0}
              onClick={handleBatchMarkRead}
            >
              标记已读 ({selectedNotifications.length})
            </Button>

            <Button
              size="small"
              danger
              disabled={selectedNotifications.length === 0}
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
            >
              删除 ({selectedNotifications.length})
            </Button>

            <Divider type="vertical" />

            <Button size="small" onClick={handleMarkAllRead}>
              全部已读
            </Button>

            <Button size="small" onClick={handleClearRead}>
              清空已读
            </Button>

            <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        </Space>
      </Card>

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
          renderItem={(notification) => {
            const typeConfig = notificationTypeConfig[notification.type];
            const isUnread = notification.status === NotificationStatus.UNREAD;

            return (
              <List.Item
                key={notification.id}
                style={{
                  backgroundColor: isUnread ? '#f0f7ff' : 'transparent',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isUnread ? '#e6f4ff' : '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isUnread ? '#f0f7ff' : 'transparent';
                }}
                onClick={() => handleViewDetail(notification)}
                actions={[
                  <Checkbox
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectNotification(notification.id, e.target.checked);
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
                      {isUnread && (
                        <Badge status="processing" />
                      )}
                      <span style={{ fontWeight: isUnread ? 600 : 400 }}>
                        {notification.title}
                      </span>
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
          }}
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
