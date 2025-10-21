import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Timeline,
  Input,
  Upload,
  message,
  Spin,
  Descriptions,
  Avatar,
  Divider,
  Alert,
  Empty,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PaperClipOutlined,
  SendOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  getTicketDetail,
  getTicketReplies,
  addTicketReply,
  closeTicket,
  reopenTicket,
  uploadAttachment,
  TicketType,
  TicketPriority,
  TicketStatus,
  type Ticket,
  type TicketReply,
  type Attachment,
} from '@/services/ticket';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { TextArea } = Input;

// 工单类型配置
const ticketTypeConfig = {
  [TicketType.TECHNICAL]: { label: '技术问题', color: 'blue' },
  [TicketType.BILLING]: { label: '账单问题', color: 'orange' },
  [TicketType.DEVICE]: { label: '设备问题', color: 'purple' },
  [TicketType.APP]: { label: '应用问题', color: 'cyan' },
  [TicketType.FEATURE]: { label: '功能建议', color: 'green' },
  [TicketType.OTHER]: { label: '其他', color: 'default' },
};

// 优先级配置
const priorityConfig = {
  [TicketPriority.LOW]: { label: '低', color: 'default' },
  [TicketPriority.MEDIUM]: { label: '中', color: 'blue' },
  [TicketPriority.HIGH]: { label: '高', color: 'orange' },
  [TicketPriority.URGENT]: { label: '紧急', color: 'red' },
};

// 状态配置
const statusConfig = {
  [TicketStatus.OPEN]: { label: '待处理', color: 'warning' },
  [TicketStatus.IN_PROGRESS]: { label: '处理中', color: 'processing' },
  [TicketStatus.WAITING]: { label: '等待回复', color: 'default' },
  [TicketStatus.RESOLVED]: { label: '已解决', color: 'success' },
  [TicketStatus.CLOSED]: { label: '已关闭', color: 'default' },
};

const TicketDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);

  // 加载工单详情
  const loadTicketDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getTicketDetail(id);
      setTicket(data);
    } catch (error: any) {
      message.error(error.message || '加载工单详情失败');
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  // 加载回复列表
  const loadReplies = async () => {
    if (!id) return;

    setRepliesLoading(true);
    try {
      const data = await getTicketReplies(id);
      setReplies(data);
    } catch (error: any) {
      message.error(error.message || '加载回复列表失败');
    } finally {
      setRepliesLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTicketDetail();
    loadReplies();
  }, [id]);

  // 处理文件上传
  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    try {
      const attachment = await uploadAttachment(file);
      setUploadedAttachments([...uploadedAttachments, attachment]);
      onSuccess(attachment);
      message.success('文件上传成功');
    } catch (error) {
      onError(error);
      message.error('文件上传失败');
    }
  };

  // 提交回复
  const handleSubmitReply = async () => {
    if (!id || !replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }

    setSubmitLoading(true);
    try {
      await addTicketReply(id, {
        content: replyContent,
        attachmentIds: uploadedAttachments.map((att) => att.id),
      });

      message.success('回复已提交');
      setReplyContent('');
      setFileList([]);
      setUploadedAttachments([]);
      await loadReplies();
    } catch (error: any) {
      message.error(error.message || '提交回复失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 关闭工单
  const handleCloseTicket = () => {
    if (!id) return;

    Modal.confirm({
      title: '确认关闭工单',
      content: '关闭后将无法继续回复，确定要关闭吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await closeTicket(id);
          message.success('工单已关闭');
          await loadTicketDetail();
        } catch (error: any) {
          message.error(error.message || '关闭工单失败');
        }
      },
    });
  };

  // 重新打开工单
  const handleReopenTicket = async () => {
    if (!id) return;

    try {
      await reopenTicket(id);
      message.success('工单已重新打开');
      await loadTicketDetail();
    } catch (error: any) {
      message.error(error.message || '重新打开工单失败');
    }
  };

  // 刷新
  const handleRefresh = () => {
    loadTicketDetail();
    loadReplies();
  };

  if (loading || !ticket) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/tickets')}
            >
              返回列表
            </Button>
            <Divider type="vertical" />
            <h2 style={{ margin: 0 }}>#{ticket.id.slice(0, 8)} - {ticket.title}</h2>
          </Space>

          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              刷新
            </Button>

            {ticket.status === TicketStatus.CLOSED ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleReopenTicket}
              >
                重新打开
              </Button>
            ) : (
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleCloseTicket}
              >
                关闭工单
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      {/* 工单信息 */}
      <Card title="工单信息" style={{ marginBottom: '16px' }}>
        <Descriptions column={2}>
          <Descriptions.Item label="状态">
            <Tag color={statusConfig[ticket.status]?.color}>
              {statusConfig[ticket.status]?.label}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="优先级">
            <Tag color={priorityConfig[ticket.priority]?.color}>
              {priorityConfig[ticket.priority]?.label}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="类型">
            <Tag color={ticketTypeConfig[ticket.type]?.color}>
              {ticketTypeConfig[ticket.type]?.label}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="创建时间">
            {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            {' '}
            ({dayjs(ticket.createdAt).fromNow()})
          </Descriptions.Item>

          {ticket.assignedToName && (
            <Descriptions.Item label="处理人">
              {ticket.assignedToName}
            </Descriptions.Item>
          )}

          {ticket.tags && ticket.tags.length > 0 && (
            <Descriptions.Item label="标签" span={2}>
              {ticket.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Descriptions.Item>
          )}

          <Descriptions.Item label="问题描述" span={2}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
          </Descriptions.Item>

          {ticket.attachments && ticket.attachments.length > 0 && (
            <Descriptions.Item label="附件" span={2}>
              <Space wrap>
                {ticket.attachments.map((att) => (
                  <Button
                    key={att.id}
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(att.url, '_blank')}
                  >
                    {att.filename}
                  </Button>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 回复列表 */}
      <Card
        title={`回复记录 (${replies.length})`}
        style={{ marginBottom: '16px' }}
        loading={repliesLoading}
      >
        {replies.length > 0 ? (
          <Timeline>
            {replies.map((reply) => (
              <Timeline.Item
                key={reply.id}
                color={reply.isStaff ? 'blue' : 'green'}
                dot={
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    src={reply.userAvatar}
                    style={{
                      backgroundColor: reply.isStaff ? '#1890ff' : '#52c41a',
                    }}
                  />
                }
              >
                <div>
                  <Space>
                    <strong>{reply.userName}</strong>
                    {reply.isStaff && <Tag color="blue">客服</Tag>}
                    <span style={{ color: '#999', fontSize: '12px' }}>
                      {dayjs(reply.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      {' '}
                      ({dayjs(reply.createdAt).fromNow()})
                    </span>
                  </Space>

                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: reply.isStaff ? '#e6f7ff' : '#f6ffed',
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {reply.content}
                  </div>

                  {reply.attachments && reply.attachments.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <Space wrap>
                        {reply.attachments.map((att) => (
                          <Button
                            key={att.id}
                            size="small"
                            icon={<PaperClipOutlined />}
                            onClick={() => window.open(att.url, '_blank')}
                          >
                            {att.filename}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Empty description="暂无回复" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* 添加回复 */}
      {ticket.status !== TicketStatus.CLOSED && (
        <Card title="添加回复">
          <TextArea
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="输入您的回复..."
            maxLength={2000}
            showCount
          />

          <div style={{ marginTop: '16px' }}>
            <Space>
              <Upload
                fileList={fileList}
                customRequest={handleUpload}
                onChange={({ fileList }) => setFileList(fileList)}
                onRemove={(file) => {
                  const att = uploadedAttachments.find(
                    (a) => a.id === file.response?.id
                  );
                  if (att) {
                    setUploadedAttachments(
                      uploadedAttachments.filter((a) => a.id !== att.id)
                    );
                  }
                }}
                accept="image/*,.pdf,.doc,.docx,.txt,.log"
                maxCount={3}
              >
                <Button icon={<PaperClipOutlined />}>添加附件</Button>
              </Upload>

              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitReply}
                loading={submitLoading}
              >
                提交回复
              </Button>
            </Space>
          </div>

          <Alert
            message="提示"
            description="您的回复会立即通知客服团队，我们会尽快为您处理。"
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Card>
      )}
    </div>
  );
};

export default TicketDetail;
