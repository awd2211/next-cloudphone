import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { z } from 'zod';
import {
  getUserEventHistory,
  replayUserEvents,
  replayToVersion,
  timeTravel,
  getEventStats,
  getRecentEvents,
} from '@/services/events';
import { useSafeApi } from './useSafeApi';
import {
  UserEventSchema,
  EventStatsResponseSchema,
  RecentEventsResponseSchema,
  EventHistoryResponseSchema,
} from '@/schemas/api.schemas';

/**
 * 事件溯源查看器业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (统计、最近事件、用户历史) - 使用 useSafeApi + Zod 验证
 * 2. 事件重放和时间旅行
 * 3. 事件详情查看
 * 4. Modal 状态管理
 */
export const useEventSourcingViewer = () => {
  // ===== 选择和筛选状态 =====
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<z.infer<typeof UserEventSchema> | null>(null);

  // ===== Modal 状态 =====
  const [detailVisible, setDetailVisible] = useState(false);
  const [replayModalVisible, setReplayModalVisible] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [timeTravelModalVisible, setTimeTravelModalVisible] = useState(false);
  const [replayResult, setReplayResult] = useState<any>(null);

  // ===== Form 实例 =====
  const [versionForm] = Form.useForm();
  const [timeTravelForm] = Form.useForm();

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载事件统计
   */
  const { data: statsResponse } = useSafeApi(
    getEventStats,
    EventStatsResponseSchema,
    {
      errorMessage: '加载统计失败',
      showError: false,
    }
  );

  const stats = statsResponse?.success ? statsResponse.data : null;

  /**
   * 加载最近事件
   */
  const {
    data: recentEventsResponse,
    loading: recentEventsLoading,
    execute: executeLoadRecentEvents,
  } = useSafeApi(
    () => getRecentEvents(selectedEventType || undefined, 50),
    RecentEventsResponseSchema,
    {
      errorMessage: '加载最近事件失败',
      fallbackValue: { success: false, data: [] },
    }
  );

  const recentEvents = recentEventsResponse?.success ? recentEventsResponse.data : [];

  /**
   * 加载用户事件历史
   */
  const {
    data: userHistoryResponse,
    loading: userHistoryLoading,
    execute: executeLoadUserHistory,
  } = useSafeApi(
    () => {
      if (!selectedUserId) {
        return Promise.reject(new Error('请输入用户ID'));
      }
      return getUserEventHistory(selectedUserId);
    },
    EventHistoryResponseSchema,
    {
      errorMessage: '加载用户事件历史失败',
      fallbackValue: { success: false, data: { userId: '', events: [], totalEvents: 0, currentVersion: 0 } },
      manual: true,
    }
  );

  const userEvents = userHistoryResponse?.success ? userHistoryResponse.data.events : [];

  /**
   * 初始化加载
   */
  useEffect(() => {
    executeLoadRecentEvents();
  }, [executeLoadRecentEvents]);

  /**
   * 加载用户历史 (手动触发)
   */
  const loadUserHistory = useCallback(async () => {
    if (!selectedUserId) {
      message.warning('请输入用户ID');
      return;
    }

    try {
      await executeLoadUserHistory();
      const totalEvents = userHistoryResponse?.success ? userHistoryResponse.data.totalEvents : 0;
      message.success(`找到 ${totalEvents} 个事件`);
    } catch (error: any) {
      message.error(error.message || '加载用户事件历史失败');
    }
  }, [selectedUserId, executeLoadUserHistory, userHistoryResponse]);

  // ===== 事件操作 =====

  /**
   * 重放用户事件
   */
  const handleReplay = useCallback(async () => {
    if (!selectedUserId) {
      message.warning('请输入用户ID');
      return;
    }

    try {
      const result = await replayUserEvents(selectedUserId);
      setReplayResult(result);
      setReplayModalVisible(true);
      message.success('重放完成');
    } catch (error: any) {
      message.error(error.message || '重放失败');
    }
  }, [selectedUserId]);

  /**
   * 恢复到指定版本
   */
  const handleReplayToVersion = useCallback(async (values: { version: number }) => {
    if (!selectedUserId) return;

    try {
      await replayToVersion(selectedUserId, values.version);
      message.success('状态恢复成功');
      setVersionModalVisible(false);
      await loadUserHistory();
    } catch (error: any) {
      message.error(error.message || '恢复失败');
    }
  }, [selectedUserId, loadUserHistory]);

  /**
   * 时间旅行到指定时间点
   */
  const handleTimeTravel = useCallback(async (values: { timestamp: string }) => {
    if (!selectedUserId) return;

    try {
      await timeTravel(selectedUserId, values.timestamp);
      message.success('时间旅行完成');
      setTimeTravelModalVisible(false);
      await loadUserHistory();
    } catch (error: any) {
      message.error(error.message || '时间旅行失败');
    }
  }, [selectedUserId, loadUserHistory]);

  /**
   * 查看事件详情
   */
  const viewEventDetail = useCallback((event: z.infer<typeof UserEventSchema>) => {
    setSelectedEvent(event);
    setDetailVisible(true);
  }, []);

  return {
    // 数据
    stats,
    recentEvents,
    userEvents,
    loading: recentEventsLoading || userHistoryLoading,

    // 选择状态
    selectedUserId,
    setSelectedUserId,
    selectedEventType,
    setSelectedEventType,
    selectedEvent,

    // Modal 状态
    detailVisible,
    setDetailVisible,
    replayModalVisible,
    setReplayModalVisible,
    versionModalVisible,
    setVersionModalVisible,
    timeTravelModalVisible,
    setTimeTravelModalVisible,
    replayResult,

    // Form 实例
    versionForm,
    timeTravelForm,

    // 操作方法
    loadRecentEvents: executeLoadRecentEvents,
    loadUserHistory,
    handleReplay,
    handleReplayToVersion,
    handleTimeTravel,
    viewEventDetail,
  };
};
