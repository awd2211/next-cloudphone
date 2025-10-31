import request from '@/utils/request';
import type { UserEvent, EventStats, EventHistory } from '@/types';

/**
 * 获取用户事件历史
 */
export const getUserEventHistory = (userId: string) => {
  return request.get<{
    success: boolean;
    data: EventHistory;
    message: string;
  }>(`/events/user/${userId}/history`);
};

/**
 * 重放用户事件（重建当前状态）
 */
export const replayUserEvents = (userId: string) => {
  return request.get<{
    success: boolean;
    data: any;
    message: string;
  }>(`/events/user/${userId}/replay`);
};

/**
 * 重放到特定版本
 */
export const replayToVersion = (userId: string, version: number) => {
  return request.get<{
    success: boolean;
    data: any;
    message: string;
  }>(`/events/user/${userId}/replay/version/${version}`);
};

/**
 * 时间旅行（重放到特定时间点）
 */
export const timeTravel = (userId: string, timestamp: string) => {
  return request.get<{
    success: boolean;
    data: any;
    message: string;
  }>(`/events/user/${userId}/replay/timestamp`, {
    params: { timestamp },
  });
};

/**
 * 获取事件统计信息
 */
export const getEventStats = (eventType?: string) => {
  return request.get<{
    success: boolean;
    data: EventStats;
    message: string;
  }>('/events/stats', {
    params: eventType ? { eventType } : undefined,
  });
};

/**
 * 获取最近的事件列表
 */
export const getRecentEvents = (eventType?: string, limit: number = 50) => {
  return request.get<{
    success: boolean;
    data: UserEvent[];
    total: number;
    message: string;
  }>('/events/recent', {
    params: {
      eventType,
      limit: limit.toString(),
    },
  });
};
