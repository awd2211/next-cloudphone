import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getApp,
  approveApp,
  rejectApp,
  requestAppChanges,
  getAppReviewHistory,
} from '@/services/app';
import { useSafeApi } from './useSafeApi';
import {
  ApplicationSchema,
  AppReviewHistoryResponseSchema,
} from '@/schemas/api.schemas';

export const useAppReview = (id: string | undefined) => {
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes'>(
    'approve'
  );

  // ✅ 使用 useSafeApi 加载应用详情
  const {
    data: app,
    loading,
    execute: executeLoadApp,
  } = useSafeApi(
    () => {
      if (!id) throw new Error('No app ID');
      return getApp(id);
    },
    ApplicationSchema,
    {
      errorMessage: '加载应用信息失败',
      fallbackValue: null,
      manual: true,
    }
  );

  // ✅ 使用 useSafeApi 加载审核历史
  const {
    data: reviewHistory,
    execute: executeLoadReviewHistory,
  } = useSafeApi(
    () => {
      if (!id) throw new Error('No app ID');
      return getAppReviewHistory(id);
    },
    AppReviewHistoryResponseSchema,
    {
      errorMessage: '加载审核历史失败',
      fallbackValue: [],
      manual: true,
      showError: false,
    }
  );

  useEffect(() => {
    if (id) {
      executeLoadApp();
      executeLoadReviewHistory();
    }
  }, [id, executeLoadApp, executeLoadReviewHistory]);

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
        executeLoadApp();
        executeLoadReviewHistory();
        return true;
      } catch (error: any) {
        message.error(error.message || '操作失败');
        return false;
      }
    },
    [id, reviewAction, executeLoadApp, executeLoadReviewHistory]
  );

  return {
    app,
    reviewHistory: reviewHistory || [],
    loading,
    reviewModalVisible,
    reviewAction,
    openReviewModal,
    closeReviewModal,
    handleReview,
  };
};
