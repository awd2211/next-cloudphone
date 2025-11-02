import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import {
  getUserEventHistory,
  replayUserEvents,
  replayToVersion,
  timeTravel,
  getEventStats,
  getRecentEvents,
} from '@/services/events';
import type { UserEvent, EventStats } from '@/types';

/**
 * 事件溯源查看器业务逻辑 Hook
 */
export const useEventSourcingViewer = () => {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<UserEvent[]>([]);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<UserEvent | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [replayModalVisible, setReplayModalVisible] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [timeTravelModalVisible, setTimeTravelModalVisible] = useState(false);
  const [replayResult, setReplayResult] = useState<any>(null);

  const [versionForm] = Form.useForm();
  const [timeTravelForm] = Form.useForm();

  const loadStats = useCallback(async () => {
    try {
      const res = await getEventStats();
      if (res.success) setStats(res.data);
    } catch (error) {
      message.error('加载统计失败');
    }
  }, []);

  const loadRecentEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecentEvents(selectedEventType || undefined, 50);
      if (res.success) setRecentEvents(res.data);
    } catch (error) {
      message.error('加载最近事件失败');
    } finally {
      setLoading(false);
    }
  }, [selectedEventType]);

  const loadUserHistory = useCallback(async () => {
    if (!selectedUserId) {
      message.warning('请输入用户ID');
      return;
    }
    setLoading(true);
    try {
      const res = await getUserEventHistory(selectedUserId);
      if (res.success) {
        setUserEvents(res.data.events);
        message.success(`找到 ${res.data.totalEvents} 个事件`);
      }
    } catch (error) {
      message.error('加载用户事件历史失败');
      setUserEvents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    loadStats();
    loadRecentEvents();
  }, []);

  const handleReplay = useCallback(async () => {
    if (!selectedUserId) {
      message.warning('请输入用户ID');
      return;
    }
    setLoading(true);
    try {
      const result = await replayUserEvents(selectedUserId);
      setReplayResult(result);
      setReplayModalVisible(true);
      message.success('重放完成');
    } catch (error: any) {
      message.error(error.message || '重放失败');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  const handleReplayToVersion = useCallback(async (values: { version: number }) => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      await replayToVersion(selectedUserId, values.version);
      message.success('状态恢复成功');
      setVersionModalVisible(false);
      loadUserHistory();
    } catch (error: any) {
      message.error(error.message || '恢复失败');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, loadUserHistory]);

  const handleTimeTravel = useCallback(async (values: { timestamp: string }) => {
    if (!selectedUserId) return;
    setLoading(true);
    try {
      await timeTravel(selectedUserId, values.timestamp);
      message.success('时间旅行完成');
      setTimeTravelModalVisible(false);
      loadUserHistory();
    } catch (error: any) {
      message.error(error.message || '时间旅行失败');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, loadUserHistory]);

  const viewEventDetail = useCallback((event: UserEvent) => {
    setSelectedEvent(event);
    setDetailVisible(true);
  }, []);

  return {
    stats,
    recentEvents,
    userEvents,
    loading,
    selectedUserId,
    setSelectedUserId,
    selectedEventType,
    setSelectedEventType,
    selectedEvent,
    detailVisible,
    setDetailVisible,
    replayModalVisible,
    setReplayModalVisible,
    versionModalVisible,
    setVersionModalVisible,
    timeTravelModalVisible,
    setTimeTravelModalVisible,
    replayResult,
    versionForm,
    timeTravelForm,
    loadStats,
    loadRecentEvents,
    loadUserHistory,
    handleReplay,
    handleReplayToVersion,
    handleTimeTravel,
    viewEventDetail,
  };
};
