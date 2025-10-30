import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Descriptions,
  Row,
  Col,
  Statistic,
  Rate,
  Drawer,
  Timeline,
  Divider,
  Avatar,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  MessageOutlined,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  Ticket,
  TicketReply,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ReplyType,
  CreateTicketDto,
  TicketStatistics,
} from '@/types';
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  getTicketReplies,
  addTicketReply,
  rateTicket,
  getTicketStatistics,
} from '@/services/ticket';

const TicketManagement: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statistics, setStatistics] = useState<TicketStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<TicketReply[]>([]);
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState<TicketStatus | undefined>(undefined);
  const [filterPriority, setFilterPriority] = useState<TicketPriority | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<TicketCategory | undefined>(undefined);
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');

  useEffect(() => {
    loadTickets();
    loadStatistics();
  }, [filterStatus, filterPriority, filterCategory, filterAssignedTo]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category = filterCategory;
      if (filterAssignedTo) params.assignedTo = filterAssignedTo;

      const res = await getAllTickets(params);
      if (res.success) {
        setTickets(res.data);
      }
    } catch (error) {
      message.error('加载工单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await getTicketStatistics();
      if (res.success) {
        setStatistics(res.data);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  const loadTicketReplies = async (ticketId: string) => {
    try {
      const res = await getTicketReplies(ticketId, true);
      if (res.success) {
        setTicketReplies(res.data);
      }
    } catch (error) {
      message.error('加载回复列表失败');
    }
  };

  const handleCreate = () => {
    setEditingTicket(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Ticket) => {
    setEditingTicket(record);
    form.setFieldsValue({
      subject: record.subject,
      description: record.description,
      category: record.category,
      priority: record.priority,
      status: record.status,
      assignedTo: record.assignedTo,
      tags: record.tags?.join(', '),
    });
    setIsModalVisible(true);
  };

  const handleViewDetail = async (record: Ticket) => {
    try {
      const res = await getTicketById(record.id);
      if (res.success) {
        setSelectedTicket(res.data);
        await loadTicketReplies(record.id);
        setIsDetailDrawerVisible(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  const handleReply = (record: Ticket) => {
    setSelectedTicket(record);
    replyForm.resetFields();
    setIsReplyModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const data: CreateTicketDto | any = {
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority,
        userId: values.userId,
        tags: values.tags ? values.tags.split(',').map((s: string) => s.trim()) : undefined,
      };

      if (editingTicket) {
        const updateData: any = {
          ...data,
          status: values.status,
          assignedTo: values.assignedTo,
        };
        const res = await updateTicket(editingTicket.id, updateData);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadTickets();
          loadStatistics();
        }
      } else {
        const res = await createTicket(data);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadTickets();
          loadStatistics();
        }
      }
    } catch (error) {
      message.error(editingTicket ? '更新工单失败' : '创建工单失败');
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedTicket) return;

    try {
      const values = await replyForm.validateFields();

      const res = await addTicketReply(selectedTicket.id, {
        userId: values.userId,
        type: values.type,
        content: values.content,
        isInternal: values.isInternal || false,
      });

      if (res.success) {
        message.success(res.message);
        setIsReplyModalVisible(false);
        loadTickets();
        if (isDetailDrawerVisible) {
          await loadTicketReplies(selectedTicket.id);
        }
      }
    } catch (error) {
      message.error('添加回复失败');
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    const colors: Record<TicketStatus, string> = {
      open: 'blue',
      in_progress: 'orange',
      pending: 'gold',
      resolved: 'green',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: TicketStatus) => {
    const labels: Record<TicketStatus, string> = {
      open: '待处理',
      in_progress: '处理中',
      pending: '待用户反馈',
      resolved: '已解决',
      closed: '已关闭',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: TicketPriority) => {
    const colors: Record<TicketPriority, string> = {
      low: 'default',
      medium: 'blue',
      high: 'orange',
      urgent: 'red',
    };
    return colors[priority] || 'default';
  };

  const getPriorityLabel = (priority: TicketPriority) => {
    const labels: Record<TicketPriority, string> = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '紧急',
    };
    return labels[priority] || priority;
  };

  const getCategoryLabel = (category: TicketCategory) => {
    const labels: Record<TicketCategory, string> = {
      technical: '技术支持',
      billing: '账单问题',
      account: '账户问题',
      feature_request: '功能请求',
      other: '其他',
    };
    return labels[category] || category;
  };

  const getReplyTypeColor = (type: ReplyType) => {
    const colors: Record<ReplyType, string> = {
      user: 'blue',
      staff: 'green',
      system: 'purple',
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: '工单编号',
      dataIndex: 'ticketNumber',
      key: 'ticketNumber',
      width: 160,
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
      width: 200,
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: TicketCategory) => (
        <Tag color="cyan">{getCategoryLabel(category)}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: TicketPriority) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TicketStatus) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
    },
    {
      title: '分配给',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 120,
      ellipsis: true,
      render: (assignedTo?: string) => assignedTo || <span style={{ color: '#999' }}>未分配</span>,
    },
    {
      title: '回复数',
      dataIndex: 'replyCount',
      key: 'replyCount',
      width: 80,
      render: (count: number) => (
        <Badge count={count} showZero />
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 120,
      render: (rating?: number) => (
        rating ? <Rate disabled value={rating} /> : <span style={{ color: '#999' }}>未评分</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right' as const,
      render: (_: any, record: Ticket) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => handleReply(record)}
          >
            回复
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总工单数"
              value={statistics?.total || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理"
              value={statistics?.byStatus.open || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="处理中"
              value={statistics?.byStatus.in_progress || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已解决"
              value={statistics?.byStatus.resolved || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="工单管理"
        extra={
          <Space>
            <Select
              placeholder="状态"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
              allowClear
            >
              <Select.Option value="open">待处理</Select.Option>
              <Select.Option value="in_progress">处理中</Select.Option>
              <Select.Option value="pending">待用户反馈</Select.Option>
              <Select.Option value="resolved">已解决</Select.Option>
              <Select.Option value="closed">已关闭</Select.Option>
            </Select>
            <Select
              placeholder="优先级"
              value={filterPriority}
              onChange={setFilterPriority}
              style={{ width: 120 }}
              allowClear
            >
              <Select.Option value="low">低</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="urgent">紧急</Select.Option>
            </Select>
            <Select
              placeholder="分类"
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 150 }}
              allowClear
            >
              <Select.Option value="technical">技术支持</Select.Option>
              <Select.Option value="billing">账单问题</Select.Option>
              <Select.Option value="account">账户问题</Select.Option>
              <Select.Option value="feature_request">功能请求</Select.Option>
              <Select.Option value="other">其他</Select.Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadTickets}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建工单
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1800 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingTicket ? '编辑工单' : '新建工单'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          {!editingTicket && (
            <Form.Item
              name="userId"
              label="用户ID"
              rules={[{ required: true, message: '请输入用户ID' }]}
            >
              <Input placeholder="请输入用户ID" />
            </Form.Item>
          )}

          <Form.Item
            name="subject"
            label="主题"
            rules={[{ required: true, message: '请输入工单主题' }]}
          >
            <Input placeholder="请输入工单主题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入工单描述' }]}
          >
            <Input.TextArea
              placeholder="请详细描述问题"
              rows={4}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  <Select.Option value="technical">技术支持</Select.Option>
                  <Select.Option value="billing">账单问题</Select.Option>
                  <Select.Option value="account">账户问题</Select.Option>
                  <Select.Option value="feature_request">功能请求</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select placeholder="请选择优先级">
                  <Select.Option value="low">低</Select.Option>
                  <Select.Option value="medium">中</Select.Option>
                  <Select.Option value="high">高</Select.Option>
                  <Select.Option value="urgent">紧急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {editingTicket && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="status" label="状态">
                    <Select placeholder="请选择状态">
                      <Select.Option value="open">待处理</Select.Option>
                      <Select.Option value="in_progress">处理中</Select.Option>
                      <Select.Option value="pending">待用户反馈</Select.Option>
                      <Select.Option value="resolved">已解决</Select.Option>
                      <Select.Option value="closed">已关闭</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="assignedTo" label="分配给">
                    <Input placeholder="请输入客服ID" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Form.Item name="tags" label="标签" tooltip="多个标签用逗号分隔">
            <Input placeholder="如: 紧急, 重要, 多个用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加回复"
        open={isReplyModalVisible}
        onOk={handleSubmitReply}
        onCancel={() => setIsReplyModalVisible(false)}
        width={600}
        okText="提交"
        cancelText="取消"
      >
        <Form form={replyForm} layout="vertical">
          <Form.Item
            name="userId"
            label="用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="请输入用户ID" />
          </Form.Item>

          <Form.Item
            name="type"
            label="回复类型"
            rules={[{ required: true, message: '请选择回复类型' }]}
            initialValue="staff"
          >
            <Select>
              <Select.Option value="user">用户回复</Select.Option>
              <Select.Option value="staff">客服回复</Select.Option>
              <Select.Option value="system">系统消息</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="回复内容"
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <Input.TextArea
              placeholder="请输入回复内容"
              rows={4}
            />
          </Form.Item>

          <Form.Item name="isInternal" valuePropName="checked">
            <Input type="checkbox" /> 内部备注（客户不可见）
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="工单详情"
        open={isDetailDrawerVisible}
        onClose={() => setIsDetailDrawerVisible(false)}
        width={800}
      >
        {selectedTicket && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="工单编号" span={2}>
                {selectedTicket.ticketNumber}
              </Descriptions.Item>
              <Descriptions.Item label="主题" span={2}>
                {selectedTicket.subject}
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color="cyan">{getCategoryLabel(selectedTicket.category)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={getPriorityColor(selectedTicket.priority)}>
                  {getPriorityLabel(selectedTicket.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={getStatusColor(selectedTicket.status)}>
                  {getStatusLabel(selectedTicket.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">
                {selectedTicket.userId}
              </Descriptions.Item>
              <Descriptions.Item label="分配给">
                {selectedTicket.assignedTo || <span style={{ color: '#999' }}>未分配</span>}
              </Descriptions.Item>
              <Descriptions.Item label="回复数">
                {selectedTicket.replyCount}
              </Descriptions.Item>
              <Descriptions.Item label="评分">
                {selectedTicket.rating ? (
                  <Rate disabled value={selectedTicket.rating} />
                ) : (
                  <span style={{ color: '#999' }}>未评分</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedTicket.description}
              </Descriptions.Item>
              {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                <Descriptions.Item label="标签" span={2}>
                  <Space wrap>
                    {selectedTicket.tags.map(tag => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {new Date(selectedTicket.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(selectedTicket.updatedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>回复记录</Divider>

            <Timeline mode="left">
              {ticketReplies.map((reply) => (
                <Timeline.Item
                  key={reply.id}
                  color={getReplyTypeColor(reply.type)}
                  label={new Date(reply.createdAt).toLocaleString('zh-CN')}
                >
                  <Card size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Avatar icon={<UserOutlined />} />
                        <span>{reply.userId}</span>
                        <Tag color={getReplyTypeColor(reply.type)}>
                          {reply.type}
                        </Tag>
                        {reply.isInternal && <Tag color="orange">内部备注</Tag>}
                      </Space>
                      <div>{reply.content}</div>
                    </Space>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default TicketManagement;
