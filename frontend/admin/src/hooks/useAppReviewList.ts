import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import { z } from 'zod';
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
import { useSafeApi } from './useSafeApi';
import {
  PaginatedAppsResponseSchema,
  PaginatedAppReviewRecordsResponseSchema,
  AppReviewRecordSchema,
} from '@/schemas/api.schemas';

export const useAppReviewList = () => {
  // 分页和Tab状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('pending');

  // ✅ 使用 useSafeApi 加载待审核应用
  const {
    data: pendingAppsResponse,
    loading: pendingLoading,
    execute: executePendingLoad,
  } = useSafeApi(
    () => getPendingApps({ page, pageSize }),
    PaginatedAppsResponseSchema,
    {
      errorMessage: '加载待审核应用失败',
      fallbackValue: { data: [], total: 0 },
    }
  );

  // ✅ 使用 useSafeApi 加载已审核应用
  const {
    data: reviewedAppsResponse,
    loading: reviewedLoading,
    execute: executeReviewedLoad,
  } = useSafeApi(
    () =>
      getApps({
        page,
        pageSize,
        reviewStatus: activeTab === 'approved' ? 'approved' : 'rejected',
      } as any),
    PaginatedAppsResponseSchema,
    {
      errorMessage: '加载已审核应用失败',
      fallbackValue: { data: [], total: 0 },
    }
  );

  // ✅ 使用 useSafeApi 加载审核记录
  const {
    data: reviewRecordsResponse,
    loading: recordsLoading,
    execute: executeRecordsLoad,
  } = useSafeApi(
    () => getAppReviewRecords({ page, pageSize }),
    PaginatedAppReviewRecordsResponseSchema,
    {
      errorMessage: '加载审核记录失败',
      fallbackValue: { data: [], total: 0 },
    }
  );

  // 计算当前loading状态
  const loading = pendingLoading || reviewedLoading || recordsLoading;
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

  // ✅ 简化的加载函数（调用 useSafeApi 的 execute）
  const loadPendingApps = useCallback(async () => {
    await executePendingLoad();
  }, [executePendingLoad]);

  const loadReviewedApps = useCallback(async () => {
    await executeReviewedLoad();
  }, [executeReviewedLoad]);

  const loadReviewRecords = useCallback(async () => {
    await executeRecordsLoad();
  }, [executeRecordsLoad]);

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
      // ✅ 使用 Zod 验证响应
      const validationResult = z.array(AppReviewRecordSchema).safeParse(history);
      if (validationResult.success) {
        setReviewHistory(validationResult.data);
      } else {
        console.error('审核历史数据验证失败:', validationResult.error.issues);
        setReviewHistory([]); // 验证失败时使用空数组
      }
      setHistoryModalVisible(true);
    } catch (error) {
      message.error('加载审核历史失败');
      setReviewHistory([]); // 错误时重置为空数组
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

  // ✅ 从响应中提取数据
  const pendingApps = pendingAppsResponse?.data || [];
  const reviewedApps = reviewedAppsResponse?.data || [];
  const reviewRecords = reviewRecordsResponse?.data || [];

  // ✅ 根据activeTab计算当前total
  const total = useMemo(() => {
    if (activeTab === 'pending') return pendingAppsResponse?.total || 0;
    if (activeTab === 'approved' || activeTab === 'rejected')
      return reviewedAppsResponse?.total || 0;
    if (activeTab === 'history') return reviewRecordsResponse?.total || 0;
    return 0;
  }, [activeTab, pendingAppsResponse, reviewedAppsResponse, reviewRecordsResponse]);

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
