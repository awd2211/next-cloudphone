import { useState, useCallback } from 'react';
import { message } from 'antd';
import {
  getApp,
  approveApp,
  rejectApp,
  requestAppChanges,
  getAppReviewHistory,
} from '@/services/app';
import { useValidatedQuery } from '@/hooks/utils';
import {
  ApplicationSchema,
  AppReviewHistoryResponseSchema,
} from '@/schemas/api.schemas';

export const useAppReview = (id: string | undefined) => {
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_changes'>(
    'approve'
  );

  // ✅ 使用 useValidatedQuery 加载应用详情
  const {
    data: app,
    isLoading: loading,
    refetch: loadApp,
  } = useValidatedQuery({
    queryKey: ['app-detail', id],
    queryFn: () => {
      if (!id) throw new Error('No app ID');
      return getApp(id);
    },
    schema: ApplicationSchema,
    apiErrorMessage: '加载应用信息失败',
    fallbackValue: null,
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  // ✅ 使用 useValidatedQuery 加载审核历史
  const {
    data: reviewHistory,
    refetch: loadReviewHistory,
  } = useValidatedQuery({
    queryKey: ['app-review-history', id],
    queryFn: () => {
      if (!id) throw new Error('No app ID');
      return getAppReviewHistory(id);
    },
    schema: AppReviewHistoryResponseSchema,
    apiErrorMessage: '加载审核历史失败',
    fallbackValue: [],
    enabled: !!id,
    staleTime: 30 * 1000,
  });

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
    reviewHistory: reviewHistory || [],
    loading,
    reviewModalVisible,
    reviewAction,
    openReviewModal,
    closeReviewModal,
    handleReview,
  };
};
