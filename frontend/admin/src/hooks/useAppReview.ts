import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getApp,
  approveApp,
  rejectApp,
  requestAppChanges,
  getAppReviewHistory,
} from '@/services/app';
import type { Application, AppReviewRecord } from '@/types';

export const useAppReview = (id: string | undefined) => {
  const [app, setApp] = useState<Application | null>(null);
  const [reviewHistory, setReviewHistory] = useState<AppReviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes'>(
    'approve'
  );

  const loadApp = useCallback(async () => {
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
  }, [id]);

  const loadReviewHistory = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getAppReviewHistory(id);
      setReviewHistory(res.data || []);
    } catch (error) {
      console.error('加载审核历史失败', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadApp();
      loadReviewHistory();
    }
  }, [id, loadApp, loadReviewHistory]);

  const openReviewModal = useCallback(
    (action: 'approve' | 'reject' | 'request_changes') => {
      setReviewAction(action);
      setReviewModalVisible(true);
    },
    []
  );

  const closeReviewModal = useCallback(() => {
    setReviewModalVisible(false);
  }, []);

  const handleReview = useCallback(
    async (values: any) => {
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
        return true;
      } catch (error: any) {
        message.error(error.message || '操作失败');
        return false;
      }
    },
    [id, reviewAction, loadApp, loadReviewHistory]
  );

  return {
    app,
    reviewHistory,
    loading,
    reviewModalVisible,
    reviewAction,
    openReviewModal,
    closeReviewModal,
    handleReview,
  };
};
