/**
 * 事件溯源服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { UserEvent, EventStats, EventHistory } from '@/types';

/**
 * 获取用户事件历史
 */
export const getUserEventHistory = (userId: string): Promise<{
  data: EventHistory;
  message: string;
}> =>
  api.get<{
    data: EventHistory;
    message: string;
  }>(`/events/user/${userId}/history`);

/**
 * 重放用户事件（重建当前状态）
 */
export const replayUserEvents = (userId: string): Promise<{
  data: any;
  message: string;
}> =>
  api.get<{
    data: any;
    message: string;
  }>(`/events/user/${userId}/replay`);

/**
 * 重放到特定版本
 */
export const replayToVersion = (userId: string, version: number): Promise<{
  data: any;
  message: string;
}> =>
  api.get<{
    data: any;
    message: string;
  }>(`/events/user/${userId}/replay/version/${version}`);

/**
 * 时间旅行（重放到特定时间点）
 */
export const timeTravel = (userId: string, timestamp: string): Promise<{
  data: any;
  message: string;
}> =>
  api.get<{
    data: any;
    message: string;
  }>(`/events/user/${userId}/replay/timestamp`, {
    params: { timestamp },
  });

/**
 * 获取事件统计信息
 */
export const getEventStats = (eventType?: string): Promise<{
  data: EventStats;
  message: string;
}> =>
  api.get<{
    data: EventStats;
    message: string;
  }>('/events/stats', {
    params: eventType ? { eventType } : undefined,
  });

/**
 * 获取最近的事件列表
 */
export const getRecentEvents = (eventType?: string, limit: number = 50): Promise<{
  data: UserEvent[];
  total: number;
  message: string;
}> =>
  api.get<{
    data: UserEvent[];
    total: number;
    message: string;
  }>('/events/recent', {
    params: {
      eventType,
      limit: limit.toString(),
    },
  });
