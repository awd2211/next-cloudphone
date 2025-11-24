/**
 * LiveChat 质检评分页面
 *
 * 功能:
 * - 查看质检记录列表
 * - 创建质检评分
 * - 查看评分详情
 * - 按客服/状态筛选
 */
import React, { useState, useMemo } from 'react';
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
  Select,
  Input,
  Form,
  Rate,
  Drawer,
  Descriptions,
  Progress,
  Avatar,
} from 'antd';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  StarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getQualityReviews,
  createQualityReview,
  getAgents,
  getConversations,
  type QualityReview,
  type Agent,
  type Conversation,
} from '@/services/livechat';

const { Option } = Select;
const { TextArea } = Input;

// 评分类别
const scoreCategories = [
  { key: 'greeting', label: '问候礼仪', description: '开场白是否专业、友好' },
  { key: 'professionalism', label: '专业程度', description: '回答是否准确、专业' },
  { key: 'problemSolving', label: '问题解决', description: '是否有效解决客户问题' },
  { key: 'responseSpeed', label: '响应速度', description: '回复是否及时' },
];

const QualityReviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // 状态管理
  const [statusFilter, setStatusFilter] = useState<string>();
  const [agentFilter, setAgentFilter] = useState<string>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<QualityReview | null>(null);

  // 获取质检列表
  const { data: reviews = [], isLoading, error, refetch } = useQuery({
    queryKey: ['livechat-quality-reviews', statusFilter, agentFilter],
    queryFn: () => getQualityReviews({ status: statusFilter, agentId: agentFilter }),
  });

  // 获取客服列表（用于筛选和创建）
  const { data: agents = [] } = useQuery({
    queryKey: ['livechat-agents'],
    queryFn: () => getAgents(),
  });

  // 获取会话列表（用于创建质检）
  const { data: conversations = [] } = useQuery({
    queryKey: ['livechat-conversations-for-review'],
    queryFn: () => getConversations({ status: 'resolved', limit: 50 }),
    enabled: createModalVisible,
  });

  // 创建质检
  const createMutation = useMutation({
    mutationFn: createQualityReview,
    onSuccess: () => {
      message.success('质检创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-quality-reviews'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  // 统计数据
  const stats = useMemo(() => {
    const total = reviews.length;
    const completed = reviews.filter((r) => r.status === 'completed').length;
    const pending = reviews.filter((r) => r.status === 'pending').length;
    const avgScore = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length
      : 0;
    return { total, completed, pending, avgScore };
  }, [reviews]);

  // 状态标签
  const renderStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      pending: { color: 'warning', text: '待处理', icon: <ClockCircleOutlined /> },
      completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
      disputed: { color: 'error', text: '有争议', icon: <ExclamationCircleOutlined /> },
    };
    const config = statusMap[status] || { color: 'default', text: status, icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 评分展示
  const renderScore = (score: number) => {
    const color = score >= 90 ? '#52c41a' : score >= 70 ? '#faad14' : '#ff4d4f';
    return (
      <span style={{ color, fontWeight: 'bold', fontSize: 16 }}>
        {score}
      </span>
    );
  };

  // 表格列定义
  const columns: ColumnsType<QualityReview> = [
    {
      title: '质检ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Tooltip title={id}>
          <span style={{ fontFamily: 'monospace' }}>{id.slice(0, 8)}...</span>
        </Tooltip>
      ),
    },
    {
      title: '被评客服',
      key: 'agent',
      width: 140,
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<CustomerServiceOutlined />} />
          <span>{record.agentId?.slice(0, 8) || '-'}</span>
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      sorter: (a, b) => a.score - b.score,
      render: renderScore,
    },
    {
      title: '评分明细',
      key: 'categories',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>问候: {record.categories?.greeting || 0}</span>
          <span>专业: {record.categories?.professionalism || 0}</span>
          <span>解决: {record.categories?.problemSolving || 0}</span>
          <span>速度: {record.categories?.responseSpeed || 0}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '待处理', value: 'pending' },
        { text: '已完成', value: 'completed' },
        { text: '有争议', value: 'disputed' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: '评价人',
      dataIndex: 'reviewerId',
      key: 'reviewerId',
      width: 120,
      render: (id: string) => id?.slice(0, 8) || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedReview(record);
                setDetailDrawerVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 提交质检
  const handleSubmitReview = async () => {
    try {
      const values = await form.validateFields();
      const totalScore = Math.round(
        (values.greeting + values.professionalism + values.problemSolving + values.responseSpeed) / 4
      );

      createMutation.mutate({
        conversationId: values.conversationId,
        agentId: values.agentId,
        score: totalScore,
        categories: {
          greeting: values.greeting,
          professionalism: values.professionalism,
          problemSolving: values.problemSolving,
          responseSpeed: values.responseSpeed,
        },
        comment: values.comment,
      });
    } catch (error) {
      // Form validation error
    }
  };

  return (
    <ErrorBoundary boundaryName="QualityReviewPage">
      <div>
        <h2>
          <StarOutlined style={{ marginRight: 8 }} />
          质检评分
        </h2>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="总质检数" value={stats.total} prefix={<StarOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="已完成"
                value={stats.completed}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="待处理"
                value={stats.pending}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="平均分"
                value={stats.avgScore.toFixed(1)}
                valueStyle={{ color: stats.avgScore >= 80 ? '#52c41a' : '#faad14' }}
                prefix={<StarOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="pending">待处理</Option>
              <Option value="completed">已完成</Option>
              <Option value="disputed">有争议</Option>
            </Select>
            <Select
              placeholder="客服筛选"
              allowClear
              style={{ width: 160 }}
              value={agentFilter}
              onChange={setAgentFilter}
              showSearch
              optionFilterProp="children"
            >
              {agents.map((agent) => (
                <Option key={agent.id} value={agent.id}>
                  {agent.displayName}
                </Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
              新建质检
            </Button>
          </Space>

          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && !error && reviews.length === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无质检记录"
          >
            <Table
              columns={columns}
              dataSource={reviews}
              rowKey="id"
              loading={false}
              scroll={{ x: 1200 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </LoadingState>
        </Card>

        {/* 创建质检弹窗 */}
        <Modal
          title="新建质检评分"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          onOk={handleSubmitReview}
          confirmLoading={createMutation.isPending}
          width={600}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="conversationId"
              label="选择会话"
              rules={[{ required: true, message: '请选择要评分的会话' }]}
            >
              <Select placeholder="选择已结束的会话" showSearch optionFilterProp="children">
                {conversations.map((conv) => (
                  <Option key={conv.id} value={conv.id}>
                    {conv.visitorName || '匿名'} - {conv.subject || '无主题'} ({dayjs(conv.startedAt).format('MM-DD HH:mm')})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="agentId"
              label="被评客服"
              rules={[{ required: true, message: '请选择被评客服' }]}
            >
              <Select placeholder="选择客服">
                {agents.map((agent) => (
                  <Option key={agent.id} value={agent.id}>
                    {agent.displayName}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              {scoreCategories.map((category) => (
                <Col span={12} key={category.key}>
                  <Form.Item
                    name={category.key}
                    label={
                      <Tooltip title={category.description}>
                        {category.label}
                      </Tooltip>
                    }
                    rules={[{ required: true, message: `请评分` }]}
                    initialValue={80}
                  >
                    <Rate
                      count={5}
                      allowHalf
                      style={{ fontSize: 20 }}
                      onChange={(value) => form.setFieldValue(category.key, value * 20)}
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>

            <Form.Item name="comment" label="评语">
              <TextArea rows={3} placeholder="输入评语（可选）" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 质检详情抽屉 */}
        <Drawer
          title="质检详情"
          placement="right"
          width={480}
          open={detailDrawerVisible}
          onClose={() => {
            setDetailDrawerVisible(false);
            setSelectedReview(null);
          }}
        >
          {selectedReview && (
            <>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="质检ID">
                  <span style={{ fontFamily: 'monospace' }}>{selectedReview.id}</span>
                </Descriptions.Item>
                <Descriptions.Item label="会话ID">
                  <span style={{ fontFamily: 'monospace' }}>{selectedReview.conversationId}</span>
                </Descriptions.Item>
                <Descriptions.Item label="被评客服">
                  {selectedReview.agentId?.slice(0, 8)}
                </Descriptions.Item>
                <Descriptions.Item label="评价人">
                  {selectedReview.reviewerId?.slice(0, 8)}
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  {renderStatusTag(selectedReview.status)}
                </Descriptions.Item>
                <Descriptions.Item label="总评分">
                  {renderScore(selectedReview.score)}
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(selectedReview.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              </Descriptions>

              <Card title="评分明细" size="small" style={{ marginTop: 16 }}>
                {scoreCategories.map((category) => (
                  <div key={category.key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{category.label}</span>
                      <span>{selectedReview.categories?.[category.key as keyof typeof selectedReview.categories] || 0}</span>
                    </div>
                    <Progress
                      percent={selectedReview.categories?.[category.key as keyof typeof selectedReview.categories] || 0}
                      size="small"
                      strokeColor={
                        (selectedReview.categories?.[category.key as keyof typeof selectedReview.categories] || 0) >= 80
                          ? '#52c41a'
                          : (selectedReview.categories?.[category.key as keyof typeof selectedReview.categories] || 0) >= 60
                          ? '#faad14'
                          : '#ff4d4f'
                      }
                    />
                  </div>
                ))}
              </Card>

              {selectedReview.comment && (
                <Card title="评语" size="small" style={{ marginTop: 16 }}>
                  <p>{selectedReview.comment}</p>
                </Card>
              )}
            </>
          )}
        </Drawer>
      </div>
    </ErrorBoundary>
  );
};

export default QualityReviewPage;
