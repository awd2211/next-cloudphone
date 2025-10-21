import React, { useState } from 'react';
import { Card, Descriptions, Tag, Badge, Button, Space, Divider, List, Avatar, Input, Select, Modal, message } from 'antd';
import { ArrowLeftOutlined, UserOutlined, ClockCircleOutlined, SendOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

interface TicketReply {
  id: string;
  userId: string;
  userName: string;
  userType: 'customer' | 'admin';
  content: string;
  createdAt: string;
  isInternal: boolean;
}

interface TicketDetail {
  id: string;
  ticketNo: string;
  title: string;
  content: string;
  category: 'technical' | 'billing' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  replies: TicketReply[];
}

const TicketDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<TicketDetail>({
    id: 'ticket-001',
    ticketNo: 'TKT-20251020-001',
    title: '设备无法启动',
    content: '我的设备ID DEV-12345 无法启动，点击启动按钮后没有任何反应。已经尝试重启浏览器和清除缓存，问题依然存在。请协助处理。',
    category: 'technical',
    priority: 'high',
    status: 'in_progress',
    userId: 'user-001',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    assignedTo: 'admin-001',
    assignedToName: '李工程师',
    createdAt: '2025-10-20 09:30:15',
    updatedAt: '2025-10-20 14:22:30',
    replies: [
      {
        id: 'reply-001',
        userId: 'admin-001',
        userName: '李工程师',
        userType: 'admin',
        content: '您好，我已经查看了您的设备日志。请问您是什么时候开始遇到这个问题的？',
        createdAt: '2025-10-20 10:15:20',
        isInternal: false,
      },
      {
        id: 'reply-002',
        userId: 'user-001',
        userName: '张三',
        userType: 'customer',
        content: '大概是昨天下午开始的，之前一直都正常。',
        createdAt: '2025-10-20 11:20:45',
        isInternal: false,
      },
      {
        id: 'reply-003',
        userId: 'admin-001',
        userName: '李工程师',
        userType: 'admin',
        content: '[内部备注] 发现是容器启动失败，可能是资源不足导致',
        createdAt: '2025-10-20 12:30:10',
        isInternal: true,
      },
      {
        id: 'reply-004',
        userId: 'admin-001',
        userName: '李工程师',
        userType: 'admin',
        content: '我已经找到问题了，是由于系统资源分配异常导致的。我已经为您重新分配了资源，请尝试重新启动设备。',
        createdAt: '2025-10-20 14:10:30',
        isInternal: false,
      },
      {
        id: 'reply-005',
        userId: 'user-001',
        userName: '张三',
        userType: 'customer',
        content: '太好了！现在可以正常启动了，谢谢您的帮助！',
        createdAt: '2025-10-20 14:22:30',
        isInternal: false,
      },
    ],
  });

  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [submitting, setSubmitting] = useState(false);

  const getCategoryTag = (category: TicketDetail['category']) => {
    const categoryConfig = {
      technical: { color: 'blue', text: '技术问题' },
      billing: { color: 'orange', text: '账单问题' },
      account: { color: 'green', text: '账号问题' },
      other: { color: 'default', text: '其他' },
    };
    const config = categoryConfig[category];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getPriorityTag = (priority: TicketDetail['priority']) => {
    const priorityConfig = {
      low: { color: 'default', text: '低' },
      medium: { color: 'blue', text: '中' },
      high: { color: 'orange', text: '高' },
      urgent: { color: 'red', text: '紧急' },
    };
    const config = priorityConfig[priority];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusBadge = (status: TicketDetail['status']) => {
    const statusConfig = {
      open: { status: 'error', text: '待处理' },
      in_progress: { status: 'processing', text: '处理中' },
      waiting_customer: { status: 'warning', text: '等待客户' },
      resolved: { status: 'success', text: '已解决' },
      closed: { status: 'default', text: '已关闭' },
    };
    const config = statusConfig[status] as any;
    return <Badge status={config.status} text={config.text} />;
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: 调用 API 提交回复
      const newReply: TicketReply = {
        id: `reply-${Date.now()}`,
        userId: 'admin-current',
        userName: '当前管理员',
        userType: 'admin',
        content: replyContent,
        createdAt: new Date().toLocaleString('zh-CN'),
        isInternal: isInternalNote,
      };

      setTicket({
        ...ticket,
        replies: [...ticket.replies, newReply],
        status: newStatus,
        updatedAt: new Date().toLocaleString('zh-CN'),
      });

      setReplyContent('');
      setIsInternalNote(false);
      message.success('回复已提交');
    } catch (error) {
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = () => {
    Modal.confirm({
      title: '确认关闭工单',
      content: '关闭后将无法继续回复，是否确认关闭？',
      onOk: () => {
        setTicket({ ...ticket, status: 'closed' });
        setNewStatus('closed');
        message.success('工单已关闭');
      },
    });
  };

  const handleResolveTicket = () => {
    setTicket({ ...ticket, status: 'resolved' });
    setNewStatus('resolved');
    message.success('工单已标记为已解决');
  };

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/tickets')}
        style={{ marginBottom: 16 }}
      >
        返回工单列表
      </Button>

      <Card
        title={`工单详情 - ${ticket.ticketNo}`}
        extra={
          <Space>
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleResolveTicket}
              >
                标记为已解决
              </Button>
            )}
            {ticket.status !== 'closed' && (
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={handleCloseTicket}
              >
                关闭工单
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="工单标题" span={2}>
            {ticket.title}
          </Descriptions.Item>
          <Descriptions.Item label="分类">
            {getCategoryTag(ticket.category)}
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            {getPriorityTag(ticket.priority)}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {getStatusBadge(ticket.status)}
          </Descriptions.Item>
          <Descriptions.Item label="负责人">
            {ticket.assignedToName || <Tag>未分配</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="提交人">
            {ticket.userName}
          </Descriptions.Item>
          <Descriptions.Item label="联系邮箱">
            {ticket.userEmail}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {ticket.createdAt}
          </Descriptions.Item>
          <Descriptions.Item label="最后更新">
            {ticket.updatedAt}
          </Descriptions.Item>
          <Descriptions.Item label="问题描述" span={2}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.content}</div>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="回复记录" style={{ marginTop: 16 }}>
        <List
          itemLayout="vertical"
          dataSource={ticket.replies}
          renderItem={(reply) => (
            <List.Item
              key={reply.id}
              style={{
                backgroundColor: reply.isInternal ? '#fff7e6' : '#fff',
                padding: 16,
                marginBottom: 8,
                borderRadius: 4,
                border: reply.isInternal ? '1px solid #ffd591' : '1px solid #f0f0f0',
              }}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} />}
                title={
                  <Space>
                    <span>{reply.userName}</span>
                    <Tag color={reply.userType === 'admin' ? 'blue' : 'green'}>
                      {reply.userType === 'admin' ? '客服' : '客户'}
                    </Tag>
                    {reply.isInternal && <Tag color="orange">内部备注</Tag>}
                  </Space>
                }
                description={
                  <Space>
                    <ClockCircleOutlined />
                    <span>{reply.createdAt}</span>
                  </Space>
                }
              />
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                {reply.content}
              </div>
            </List.Item>
          )}
        />
      </Card>

      {ticket.status !== 'closed' && (
        <Card title="添加回复" style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <TextArea
              rows={6}
              placeholder="请输入回复内容..."
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
            />
            <Space>
              <Select
                style={{ width: 150 }}
                value={newStatus}
                onChange={setNewStatus}
              >
                <Option value="open">待处理</Option>
                <Option value="in_progress">处理中</Option>
                <Option value="waiting_customer">等待客户</Option>
                <Option value="resolved">已解决</Option>
              </Select>
              <Select
                style={{ width: 150 }}
                value={isInternalNote ? 'internal' : 'public'}
                onChange={value => setIsInternalNote(value === 'internal')}
              >
                <Option value="public">公开回复</Option>
                <Option value="internal">内部备注</Option>
              </Select>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={handleSubmitReply}
              >
                提交回复
              </Button>
            </Space>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default TicketDetail;
