/**
 * 客服工作台 - Agent Workspace
 *
 * 功能:
 * - 实时聊天界面
 * - 会话列表管理
 * - 快捷回复
 * - 客服状态切换
 * - 访客信息查看
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
  Card,
  List,
  Avatar,
  Badge,
  Input,
  Button,
  Space,
  Tag,
  Tooltip,
  Dropdown,
  message,
  Empty,
  Spin,
  Typography,
  Divider,
  Modal,
  Select,
} from 'antd';
import {
  SendOutlined,
  SmileOutlined,
  PaperClipOutlined,
  PhoneOutlined,
  UserOutlined,
  CustomerServiceOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  MenuOutlined,
  SettingOutlined,
  BellOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  getCurrentAgent,
  updateAgentStatus,
  getAgentConversations,
  getConversationMessages,
  getCannedResponses,
  getAvailableAgents,
  transferConversation,
  closeConversation,
  useCannedResponse,
  editMessage,
  revokeMessage,
  type Agent,
  type AgentStatus,
  type Conversation,
  type Message,
  type CannedResponse,
} from '@/services/livechat';
import { useSocketIO } from '@/hooks/useSocketIO';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Text, Paragraph } = Typography;

// 状态配置
const statusConfig: Record<AgentStatus, { color: string; text: string; badge: 'success' | 'warning' | 'default' | 'error' }> = {
  online: { color: '#52c41a', text: '在线', badge: 'success' },
  busy: { color: '#faad14', text: '忙碌', badge: 'warning' },
  away: { color: '#d9d9d9', text: '离开', badge: 'default' },
  offline: { color: '#ff4d4f', text: '离线', badge: 'error' },
};

const AgentWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 状态
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<string>();
  const [searchText, setSearchText] = useState('');

  // 消息编辑状态
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // WebSocket 连接
  const { socket, connected: isConnected } = useSocketIO();

  // 获取当前客服信息
  const { data: currentAgent, isLoading: agentLoading } = useQuery({
    queryKey: ['livechat-current-agent'],
    queryFn: getCurrentAgent,
    retry: false,
  });

  // 获取客服的会话列表
  const { data: conversations = [], isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['livechat-agent-conversations'],
    queryFn: getAgentConversations,
    enabled: !!currentAgent,
    refetchInterval: 30000, // 30秒刷新一次
  });

  // 获取会话消息
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['livechat-messages', selectedConversation?.id],
    queryFn: () => selectedConversation ? getConversationMessages(selectedConversation.id) : Promise.resolve([]),
    enabled: !!selectedConversation,
    refetchInterval: 5000, // 5秒刷新消息
  });

  // 获取快捷回复
  const { data: cannedResponses = [] } = useQuery({
    queryKey: ['livechat-canned-responses'],
    queryFn: getCannedResponses,
    enabled: !!currentAgent,
  });

  // 获取可用客服（用于转接）
  const { data: availableAgents = [] } = useQuery({
    queryKey: ['livechat-available-agents'],
    queryFn: getAvailableAgents,
    enabled: transferModalVisible,
  });

  // 更新客服状态
  const updateStatusMutation = useMutation({
    mutationFn: updateAgentStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livechat-current-agent'] });
      message.success('状态已更新');
    },
    onError: () => {
      message.error('状态更新失败');
    },
  });

  // 转接会话
  const transferMutation = useMutation({
    mutationFn: ({ conversationId, targetAgentId }: { conversationId: string; targetAgentId: string }) =>
      transferConversation(conversationId, targetAgentId),
    onSuccess: () => {
      message.success('会话已转接');
      setTransferModalVisible(false);
      setTargetAgentId(undefined);
      setSelectedConversation(null);
      refetchConversations();
    },
    onError: () => {
      message.error('转接失败');
    },
  });

  // 关闭会话
  const closeMutation = useMutation({
    mutationFn: closeConversation,
    onSuccess: () => {
      message.success('会话已关闭');
      setSelectedConversation(null);
      refetchConversations();
    },
    onError: () => {
      message.error('关闭失败');
    },
  });

  // 使用快捷回复
  const useCannedMutation = useMutation({
    mutationFn: useCannedResponse,
  });

  // 编辑消息
  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      editMessage(messageId, content),
    onSuccess: (updatedMessage) => {
      // 更新本地消息
      setLocalMessages(prev => prev.map(msg =>
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
      setEditingMessageId(null);
      setEditingContent('');
      message.success('消息已编辑');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '编辑失败');
    },
  });

  // 撤回消息
  const revokeMessageMutation = useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason?: string }) =>
      revokeMessage(messageId, reason),
    onSuccess: (updatedMessage) => {
      // 更新本地消息
      setLocalMessages(prev => prev.map(msg =>
        msg.id === updatedMessage.id ? { ...msg, isDeleted: true, content: '[消息已撤回]' } : msg
      ));
      message.success('消息已撤回');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '撤回失败');
    },
  });

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, scrollToBottom]);

  // 同步本地消息和远程消息
  useEffect(() => {
    if (messages.length > 0) {
      setLocalMessages(messages);
    }
  }, [messages]);

  // WebSocket 消息监听
  useEffect(() => {
    if (!socket) return;

    // 监听新消息
    socket.on('message', (data: Message) => {
      if (data.conversationId === selectedConversation?.id) {
        refetchMessages();
      }
      // 播放提示音
      if (data.sender === 'visitor') {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      }
    });

    // 监听会话分配
    socket.on('conversation_assigned', () => {
      refetchConversations();
      message.info('您有新的会话');
    });

    // 监听会话转接
    socket.on('conversation_transferred', () => {
      refetchConversations();
    });

    // 监听消息编辑
    socket.on('message_edited', (data: { messageId: string; content: string; editedAt: string }) => {
      setLocalMessages(prev => prev.map(msg =>
        msg.id === data.messageId
          ? { ...msg, content: data.content, isEdited: true, editedAt: data.editedAt }
          : msg
      ));
    });

    // 监听消息撤回
    socket.on('message_revoked', (data: { messageId: string; revokedAt: string }) => {
      setLocalMessages(prev => prev.map(msg =>
        msg.id === data.messageId
          ? { ...msg, isDeleted: true, content: '[消息已撤回]', deletedAt: data.revokedAt }
          : msg
      ));
    });

    return () => {
      socket.off('message');
      socket.off('conversation_assigned');
      socket.off('conversation_transferred');
      socket.off('message_edited');
      socket.off('message_revoked');
    };
  }, [socket, selectedConversation, refetchMessages, refetchConversations]);

  // 发送消息
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedConversation) return;

    // 通过 WebSocket 发送消息
    if (socket && isConnected) {
      socket.emit('send_message', {
        conversationId: selectedConversation.id,
        content: inputMessage.trim(),
        type: 'text',
      });
    }

    setInputMessage('');
    inputRef.current?.focus();

    // 刷新消息列表
    setTimeout(() => refetchMessages(), 500);
  };

  // 选择快捷回复
  const handleSelectCannedResponse = (response: CannedResponse) => {
    setInputMessage(response.content);
    setShowCannedResponses(false);
    useCannedMutation.mutate(response.id);
    inputRef.current?.focus();
  };

  // 过滤会话
  const filteredConversations = conversations.filter((conv) =>
    !searchText ||
    conv.visitorName?.toLowerCase().includes(searchText.toLowerCase()) ||
    conv.subject?.toLowerCase().includes(searchText.toLowerCase())
  );

  // 检查消息是否可以编辑/撤回（2分钟内）
  const canEditOrRevoke = (msg: Message) => {
    if (msg.isDeleted) return false;
    if (msg.sender !== 'agent') return false;
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    return new Date(msg.createdAt).getTime() > twoMinutesAgo;
  };

  // 开始编辑消息
  const handleStartEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  // 提交编辑
  const handleSubmitEdit = () => {
    if (!editingMessageId || !editingContent.trim()) return;
    editMessageMutation.mutate({
      messageId: editingMessageId,
      content: editingContent.trim(),
    });
  };

  // 撤回消息
  const handleRevokeMessage = (msg: Message) => {
    Modal.confirm({
      title: '确认撤回',
      content: '撤回后，所有人将看不到这条消息。确定要撤回吗？',
      okText: '撤回',
      okType: 'danger',
      onOk: () => {
        revokeMessageMutation.mutate({ messageId: msg.id });
      },
    });
  };

  // 消息操作菜单
  const getMessageMenuItems = (msg: Message) => {
    if (!canEditOrRevoke(msg)) return [];
    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => handleStartEdit(msg),
      },
      {
        key: 'revoke',
        icon: <DeleteOutlined />,
        label: '撤回',
        danger: true,
        onClick: () => handleRevokeMessage(msg),
      },
    ];
  };

  // 状态下拉菜单
  const statusMenuItems = Object.entries(statusConfig).map(([key, config]) => ({
    key,
    label: (
      <Space>
        <Badge status={config.badge} />
        {config.text}
      </Space>
    ),
    onClick: () => updateStatusMutation.mutate(key as AgentStatus),
  }));

  // 如果不是客服，显示提示
  if (!agentLoading && !currentAgent) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Empty
          description={
            <span>
              您还不是客服人员
              <br />
              请联系管理员分配客服权限
            </span>
          }
        />
      </div>
    );
  }

  return (
    <Layout style={{ height: 'calc(100vh - 120px)', background: '#fff' }}>
      {/* 左侧会话列表 */}
      <Sider width={320} style={{ background: '#f5f5f5', borderRight: '1px solid #e8e8e8' }}>
        {/* 客服信息和状态 */}
        <div style={{ padding: 16, background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Avatar icon={<CustomerServiceOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <div>
                <Text strong>{currentAgent?.displayName || '客服'}</Text>
                <br />
                <Dropdown menu={{ items: statusMenuItems }} trigger={['click']}>
                  <Tag
                    color={statusConfig[currentAgent?.status || 'offline'].color}
                    style={{ cursor: 'pointer' }}
                  >
                    {statusConfig[currentAgent?.status || 'offline'].text}
                  </Tag>
                </Dropdown>
              </div>
            </Space>
            <Space>
              <Tooltip title="设置">
                <Button type="text" icon={<SettingOutlined />} />
              </Tooltip>
              <Badge count={conversations.filter((c) => c.status === 'waiting').length}>
                <Tooltip title="通知">
                  <Button type="text" icon={<BellOutlined />} />
                </Tooltip>
              </Badge>
            </Space>
          </Space>
        </div>

        {/* 搜索框 */}
        <div style={{ padding: '12px 16px' }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索会话..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>

        {/* 会话列表 */}
        <div style={{ height: 'calc(100% - 140px)', overflow: 'auto' }}>
          {conversationsLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin />
            </div>
          ) : filteredConversations.length === 0 ? (
            <Empty description="暂无会话" style={{ marginTop: 40 }} />
          ) : (
            <List
              dataSource={filteredConversations}
              renderItem={(conversation) => (
                <List.Item
                  onClick={() => setSelectedConversation(conversation)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedConversation?.id === conversation.id ? '#e6f7ff' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={conversation.status === 'active'} offset={[-4, 28]}>
                        <Avatar icon={<UserOutlined />} />
                      </Badge>
                    }
                    title={
                      <Space>
                        <Text ellipsis style={{ maxWidth: 120 }}>
                          {conversation.visitorName || '匿名访客'}
                        </Text>
                        {conversation.status === 'waiting' && (
                          <Tag color="warning" style={{ marginLeft: 4 }}>
                            等待中
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                          {conversation.subject || '新会话'}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {dayjs(conversation.updatedAt).fromNow()}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Sider>

      {/* 中间聊天区域 */}
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            {/* 会话头部 */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e8e8e8',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Space>
                <Avatar icon={<UserOutlined />} />
                <div>
                  <Text strong>{selectedConversation.visitorName || '匿名访客'}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {selectedConversation.subject || '咨询'}
                  </Text>
                </div>
              </Space>
              <Space>
                <Tooltip title="转接">
                  <Button
                    icon={<SwapOutlined />}
                    onClick={() => setTransferModalVisible(true)}
                  />
                </Tooltip>
                <Tooltip title="关闭会话">
                  <Button
                    icon={<CloseCircleOutlined />}
                    danger
                    onClick={() => {
                      Modal.confirm({
                        title: '确认关闭会话',
                        content: '关闭后将无法继续对话，确定要关闭吗？',
                        onOk: () => closeMutation.mutate(selectedConversation.id),
                      });
                    }}
                  />
                </Tooltip>
              </Space>
            </div>

            {/* 消息列表 */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 16,
                background: '#f5f5f5',
              }}
            >
              {messagesLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <Spin />
                </div>
              ) : localMessages.length === 0 ? (
                <Empty description="暂无消息" />
              ) : (
                localMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.sender === 'agent' ? 'flex-end' : 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    {msg.sender !== 'agent' && (
                      <Avatar
                        icon={msg.sender === 'visitor' ? <UserOutlined /> : <CustomerServiceOutlined />}
                        style={{
                          marginRight: 8,
                          backgroundColor: msg.sender === 'visitor' ? '#1890ff' : '#722ed1',
                        }}
                      />
                    )}
                    <div style={{ maxWidth: '60%', position: 'relative' }}>
                      {/* 编辑模式 */}
                      {editingMessageId === msg.id ? (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: '#fff',
                            border: '2px solid #1890ff',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          }}
                        >
                          <Input.TextArea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            style={{ marginBottom: 8 }}
                          />
                          <Space>
                            <Button size="small" onClick={handleCancelEdit}>
                              取消
                            </Button>
                            <Button
                              type="primary"
                              size="small"
                              onClick={handleSubmitEdit}
                              loading={editMessageMutation.isPending}
                            >
                              保存
                            </Button>
                          </Space>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: msg.isDeleted ? '#f5f5f5' : (msg.sender === 'agent' ? '#1890ff' : '#fff'),
                            color: msg.isDeleted ? '#999' : (msg.sender === 'agent' ? '#fff' : '#000'),
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            fontStyle: msg.isDeleted ? 'italic' : 'normal',
                          }}
                        >
                          <div>{msg.content}</div>
                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 4,
                              opacity: 0.7,
                              textAlign: 'right',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 4,
                            }}
                          >
                            {msg.isEdited && !msg.isDeleted && (
                              <Tooltip title={`编辑于 ${dayjs(msg.editedAt).format('HH:mm:ss')}`}>
                                <span style={{ cursor: 'pointer' }}>
                                  <EditOutlined style={{ fontSize: 10 }} /> 已编辑
                                </span>
                              </Tooltip>
                            )}
                            {dayjs(msg.createdAt).format('HH:mm')}
                          </div>
                        </div>
                      )}
                      {/* 消息操作菜单（仅客服消息且可编辑/撤回时显示） */}
                      {msg.sender === 'agent' && canEditOrRevoke(msg) && editingMessageId !== msg.id && (
                        <Dropdown
                          menu={{ items: getMessageMenuItems(msg) }}
                          trigger={['click']}
                          placement="bottomRight"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<MoreOutlined />}
                            style={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              background: '#fff',
                              borderRadius: '50%',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              opacity: 0.8,
                            }}
                            className="message-actions-btn"
                          />
                        </Dropdown>
                      )}
                    </div>
                    {msg.sender === 'agent' && (
                      <Avatar
                        icon={<CustomerServiceOutlined />}
                        style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                      />
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div style={{ padding: 16, borderTop: '1px solid #e8e8e8' }}>
              {/* 快捷回复 */}
              {showCannedResponses && (
                <Card
                  size="small"
                  title="快捷回复"
                  extra={
                    <Button type="text" size="small" onClick={() => setShowCannedResponses(false)}>
                      关闭
                    </Button>
                  }
                  style={{ marginBottom: 12 }}
                >
                  <List
                    size="small"
                    dataSource={cannedResponses.slice(0, 5)}
                    renderItem={(item) => (
                      <List.Item
                        onClick={() => handleSelectCannedResponse(item)}
                        style={{ cursor: 'pointer', padding: '4px 0' }}
                      >
                        <Text ellipsis style={{ maxWidth: '100%' }}>
                          <Text type="secondary">[{item.shortcut || item.title}]</Text> {item.content}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              <Space.Compact style={{ width: '100%' }}>
                <Tooltip title="快捷回复">
                  <Button
                    icon={<MenuOutlined />}
                    onClick={() => setShowCannedResponses(!showCannedResponses)}
                  />
                </Tooltip>
                <Tooltip title="表情">
                  <Button icon={<SmileOutlined />} />
                </Tooltip>
                <Tooltip title="附件">
                  <Button icon={<PaperClipOutlined />} />
                </Tooltip>
                <TextArea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                >
                  发送
                </Button>
              </Space.Compact>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Empty description="选择一个会话开始聊天" />
          </div>
        )}
      </Content>

      {/* 右侧访客信息（可选） */}
      {selectedConversation && (
        <Sider width={280} style={{ background: '#fff', borderLeft: '1px solid #e8e8e8', padding: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Avatar size={64} icon={<UserOutlined />} />
            <div style={{ marginTop: 8 }}>
              <Text strong>{selectedConversation.visitorName || '匿名访客'}</Text>
            </div>
          </div>

          <Divider />

          <div>
            <Paragraph>
              <Text type="secondary">会话ID:</Text>
              <br />
              <Text copyable style={{ fontSize: 12 }}>
                {selectedConversation.id}
              </Text>
            </Paragraph>
            <Paragraph>
              <Text type="secondary">开始时间:</Text>
              <br />
              <Text>{dayjs(selectedConversation.startedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </Paragraph>
            <Paragraph>
              <Text type="secondary">优先级:</Text>
              <br />
              <Tag
                color={
                  selectedConversation.priority === 'urgent'
                    ? 'red'
                    : selectedConversation.priority === 'high'
                    ? 'orange'
                    : 'blue'
                }
              >
                {selectedConversation.priority === 'urgent'
                  ? '紧急'
                  : selectedConversation.priority === 'high'
                  ? '高'
                  : selectedConversation.priority === 'normal'
                  ? '普通'
                  : '低'}
              </Tag>
            </Paragraph>
            {selectedConversation.tags?.length > 0 && (
              <Paragraph>
                <Text type="secondary">标签:</Text>
                <br />
                <Space wrap>
                  {selectedConversation.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Paragraph>
            )}
          </div>

          <Divider />

          <div>
            <Text strong>快捷操作</Text>
            <div style={{ marginTop: 8 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button block icon={<SwapOutlined />} onClick={() => setTransferModalVisible(true)}>
                  转接会话
                </Button>
                <Button
                  block
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: '确认关闭会话',
                      content: '关闭后将无法继续对话，确定要关闭吗？',
                      onOk: () => closeMutation.mutate(selectedConversation.id),
                    });
                  }}
                >
                  关闭会话
                </Button>
              </Space>
            </div>
          </div>
        </Sider>
      )}

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
        <p>将当前会话转接给其他客服：</p>
        <Select
          placeholder="选择目标客服"
          style={{ width: '100%' }}
          value={targetAgentId}
          onChange={setTargetAgentId}
        >
          {availableAgents
            .filter((a) => a.id !== currentAgent?.id)
            .map((agent) => (
              <Select.Option key={agent.id} value={agent.id}>
                <Space>
                  <Badge status={agent.isOnline ? 'success' : 'default'} />
                  {agent.displayName}
                  <Text type="secondary">
                    ({agent.currentChats}/{agent.maxConcurrentChats})
                  </Text>
                </Space>
              </Select.Option>
            ))}
        </Select>
      </Modal>
    </Layout>
  );
};

export default AgentWorkspace;
