import { useState, useEffect } from 'react';
import { List, Card, Badge, Button, Modal, Form, Input, Select, message, Space, Tag, Popconfirm, Tabs } from 'antd';
import { BellOutlined, CheckOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  batchDeleteNotifications,
  type Notification,
  type CreateNotificationDto,
} from '@/services/notification';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [form] = Form.useForm();

  const loadNotifications = async (isRead?: boolean) => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (isRead !== undefined) params.isRead = isRead;
      const res = await getNotifications(params);
      setNotifications(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'all') {
      loadNotifications();
    } else if (selectedTab === 'unread') {
      loadNotifications(false);
    } else {
      loadNotifications(true);
    }
  }, [page, selectedTab]);

  const handleCreate = async (values: CreateNotificationDto) => {
    try {
      await createNotification(values);
      message.success('发送通知成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadNotifications();
    } catch (error) {
      message.error('发送通知失败');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      message.success('已标记为已读');
      loadNotifications();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      message.success('全部标记为已读');
      loadNotifications();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      message.success('删除成功');
      loadNotifications();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      info: { color: 'blue', text: '信息' },
      warning: { color: 'orange', text: '警告' },
      error: { color: 'red', text: '错误' },
      success: { color: 'green', text: '成功' },
      announcement: { color: 'purple', text: '公告' },
    };
    return configs[type] || configs.info;
  };

  const tabItems = [
    {
      key: 'all',
      label: '全部通知',
    },
    {
      key: 'unread',
      label: <Badge count={notifications.filter(n => !n.isRead).length} offset={[10, 0]}>未读通知</Badge>,
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            发送通知
          </Button>
          <Button
            icon={<CheckOutlined />}
            onClick={handleMarkAllAsRead}
          >
            全部标记为已读
          </Button>
        </Space>
      </Card>

      <Tabs
        activeKey={selectedTab}
        items={tabItems}
        onChange={setSelectedTab}
      />

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
          <List.Item
            key={item.id}
            style={{
              background: item.isRead ? '#fff' : '#f0f9ff',
              padding: '16px',
              marginBottom: 8,
              borderRadius: 4,
              border: '1px solid #e8e8e8'
            }}
            actions={[
              !item.isRead && (
                <Button
                  type="link"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleMarkAsRead(item.id)}
                >
                  标记已读
                </Button>
              ),
              <Popconfirm
                title="确定要删除这条通知吗？"
                onConfirm={() => handleDelete(item.id)}
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
              avatar={<BellOutlined style={{ fontSize: 24, color: getTypeConfig(item.type).color }} />}
              title={
                <Space>
                  {!item.isRead && <Badge status="processing" />}
                  <span style={{ fontWeight: item.isRead ? 'normal' : 'bold' }}>
                    {item.title}
                  </span>
                  <Tag color={getTypeConfig(item.type).color}>
                    {getTypeConfig(item.type).text}
                  </Tag>
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
        )}
      />

      {/* 创建通知对话框 */}
      <Modal
        title="发送通知"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          onFinish={handleCreate}
          layout="vertical"
        >
          <Form.Item
            label="通知类型"
            name="type"
            rules={[{ required: true, message: '请选择通知类型' }]}
            initialValue="info"
          >
            <Select>
              <Select.Option value="info">信息</Select.Option>
              <Select.Option value="warning">警告</Select.Option>
              <Select.Option value="error">错误</Select.Option>
              <Select.Option value="success">成功</Select.Option>
              <Select.Option value="announcement">公告</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="通知标题"
            name="title"
            rules={[{ required: true, message: '请输入通知标题' }]}
          >
            <Input placeholder="请输入通知标题" />
          </Form.Item>

          <Form.Item
            label="通知内容"
            name="content"
            rules={[{ required: true, message: '请输入通知内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入通知内容" />
          </Form.Item>

          <Form.Item
            label="接收对象"
            name="sendToAll"
            initialValue={true}
          >
            <Select>
              <Select.Option value={true}>所有用户</Select.Option>
              <Select.Option value={false}>指定用户</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.sendToAll !== currentValues.sendToAll
            }
          >
            {({ getFieldValue }) =>
              !getFieldValue('sendToAll') && (
                <Form.Item
                  label="用户ID列表"
                  name="userIds"
                  rules={[{ required: true, message: '请输入用户ID' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="输入用户ID，按回车添加"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationCenter;
