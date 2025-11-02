import { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Tabs, message, Form, Alert } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons';
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
import {
  AppReviewStatsCard,
  PendingTab,
  ReviewedTab,
  RecordsTab,
  ReviewActionModal,
  AppDetailModal,
  ReviewHistoryModal,
  createPendingColumns,
  createReviewedColumns,
  createRecordColumns,
} from '@/components/AppReview';

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

  // 关闭模态框并重置状态
  const handleCloseReviewModal = () => {
    setReviewModalVisible(false);
    form.resetFields();
    setSelectedApp(null);
  };

  const handleCloseDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedApp(null);
  };

  const handleCloseHistoryModal = () => {
    setHistoryModalVisible(false);
    setSelectedApp(null);
    setReviewHistory([]);
  };

  // 分页处理
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  // 表格列定义 - 使用 useMemo 优化
  const pendingColumns = useMemo(
    () =>
      createPendingColumns({
        onViewDetail: viewAppDetail,
        onApprove: (app) => openReviewModal(app, 'approve'),
        onReject: (app) => openReviewModal(app, 'reject'),
        onRequestChanges: (app) => openReviewModal(app, 'request_changes'),
      }),
    []
  );

  const reviewedColumns = useMemo(
    () =>
      createReviewedColumns({
        onViewDetail: viewAppDetail,
        onViewHistory: viewReviewHistory,
      }),
    []
  );

  const recordColumns = useMemo(() => createRecordColumns(), []);

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

      <AppReviewStatsCard pending={stats.pending} approved={stats.approved} rejected={stats.rejected} />

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
            <PendingTab
              apps={pendingApps}
              loading={loading}
              columns={pendingColumns}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
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
            <ReviewedTab
              apps={reviewedApps}
              loading={loading}
              columns={reviewedColumns}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
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
            <ReviewedTab
              apps={reviewedApps}
              loading={loading}
              columns={reviewedColumns}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
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
            <RecordsTab
              records={reviewRecords}
              loading={loading}
              columns={recordColumns}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 审核模态框 */}
      <ReviewActionModal
        visible={reviewModalVisible}
        app={selectedApp}
        action={reviewAction}
        form={form}
        onOk={() => form.submit()}
        onCancel={handleCloseReviewModal}
        onFinish={handleReview}
      />

      {/* 应用详情模态框 */}
      <AppDetailModal
        visible={detailModalVisible}
        app={selectedApp}
        onClose={handleCloseDetailModal}
      />

      {/* 审核历史模态框 */}
      <ReviewHistoryModal
        visible={historyModalVisible}
        app={selectedApp}
        history={reviewHistory}
        onClose={handleCloseHistoryModal}
      />
    </div>
  );
};

export default AppReviewList;
