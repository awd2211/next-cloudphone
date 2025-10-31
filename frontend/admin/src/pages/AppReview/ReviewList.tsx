import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Descriptions,
  Tabs,
  Row,
  Col,
  Statistic,
  Badge,
  Image,
  List,
  Timeline,
  Avatar,
  Tooltip,
  Alert,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  WarningOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getApps,
  getPendingApps,
  approveApp,
  rejectApp,
  requestAppChanges,
  getAppReviewRecords,
  getAppReviewHistory,
} from '@/services/app';
import type { Application, AppReviewRecord } from '@/types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { TabPane } = Tabs;

const AppReviewList = () => {
  const [pendingApps, setPendingApps] = useState<Application[]>([]);
  const [reviewedApps, setReviewedApps] = useState<Application[]>([]);
  const [reviewRecords, setReviewRecords] = useState<AppReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes'>(
    'approve'
  );
  const [reviewHistory, setReviewHistory] = useState<AppReviewRecord[]>([]);
  const [form] = Form.useForm();

  // 加载待审核应用
  const loadPendingApps = async () => {
    setLoading(true);
    try {
      const res = await getPendingApps({ page, pageSize });
      setPendingApps(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载待审核应用失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载已审核应用
  const loadReviewedApps = async () => {
    setLoading(true);
    try {
      const res = await getApps({
        page,
        pageSize,
        reviewStatus: activeTab === 'approved' ? 'approved' : 'rejected',
      } as any);
      setReviewedApps(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载已审核应用失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载审核记录
  const loadReviewRecords = async () => {
    setLoading(true);
    try {
      const res = await getAppReviewRecords({ page, pageSize });
      setReviewRecords(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载审核记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingApps();
    } else if (activeTab === 'approved' || activeTab === 'rejected') {
      loadReviewedApps();
    } else if (activeTab === 'history') {
      loadReviewRecords();
    }
  }, [page, pageSize, activeTab]);

  // 打开审核模态框
  const openReviewModal = (app: Application, action: 'approve' | 'reject' | 'request_changes') => {
    setSelectedApp(app);
    setReviewAction(action);
    setReviewModalVisible(true);
    form.resetFields();
  };

  // 提交审核
  const handleReview = async (values: any) => {
    if (!selectedApp) return;

    try {
      if (reviewAction === 'approve') {
        await approveApp(selectedApp.id, { comment: values.comment });
        message.success('应用已批准');
      } else if (reviewAction === 'reject') {
        await rejectApp(selectedApp.id, { reason: values.reason });
        message.success('应用已拒绝');
      } else if (reviewAction === 'request_changes') {
        await requestAppChanges(selectedApp.id, { changes: values.changes });
        message.success('已请求修改');
      }

      setReviewModalVisible(false);
      form.resetFields();
      setSelectedApp(null);
      loadPendingApps();
    } catch (error: any) {
      message.error(error.message || '审核操作失败');
    }
  };

  // 查看应用详情
  const viewAppDetail = (app: Application) => {
    setSelectedApp(app);
    setDetailModalVisible(true);
  };

  // 查看审核历史
  const viewReviewHistory = async (app: Application) => {
    setSelectedApp(app);
    try {
      const history = await getAppReviewHistory(app.id);
      setReviewHistory(history);
      setHistoryModalVisible(true);
    } catch (error) {
      message.error('加载审核历史失败');
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // 状态渲染
  const renderStatus = (status?: string) => {
    const statusConfig = {
      pending: { color: 'processing', icon: <ClockCircleOutlined />, text: '待审核' },
      approved: { color: 'success', icon: <CheckCircleOutlined />, text: '已批准' },
      rejected: { color: 'error', icon: <CloseCircleOutlined />, text: '已拒绝' },
      changes_requested: { color: 'warning', icon: <EditOutlined />, text: '需修改' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  // 待审核应用列
  const pendingColumns: ColumnsType<Application> = [
    {
      title: '应用图标',
      dataIndex: 'iconUrl',
      key: 'iconUrl',
      width: 80,
      render: (iconUrl, record) =>
        iconUrl ? (
          <Image src={iconUrl} width={48} height={48} style={{ borderRadius: '8px' }} />
        ) : (
          <Avatar size={48} icon={<AppstoreOutlined />} style={{ backgroundColor: '#1890ff' }} />
        ),
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{text}</span>
          <span style={{ fontSize: '12px', color: '#999' }}>{record.packageName}</span>
        </Space>
      ),
    },
    {
      title: '版本',
      dataIndex: 'versionName',
      key: 'versionName',
      width: 100,
      render: (text, record) => (
        <Tag color="blue">
          v{text} ({record.versionCode})
        </Tag>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size) => formatSize(size),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => category || '-',
    },
    {
      title: '上传者',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 120,
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewAppDetail(record)}
          >
            详情
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => openReviewModal(record, 'approve')}
          >
            批准
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => openReviewModal(record, 'reject')}
          >
            拒绝
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openReviewModal(record, 'request_changes')}
          >
            请求修改
          </Button>
        </Space>
      ),
    },
  ];

  // 已审核应用列
  const reviewedColumns: ColumnsType<Application> = [
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, record) => (
        <Space>
          {record.iconUrl && (
            <Image src={record.iconUrl} width={32} height={32} style={{ borderRadius: '4px' }} />
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '版本',
      dataIndex: 'versionName',
      key: 'versionName',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 100,
      render: renderStatus,
    },
    {
      title: '审核意见',
      dataIndex: 'reviewComment',
      key: 'reviewComment',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '审核人',
      dataIndex: 'reviewedBy',
      key: 'reviewedBy',
      width: 120,
    },
    {
      title: '审核时间',
      dataIndex: 'reviewedAt',
      key: 'reviewedAt',
      width: 180,
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewAppDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => viewReviewHistory(record)}
          >
            历史
          </Button>
        </Space>
      ),
    },
  ];

  // 审核记录列
  const recordColumns: ColumnsType<AppReviewRecord> = [
    {
      title: '应用名称',
      key: 'appName',
      width: 200,
      render: (_, record) => record.application?.name || '-',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => {
        const actionMap = {
          submit: '提交审核',
          approve: '批准',
          reject: '拒绝',
          request_changes: '请求修改',
        };
        return actionMap[action as keyof typeof actionMap] || action;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatus,
    },
    {
      title: '备注',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '操作人',
      dataIndex: 'reviewedBy',
      key: 'reviewedBy',
      width: 120,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // 统计数据
  const stats = {
    pending: pendingApps.length,
    approved: reviewedApps.filter((app) => app.reviewStatus === 'approved').length,
    rejected: reviewedApps.filter((app) => app.reviewStatus === 'rejected').length,
  };

  return (
    <div style={{ padding: '24px' }}>
      <Alert
        message="应用审核说明"
        description="所有上传到应用市场的应用都需要经过审核才能发布。审核过程包括检查应用信息的完整性、权限的合理性以及是否符合平台规范。您可以批准、拒绝或请求开发者修改应用。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: '16px' }}
      />

      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="待审核"
              value={stats.pending}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已批准"
              value={stats.approved}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已拒绝"
              value={stats.rejected}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                待审核 <Badge count={stats.pending} style={{ marginLeft: 8 }} />
              </span>
            }
            key="pending"
          >
            <Table
              columns={pendingColumns}
              dataSource={pendingApps}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1400 }}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPage(page);
                  setPageSize(pageSize);
                },
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <CheckCircleOutlined />
                已批准
              </span>
            }
            key="approved"
          >
            <Table
              columns={reviewedColumns}
              dataSource={reviewedApps}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPage(page);
                  setPageSize(pageSize);
                },
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <CloseCircleOutlined />
                已拒绝
              </span>
            }
            key="rejected"
          >
            <Table
              columns={reviewedColumns}
              dataSource={reviewedApps}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPage(page);
                  setPageSize(pageSize);
                },
              }}
            />
          </TabPane>

          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                审核记录
              </span>
            }
            key="history"
          >
            <Table
              columns={recordColumns}
              dataSource={reviewRecords}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (page, pageSize) => {
                  setPage(page);
                  setPageSize(pageSize);
                },
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 审核模态框 */}
      <Modal
        title={
          reviewAction === 'approve'
            ? '批准应用'
            : reviewAction === 'reject'
              ? '拒绝应用'
              : '请求修改'
        }
        open={reviewModalVisible}
        onCancel={() => {
          setReviewModalVisible(false);
          form.resetFields();
          setSelectedApp(null);
        }}
        onOk={() => form.submit()}
        width={600}
      >
        {selectedApp && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="应用名称" span={2}>
                {selectedApp.name}
              </Descriptions.Item>
              <Descriptions.Item label="包名" span={2}>
                {selectedApp.packageName}
              </Descriptions.Item>
              <Descriptions.Item label="版本">{selectedApp.versionName}</Descriptions.Item>
              <Descriptions.Item label="大小">{formatSize(selectedApp.size)}</Descriptions.Item>
            </Descriptions>

            <Form form={form} onFinish={handleReview} layout="vertical">
              {reviewAction === 'approve' && (
                <Form.Item label="批准意见（可选）" name="comment">
                  <TextArea rows={3} placeholder="可以添加一些批准意见或建议" />
                </Form.Item>
              )}
              {reviewAction === 'reject' && (
                <Form.Item
                  label="拒绝原因"
                  name="reason"
                  rules={[{ required: true, message: '请输入拒绝原因' }]}
                >
                  <TextArea rows={4} placeholder="请详细说明拒绝原因，帮助开发者改进应用" />
                </Form.Item>
              )}
              {reviewAction === 'request_changes' && (
                <Form.Item
                  label="需要修改的内容"
                  name="changes"
                  rules={[{ required: true, message: '请输入需要修改的内容' }]}
                >
                  <TextArea rows={4} placeholder="请详细列出需要修改的内容" />
                </Form.Item>
              )}
            </Form>
          </>
        )}
      </Modal>

      {/* 应用详情模态框 */}
      <Modal
        title="应用详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedApp(null);
        }}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedApp && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="应用名称" span={2}>
              {selectedApp.name}
            </Descriptions.Item>
            <Descriptions.Item label="包名" span={2}>
              {selectedApp.packageName}
            </Descriptions.Item>
            <Descriptions.Item label="版本名称">{selectedApp.versionName}</Descriptions.Item>
            <Descriptions.Item label="版本号">{selectedApp.versionCode}</Descriptions.Item>
            <Descriptions.Item label="文件大小">{formatSize(selectedApp.size)}</Descriptions.Item>
            <Descriptions.Item label="分类">{selectedApp.category || '-'}</Descriptions.Item>
            <Descriptions.Item label="最低 SDK">
              {selectedApp.minSdkVersion || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="目标 SDK">
              {selectedApp.targetSdkVersion || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>
              {selectedApp.description || '-'}
            </Descriptions.Item>
            {selectedApp.permissions && selectedApp.permissions.length > 0 && (
              <Descriptions.Item label="权限" span={2}>
                <Space wrap>
                  {selectedApp.permissions.map((perm) => (
                    <Tag key={perm}>{perm}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="上传者">{selectedApp.uploadedBy}</Descriptions.Item>
            <Descriptions.Item label="上传时间">
              {dayjs(selectedApp.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="审核状态" span={2}>
              {renderStatus(selectedApp.reviewStatus)}
            </Descriptions.Item>
            {selectedApp.reviewComment && (
              <Descriptions.Item label="审核意见" span={2}>
                {selectedApp.reviewComment}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 审核历史模态框 */}
      <Modal
        title="审核历史"
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setSelectedApp(null);
          setReviewHistory([]);
        }}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedApp && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontWeight: 500 }}>应用名称：</span>
              {selectedApp.name}
            </div>
            <Timeline>
              {reviewHistory.map((record) => (
                <Timeline.Item
                  key={record.id}
                  color={
                    record.action === 'approve'
                      ? 'green'
                      : record.action === 'reject'
                        ? 'red'
                        : 'blue'
                  }
                >
                  <p>
                    <strong>
                      {record.action === 'approve'
                        ? '批准'
                        : record.action === 'reject'
                          ? '拒绝'
                          : record.action === 'request_changes'
                            ? '请求修改'
                            : '提交审核'}
                    </strong>
                  </p>
                  <p>操作人：{record.reviewedBy || '-'}</p>
                  {record.comment && <p>备注：{record.comment}</p>}
                  <p style={{ color: '#999', fontSize: '12px' }}>
                    {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </p>
                </Timeline.Item>
              ))}
            </Timeline>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AppReviewList;
