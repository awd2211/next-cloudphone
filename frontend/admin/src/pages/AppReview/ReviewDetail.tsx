import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  message,
  Descriptions,
  Tag,
  Image,
  Alert,
  Timeline,
  Modal,
  Form,
  Input,
  Radio,
  Row,
  Col,
  Typography,
  Divider,
  List,
  Avatar,
  Badge,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  getApp,
  approveApp,
  rejectApp,
  requestAppChanges,
  getAppReviewHistory,
} from '@/services/app';
import type { Application, AppReviewRecord } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const AppReviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [reviewHistory, setReviewHistory] = useState<AppReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes'>(
    'approve'
  );
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      loadApp();
      loadReviewHistory();
    }
  }, [id]);

  const loadApp = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getApp(id);
      setApp(res.data);
    } catch (error) {
      message.error('加载应用信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReviewHistory = async () => {
    if (!id) return;
    try {
      const res = await getAppReviewHistory(id);
      setReviewHistory(res.data || []);
    } catch (error) {
      console.error('加载审核历史失败', error);
    }
  };

  const openReviewModal = (action: 'approve' | 'reject' | 'request_changes') => {
    setReviewAction(action);
    setReviewModalVisible(true);
    form.resetFields();
  };

  const handleReview = async (values: any) => {
    if (!id) return;
    try {
      if (reviewAction === 'approve') {
        await approveApp(id, { comment: values.comment });
        message.success('应用已批准');
      } else if (reviewAction === 'reject') {
        await rejectApp(id, { reason: values.reason });
        message.success('应用已拒绝');
      } else {
        await requestAppChanges(id, { changes: values.changes });
        message.success('已要求开发者修改');
      }
      setReviewModalVisible(false);
      loadApp();
      loadReviewHistory();
      setTimeout(() => navigate('/app-review'), 1000);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      pending: {
        color: 'processing',
        icon: <WarningOutlined />,
        text: '待审核',
      },
      approved: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '已批准',
      },
      rejected: {
        color: 'error',
        icon: <CloseCircleOutlined />,
        text: '已拒绝',
      },
      changes_requested: {
        color: 'warning',
        icon: <FileTextOutlined />,
        text: '需修改',
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  const getReviewActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      approve: '批准',
      reject: '拒绝',
      request_changes: '要求修改',
      submit: '提交审核',
    };
    return actionMap[action] || action;
  };

  if (!app) {
    return (
      <div style={{ padding: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/app-review')}
          style={{ marginBottom: 24 }}
        >
          返回列表
        </Button>
        <Alert message="应用不存在" type="error" showIcon />
      </div>
    );
  }

  const statusConfig = getStatusConfig(app.reviewStatus || 'pending');

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/app-review')}
        style={{ marginBottom: 24 }}
      >
        返回审核列表
      </Button>

      <Title level={2}>应用审核详情</Title>

      {/* 审核状态提示 */}
      <Alert
        message={`当前状态: ${statusConfig.text}`}
        description={
          app.reviewStatus === 'pending'
            ? '请仔细审核应用内容，确认是否符合平台规范'
            : app.reviewStatus === 'changes_requested'
              ? '已要求开发者修改，等待重新提交'
              : null
        }
        type={
          app.reviewStatus === 'approved'
            ? 'success'
            : app.reviewStatus === 'rejected'
              ? 'error'
              : app.reviewStatus === 'changes_requested'
                ? 'warning'
                : 'info'
        }
        showIcon
        icon={statusConfig.icon}
        style={{ marginBottom: 24 }}
      />

      <Row gutter={24}>
        {/* 左侧：应用信息 */}
        <Col xs={24} lg={16}>
          <Card title="应用信息" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <div style={{ textAlign: 'center' }}>
                  {app.icon ? (
                    <Image
                      src={app.icon}
                      alt={app.name}
                      width={120}
                      height={120}
                      style={{ borderRadius: 12 }}
                    />
                  ) : (
                    <Avatar
                      size={120}
                      icon={<AppstoreOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  )}
                </div>
              </Col>
              <Col xs={24} sm={16}>
                <Descriptions column={1}>
                  <Descriptions.Item label="应用名称">
                    <Text strong style={{ fontSize: 16 }}>
                      {app.name}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="包名">
                    <Text code>{app.packageName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="版本">{app.version}</Descriptions.Item>
                  <Descriptions.Item label="大小">{formatSize(app.size)}</Descriptions.Item>
                  <Descriptions.Item label="分类">
                    <Tag color="blue">{app.category}</Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>应用描述</Title>
            <Paragraph>{app.description || '暂无描述'}</Paragraph>

            <Title level={5}>应用详情</Title>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="上传者" span={2}>
                {app.uploadedBy || '未知'}
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">
                {dayjs(app.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {dayjs(app.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="APK路径" span={2}>
                <Text copyable ellipsis style={{ maxWidth: 400 }}>
                  {app.apkPath || 'N/A'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 审核检查清单 */}
          <Card title="审核检查清单" style={{ marginBottom: 24 }}>
            <List
              size="small"
              dataSource={[
                { id: 1, text: '应用名称和描述准确、无误导信息', checked: false },
                { id: 2, text: '应用图标清晰、符合规范', checked: false },
                { id: 3, text: '无病毒、恶意代码或安全隐患', checked: false },
                { id: 4, text: '不包含违法违规内容', checked: false },
                { id: 5, text: '功能描述与实际相符', checked: false },
                { id: 6, text: '无侵犯他人知识产权行为', checked: false },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Text>{item.text}</Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 右侧：审核操作和历史 */}
        <Col xs={24} lg={8}>
          {/* 审核操作 */}
          {app.reviewStatus === 'pending' && (
            <Card title="审核操作" style={{ marginBottom: 24 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  block
                  size="large"
                  onClick={() => openReviewModal('approve')}
                >
                  批准应用
                </Button>
                <Button
                  icon={<FileTextOutlined />}
                  block
                  size="large"
                  onClick={() => openReviewModal('request_changes')}
                >
                  要求修改
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  block
                  size="large"
                  onClick={() => openReviewModal('reject')}
                >
                  拒绝应用
                </Button>
              </Space>
            </Card>
          )}

          {/* 审核历史 */}
          <Card
            title={
              <>
                <HistoryOutlined /> 审核历史
              </>
            }
          >
            {reviewHistory.length === 0 ? (
              <Text type="secondary">暂无审核记录</Text>
            ) : (
              <Timeline
                items={reviewHistory.map((record) => ({
                  dot:
                    record.action === 'approve' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : record.action === 'reject' ? (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    ) : (
                      <FileTextOutlined style={{ color: '#faad14' }} />
                    ),
                  children: (
                    <div>
                      <Text strong>{getReviewActionLabel(record.action)}</Text>
                      <br />
                      <Text type="secondary">
                        <UserOutlined /> {record.reviewerName || '审核员'}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                      {record.comment && (
                        <>
                          <br />
                          <Text>{record.comment}</Text>
                        </>
                      )}
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 审核模态框 */}
      <Modal
        title={
          reviewAction === 'approve'
            ? '批准应用'
            : reviewAction === 'reject'
              ? '拒绝应用'
              : '要求修改'
        }
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        onOk={() => form.submit()}
        okText="提交"
        cancelText="取消"
        okButtonProps={{
          danger: reviewAction === 'reject',
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleReview}>
          {reviewAction === 'approve' && (
            <Form.Item label="审核意见" name="comment">
              <TextArea rows={4} placeholder="可选：添加审核意见或建议" />
            </Form.Item>
          )}
          {reviewAction === 'reject' && (
            <Form.Item
              label="拒绝原因"
              name="reason"
              rules={[{ required: true, message: '请输入拒绝原因' }]}
            >
              <TextArea rows={4} placeholder="请详细说明拒绝原因，便于开发者改进" />
            </Form.Item>
          )}
          {reviewAction === 'request_changes' && (
            <Form.Item
              label="修改要求"
              name="changes"
              rules={[{ required: true, message: '请输入修改要求' }]}
            >
              <TextArea rows={4} placeholder="请详细列出需要修改的内容" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AppReviewDetail;
