import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import {
  getApps,
  getPendingApps,
  approveApp,
  rejectApp,
  requestAppChanges,
  getAppReviewRecords,
  getAppReviewHistory,
} from '@/services/app';
import {
  createPendingColumns,
  createReviewedColumns,
  createRecordColumns,
} from '@/components/AppReview';
import type { Application, AppReviewRecord } from '@/types';

export const useAppReviewList = () => {
  // 状态管理
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

  // Form 实例
  const [form] = Form.useForm();

  // 加载待审核应用
  const loadPendingApps = useCallback(async () => {
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
  }, [page, pageSize]);

  // 加载已审核应用
  const loadReviewedApps = useCallback(async () => {
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
  }, [page, pageSize, activeTab]);

  // 加载审核记录
  const loadReviewRecords = useCallback(async () => {
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
  }, [page, pageSize]);

  // 根据activeTab加载对应数据
  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingApps();
    } else if (activeTab === 'approved' || activeTab === 'rejected') {
      loadReviewedApps();
    } else if (activeTab === 'history') {
      loadReviewRecords();
    }
  }, [activeTab, loadPendingApps, loadReviewedApps, loadReviewRecords]);

  // 打开审核模态框
  const openReviewModal = useCallback(
    (app: Application, action: 'approve' | 'reject' | 'request_changes') => {
      setSelectedApp(app);
      setReviewAction(action);
      setReviewModalVisible(true);
      form.resetFields();
    },
    [form]
  );

  // 提交审核
  const handleReview = useCallback(
    async (values: any) => {
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
    },
    [selectedApp, reviewAction, form, loadPendingApps]
  );

  // 查看应用详情
  const viewAppDetail = useCallback((app: Application) => {
    setSelectedApp(app);
    setDetailModalVisible(true);
  }, []);

  // 查看审核历史
  const viewReviewHistory = useCallback(async (app: Application) => {
    setSelectedApp(app);
    try {
      const history = await getAppReviewHistory(app.id);
      setReviewHistory(history);
      setHistoryModalVisible(true);
    } catch (error) {
      message.error('加载审核历史失败');
    }
  }, []);

  // 关闭模态框并重置状态
  const handleCloseReviewModal = useCallback(() => {
    setReviewModalVisible(false);
    form.resetFields();
    setSelectedApp(null);
  }, [form]);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedApp(null);
  }, []);

  const handleCloseHistoryModal = useCallback(() => {
    setHistoryModalVisible(false);
    setSelectedApp(null);
    setReviewHistory([]);
  }, []);

  // 分页处理
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  // 表格列定义 - 使用 useMemo 优化
  const pendingColumns = useMemo(
    () =>
      createPendingColumns({
        onViewDetail: viewAppDetail,
        onApprove: (app) => openReviewModal(app, 'approve'),
        onReject: (app) => openReviewModal(app, 'reject'),
        onRequestChanges: (app) => openReviewModal(app, 'request_changes'),
      }),
    [viewAppDetail, openReviewModal]
  );

  const reviewedColumns = useMemo(
    () =>
      createReviewedColumns({
        onViewDetail: viewAppDetail,
        onViewHistory: viewReviewHistory,
      }),
    [viewAppDetail, viewReviewHistory]
  );

  const recordColumns = useMemo(() => createRecordColumns(), []);

  // 统计数据
  const stats = useMemo(
    () => ({
      pending: pendingApps.length,
      approved: reviewedApps.filter((app) => app.reviewStatus === 'approved').length,
      rejected: reviewedApps.filter((app) => app.reviewStatus === 'rejected').length,
    }),
    [pendingApps, reviewedApps]
  );

  return {
    // 数据状态
    pendingApps,
    reviewedApps,
    reviewRecords,
    loading,
    total,
    page,
    pageSize,
    activeTab,
    // 模态框状态
    reviewModalVisible,
    detailModalVisible,
    historyModalVisible,
    // 选中状态
    selectedApp,
    reviewAction,
    reviewHistory,
    // Form 实例
    form,
    // 表格列
    pendingColumns,
    reviewedColumns,
    recordColumns,
    // 统计数据
    stats,
    // 处理函数
    openReviewModal,
    handleReview,
    viewAppDetail,
    viewReviewHistory,
    handleCloseReviewModal,
    handleCloseDetailModal,
    handleCloseHistoryModal,
    handlePageChange,
    setActiveTab,
  };
};
