import React, { useState, useMemo, useCallback } from 'react';
import { Card, Table, Tag, Button, Space, Input, Select, Badge, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, MessageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;

interface Ticket {
  id: string;
  ticketNo: string;
  title: string;
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
  lastReplyAt?: string;
  replyCount: number;
  unreadReplies: number;
}

const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 'ticket-001',
      ticketNo: 'TKT-20251020-001',
      title: '设备无法启动',
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
      lastReplyAt: '2025-10-20 14:22:30',
      replyCount: 5,
      unreadReplies: 2,
    },
    {
      id: 'ticket-002',
      ticketNo: 'TKT-20251020-002',
      title: '账单金额异常',
      category: 'billing',
      priority: 'medium',
      status: 'waiting_customer',
      userId: 'user-002',
      userName: '王五',
      userEmail: 'wangwu@example.com',
      assignedTo: 'admin-002',
      assignedToName: '赵客服',
      createdAt: '2025-10-20 10:15:42',
      updatedAt: '2025-10-20 11:30:18',
      lastReplyAt: '2025-10-20 11:30:18',
      replyCount: 3,
      unreadReplies: 0,
    },
    {
      id: 'ticket-003',
      ticketNo: 'TKT-20251019-003',
      title: '如何增加设备配额',
      category: 'account',
      priority: 'low',
      status: 'resolved',
      userId: 'user-003',
      userName: '李四',
      userEmail: 'lisi@example.com',
      assignedTo: 'admin-001',
      assignedToName: '李工程师',
      createdAt: '2025-10-19 14:20:10',
      updatedAt: '2025-10-19 16:45:22',
      lastReplyAt: '2025-10-19 16:45:22',
      replyCount: 2,
      unreadReplies: 0,
    },
    {
      id: 'ticket-004',
      ticketNo: 'TKT-20251019-004',
      title: 'API 调用报错',
      category: 'technical',
      priority: 'urgent',
      status: 'open',
      userId: 'user-004',
      userName: '赵六',
      userEmail: 'zhaoliu@example.com',
      createdAt: '2025-10-19 16:50:33',
      updatedAt: '2025-10-19 16:50:33',
      replyCount: 0,
      unreadReplies: 1,
    },
    {
      id: 'ticket-005',
      ticketNo: 'TKT-20251018-005',
      title: '申请退款',
      category: 'billing',
      priority: 'medium',
      status: 'closed',
      userId: 'user-005',
      userName: '孙七',
      userEmail: 'sunqi@example.com',
      assignedTo: 'admin-002',
      assignedToName: '赵客服',
      createdAt: '2025-10-18 09:10:05',
      updatedAt: '2025-10-18 17:20:15',
      lastReplyAt: '2025-10-18 17:20:15',
      replyCount: 8,
      unreadReplies: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // 使用 useCallback 优化渲染函数
  const getCategoryTag = useCallback((category: Ticket['category']) => {
    const categoryConfig = {
      technical: { color: 'blue', text: '技术问题' },
      billing: { color: 'orange', text: '账单问题' },
      account: { color: 'green', text: '账号问题' },
      other: { color: 'default', text: '其他' },
    };
    const config = categoryConfig[category];
    return <Tag color={config.color}>{config.text}</Tag>;
  }, []);

  const getPriorityTag = useCallback((priority: Ticket['priority']) => {
    const priorityConfig = {
      low: { color: 'default', text: '低' },
      medium: { color: 'blue', text: '中' },
      high: { color: 'orange', text: '高' },
      urgent: { color: 'red', text: '紧急' },
    };
    const config = priorityConfig[priority];
    return <Tag color={config.color}>{config.text}</Tag>;
  }, []);

  const getStatusBadge = useCallback((status: Ticket['status']) => {
    const statusConfig = {
      open: { status: 'error', text: '待处理' },
      in_progress: { status: 'processing', text: '处理中' },
      waiting_customer: { status: 'warning', text: '等待客户' },
      resolved: { status: 'success', text: '已解决' },
      closed: { status: 'default', text: '已关闭' },
    };
    const config = statusConfig[status] as any;
    return <Badge status={config.status} text={config.text} />;
  }, []);

  const handleViewDetail = useCallback(
    (ticket: Ticket) => {
      navigate(`/tickets/${ticket.id}`);
    },
    [navigate]
  );

  // 使用 useMemo 缓存 columns 配置
  const columns: ColumnsType<Ticket> = useMemo(
    () => [
      {
        title: '工单编号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 160,
        render: (ticketNo: string, record: Ticket) => (
          <Space>
            <a onClick={() => handleViewDetail(record)}>{ticketNo}</a>
            {record.unreadReplies > 0 && <Badge count={record.unreadReplies} size="small" />}
          </Space>
        ),
      },
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 110,
        render: (category: Ticket['category']) => getCategoryTag(category),
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 90,
        render: (priority: Ticket['priority']) => getPriorityTag(priority),
        sorter: (a, b) => {
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (status: Ticket['status']) => getStatusBadge(status),
      },
      {
        title: '提交人',
        dataIndex: 'userName',
        key: 'userName',
        width: 100,
      },
      {
        title: '负责人',
        dataIndex: 'assignedToName',
        key: 'assignedToName',
        width: 100,
        render: (name?: string) => name || <Tag>未分配</Tag>,
      },
      {
        title: '回复数',
        dataIndex: 'replyCount',
        key: 'replyCount',
        width: 80,
        align: 'center',
        render: (count: number) => (
          <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
        ),
      },
      {
        title: '最后更新',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetail(record)}
              />
            </Tooltip>
            <Tooltip title="快速回复">
              <Button
                type="link"
                size="small"
                icon={<MessageOutlined />}
                onClick={() => handleViewDetail(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [getCategoryTag, getPriorityTag, getStatusBadge, handleViewDetail]
  );

  // 使用 useMemo 缓存过滤后的数据
  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
        if (
          searchText &&
          !ticket.title.toLowerCase().includes(searchText.toLowerCase()) &&
          !ticket.ticketNo.toLowerCase().includes(searchText.toLowerCase())
        )
          return false;
        return true;
      }),
    [tickets, categoryFilter, statusFilter, priorityFilter, searchText]
  );

  return (
    <Card
      title="工单管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tickets/create')}>
          创建工单
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索工单编号或标题"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          style={{ width: 130 }}
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="分类"
        >
          <Option value="all">全部分类</Option>
          <Option value="technical">技术问题</Option>
          <Option value="billing">账单问题</Option>
          <Option value="account">账号问题</Option>
          <Option value="other">其他</Option>
        </Select>
        <Select
          style={{ width: 130 }}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="状态"
        >
          <Option value="all">全部状态</Option>
          <Option value="open">待处理</Option>
          <Option value="in_progress">处理中</Option>
          <Option value="waiting_customer">等待客户</Option>
          <Option value="resolved">已解决</Option>
          <Option value="closed">已关闭</Option>
        </Select>
        <Select
          style={{ width: 120 }}
          value={priorityFilter}
          onChange={setPriorityFilter}
          placeholder="优先级"
        >
          <Option value="all">全部优先级</Option>
          <Option value="low">低</Option>
          <Option value="medium">中</Option>
          <Option value="high">高</Option>
          <Option value="urgent">紧急</Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredTickets}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条工单`,
          showSizeChanger: true,
        }}
        scroll={{ x: 1400 }}
      />
    </Card>
  );
};

// 使用 React.memo 包裹组件以优化性能
export default React.memo(TicketList);
