/**
 * LiveChat 会话监控页面
 *
 * 功能:
 * - 实时查看所有会话
 * - 筛选会话状态 (等待/进行中/已解决/已关闭)
 * - 分配/转接会话
 * - 查看会话详情和消息历史
 * - 强制关闭会话
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Badge,
  Select,
  Input,
  Drawer,
  List,
  Avatar,
  Typography,
  Divider,
  Empty,
} from 'antd';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  ReloadOutlined,
  EyeOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  MessageOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  getConversations,
  getConversationMessages,
  getAvailableAgents,
  assignAgent,
  transferConversation,
  closeConversation,
  getWaitingStats,
  getActiveStats,
  type Conversation,
  type Message,
  type Agent,
  type ConversationStatus,
} from '@/services/livechat';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Option } = Select;
const { Text, Paragraph } = Typography;

const ConversationsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // 状态管理
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | undefined>();
  const [searchText, setSearchText] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<string | undefined>();

  // 获取会话列表
  const { data: conversations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['livechat-conversations', statusFilter],
    queryFn: () => getConversations({ status: statusFilter, limit: 100 }),
    refetchInterval: 10000, // 10秒刷新一次
  });

  // 快捷键支持 (会话监控页面没有新建功能，只支持刷新)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  // 获取等待统计
  const { data: waitingStats } = useQuery({
    queryKey: ['livechat-waiting-stats'],
    queryFn: getWaitingStats,
    refetchInterval: 10000,
  });

  // 获取活跃统计
  const { data: activeStats } = useQuery({
    queryKey: ['livechat-active-stats'],
    queryFn: getActiveStats,
    refetchInterval: 10000,
  });

  // 获取可用客服列表
  const { data: availableAgents = [] } = useQuery({
    queryKey: ['livechat-available-agents'],
    queryFn: getAvailableAgents,
  });

  // 获取会话消息
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['livechat-messages', selectedConversation?.id],
    queryFn: () =>
      selectedConversation ? getConversationMessages(selectedConversation.id) : Promise.resolve([]),
    enabled: !!selectedConversation,
  });

  // 统计数据
  const stats = useMemo(() => {
    const total = conversations.length;
    const waiting = conversations.filter((c) => c.status === 'waiting').length;
    const active = conversations.filter((c) => c.status === 'active').length;
    const resolved = conversations.filter((c) => c.status === 'resolved').length;
    return { total, waiting, active, resolved };
  }, [conversations]);

  // 过滤后的数据
  const filteredConversations = useMemo(() => {
    if (!searchText) return conversations;
    return conversations.filter(
      (c) =>
        c.visitorName?.toLowerCase().includes(searchText.toLowerCase()) ||
        c.subject?.toLowerCase().includes(searchText.toLowerCase()) ||
        c.id.includes(searchText)
    );
  }, [conversations, searchText]);

  // 分配客服
  const assignMutation = useMutation({
    mutationFn: ({ conversationId, agentId }: { conversationId: string; agentId: string }) =>
      assignAgent(conversationId, agentId),
    onSuccess: () => {
      message.success('分配成功');
      queryClient.invalidateQueries({ queryKey: ['livechat-conversations'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '分配失败');
    },
  });

  // 转接会话
  const transferMutation = useMutation({
    mutationFn: ({
      conversationId,
      targetAgentId,
    }: {
      conversationId: string;
      targetAgentId: string;
    }) => transferConversation(conversationId, targetAgentId),
    onSuccess: () => {
      message.success('转接成功');
      setTransferModalVisible(false);
      setTargetAgentId(undefined);
      queryClient.invalidateQueries({ queryKey: ['livechat-conversations'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '转接失败');
    },
  });

  // 关闭会话
  const closeMutation = useMutation({
    mutationFn: closeConversation,
    onSuccess: () => {
      message.success('会话已关闭');
      queryClient.invalidateQueries({ queryKey: ['livechat-conversations'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '关闭失败');
    },
  });

  // 打开会话详情
  const handleViewDetail = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setDetailDrawerVisible(true);
  };

  // 打开转接弹窗
  const handleOpenTransfer = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setTransferModalVisible(true);
  };

  // 状态标签渲染
  const renderStatusTag = (status: ConversationStatus) => {
    const statusMap: Record<ConversationStatus, { color: string; text: string; icon: React.ReactNode }> = {
      waiting: { color: 'warning', text: '等待中', icon: <ClockCircleOutlined /> },
      active: { color: 'processing', text: '进行中', icon: <MessageOutlined /> },
      resolved: { color: 'success', text: '已解决', icon: <CheckCircleOutlined /> },
      closed: { color: 'default', text: '已关闭', icon: <CloseCircleOutlined /> },
    };
    const config = statusMap[status] || { color: 'default', text: status, icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 优先级标签
  const renderPriorityTag = (priority: string) => {
    const priorityMap: Record<string, { color: string; text: string }> = {
      urgent: { color: 'red', text: '紧急' },
      high: { color: 'orange', text: '高' },
      normal: { color: 'blue', text: '普通' },
      low: { color: 'default', text: '低' },
    };
    const config = priorityMap[priority] || { color: 'default', text: priority };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 消息发送者头像
  const renderSenderAvatar = (sender: string) => {
    if (sender === 'visitor') {
      return <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />;
    }
    if (sender === 'agent') {
      return <Avatar icon={<CustomerServiceOutlined />} style={{ backgroundColor: '#52c41a' }} />;
    }
    if (sender === 'ai') {
      return <Avatar style={{ backgroundColor: '#722ed1' }}>AI</Avatar>;
    }
    return <Avatar style={{ backgroundColor: '#d9d9d9' }}>系统</Avatar>;
  };

  // 表格列定义
  const columns: ColumnsType<Conversation> = [
    {
      title: '会话ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Tooltip title={id}>
          <span style={{ fontFamily: 'monospace' }}>{id.slice(0, 8)}...</span>
        </Tooltip>
      ),
    },
    {
      title: '访客',
      key: 'visitor',
      width: 150,
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <span>{record.visitorName || '匿名访客'}</span>
        </Space>
      ),
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
      render: (subject: string) => subject || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '等待中', value: 'waiting' },
        { text: '进行中', value: 'active' },
        { text: '已解决', value: 'resolved' },
        { text: '已关闭', value: 'closed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: ConversationStatus) => renderStatusTag(status),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => renderPriorityTag(priority),
    },
    {
      title: '客服',
      key: 'agent',
      width: 140,
      render: (_, record) =>
        record.agent ? (
          <Space>
            <Badge status={record.agent.isOnline ? 'success' : 'default'} />
            <span>{record.agent.displayName}</span>
          </Space>
        ) : (
          <Tag color="orange">未分配</Tag>
        ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 80,
      render: (rating: number) => (rating ? <span>⭐ {rating}</span> : '-'),
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 140,
      sorter: (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(date).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {record.status === 'waiting' && (
            <Select
              size="small"
              placeholder="分配"
              style={{ width: 80 }}
              onChange={(agentId) =>
                assignMutation.mutate({ conversationId: record.id, agentId })
              }
              loading={assignMutation.isPending}
            >
              {availableAgents.map((agent) => (
                <Option key={agent.id} value={agent.id}>
                  {agent.displayName}
                </Option>
              ))}
            </Select>
          )}
          {record.status === 'active' && (
            <>
              <Tooltip title="转接">
                <Button
                  type="text"
                  icon={<SwapOutlined />}
                  onClick={() => handleOpenTransfer(record)}
                />
              </Tooltip>
              <Tooltip title="关闭">
                <Button
                  type="text"
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => closeMutation.mutate(record.id)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ErrorBoundary boundaryName="ConversationsPage">
    <div>
      <h2>
        <MessageOutlined style={{ marginRight: 8 }} />
        会话监控
        <Tag
          icon={<ReloadOutlined spin={isLoading} />}
          color="processing"
          style={{ marginLeft: 12, cursor: 'pointer' }}
          onClick={() => refetch()}
        >
          Ctrl+R 刷新
        </Tag>
      </h2>

      {/* 实时统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="总会话" value={stats.total} prefix={<MessageOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="等待中"
              value={waitingStats?.count || stats.waiting}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="进行中"
              value={activeStats?.count || stats.active}
              valueStyle={{ color: '#1890ff' }}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已解决"
              value={stats.resolved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索访客名/主题/ID"
            allowClear
            style={{ width: 240 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="waiting">等待中</Option>
            <Option value="active">进行中</Option>
            <Option value="resolved">已解决</Option>
            <Option value="closed">已关闭</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>

        <LoadingState
          loading={isLoading}
          error={error}
          empty={!isLoading && !error && filteredConversations.length === 0}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无会话"
        >
          <Table
            columns={columns}
            dataSource={filteredConversations}
            rowKey="id"
            loading={false}
            scroll={{ x: 1400 }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </LoadingState>
      </Card>

      {/* 会话详情抽屉 */}
      <Drawer
        title={
          <Space>
            <MessageOutlined />
            会话详情
            {selectedConversation && renderStatusTag(selectedConversation.status)}
          </Space>
        }
        placement="right"
        width={480}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedConversation(null);
        }}
      >
        {selectedConversation && (
          <>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card size="small" title="会话信息">
                <Paragraph>
                  <Text strong>访客:</Text> {selectedConversation.visitorName || '匿名访客'}
                </Paragraph>
                <Paragraph>
                  <Text strong>主题:</Text> {selectedConversation.subject || '-'}
                </Paragraph>
                <Paragraph>
                  <Text strong>客服:</Text> {selectedConversation.agent?.displayName || '未分配'}
                </Paragraph>
                <Paragraph>
                  <Text strong>优先级:</Text> {renderPriorityTag(selectedConversation.priority)}
                </Paragraph>
                <Paragraph>
                  <Text strong>开始时间:</Text>{' '}
                  {dayjs(selectedConversation.startedAt).format('YYYY-MM-DD HH:mm:ss')}
                </Paragraph>
                {selectedConversation.rating && (
                  <Paragraph>
                    <Text strong>评分:</Text> ⭐ {selectedConversation.rating}
                    {selectedConversation.ratingComment && (
                      <Text type="secondary"> - {selectedConversation.ratingComment}</Text>
                    )}
                  </Paragraph>
                )}
              </Card>

              <Card size="small" title="标签">
                {selectedConversation.tags?.length > 0 ? (
                  <Space wrap>
                    {selectedConversation.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">暂无标签</Text>
                )}
              </Card>
            </Space>

            <Divider>消息记录</Divider>

            {messagesLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>加载中...</div>
            ) : messages.length === 0 ? (
              <Empty description="暂无消息" />
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={messages}
                renderItem={(msg: Message) => (
                  <List.Item
                    style={{
                      background:
                        msg.sender === 'visitor'
                          ? '#f5f5f5'
                          : msg.sender === 'ai'
                          ? '#f9f0ff'
                          : 'transparent',
                      padding: '8px 12px',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <List.Item.Meta
                      avatar={renderSenderAvatar(msg.sender)}
                      title={
                        <Space>
                          <Text strong>
                            {msg.sender === 'visitor'
                              ? '访客'
                              : msg.sender === 'agent'
                              ? '客服'
                              : msg.sender === 'ai'
                              ? 'AI助手'
                              : '系统'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(msg.createdAt).format('HH:mm:ss')}
                          </Text>
                        </Space>
                      }
                      description={<Text>{msg.content}</Text>}
                    />
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </Drawer>

      {/* 转接会话弹窗 */}
      <Modal
        title="转接会话"
        open={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          setTargetAgentId(undefined);
        }}
        onOk={() => {
          if (selectedConversation && targetAgentId) {
            transferMutation.mutate({
              conversationId: selectedConversation.id,
              targetAgentId,
            });
          }
        }}
        confirmLoading={transferMutation.isPending}
        okButtonProps={{ disabled: !targetAgentId }}
      >
        <p>将当前会话转接给其他客服:</p>
        <Select
          placeholder="选择目标客服"
          style={{ width: '100%' }}
          value={targetAgentId}
          onChange={setTargetAgentId}
        >
          {availableAgents
            .filter((a) => a.id !== selectedConversation?.agentId)
            .map((agent) => (
              <Option key={agent.id} value={agent.id}>
                <Space>
                  <Badge status={agent.isOnline ? 'success' : 'default'} />
                  {agent.displayName}
                  <Text type="secondary">
                    ({agent.currentChats}/{agent.maxConcurrentChats})
                  </Text>
                </Space>
              </Option>
            ))}
        </Select>
      </Modal>
    </div>
    </ErrorBoundary>
  );
};

export default ConversationsPage;
