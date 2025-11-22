/**
 * 队列管理 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { QueueStatus, QueueJob, QueueJobDetail, QueueSummary } from '@/types';

/**
 * 获取所有队列状态
 */
export const getAllQueuesStatus = (): Promise<{
  timestamp: string;
  queues: QueueStatus[];
  summary: QueueSummary;
}> =>
  api.get<{
    timestamp: string;
    queues: QueueStatus[];
    summary: QueueSummary;
  }>('/queues/status');

/**
 * 获取指定队列的任务列表
 */
export const getQueueJobs = (
  queueName: string,
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'waiting',
  start: number = 0,
  end: number = 10
): Promise<{
  queueName: string;
  status: string;
  jobs: QueueJob[];
  pagination: {
    start: number;
    end: number;
    count: number;
  };
}> =>
  api.get<{
    queueName: string;
    status: string;
    jobs: QueueJob[];
    pagination: {
      start: number;
      end: number;
      count: number;
    };
  }>(`/queues/${queueName}/jobs`, {
    params: { status, start, end },
  });

/**
 * 获取任务详情
 */
export const getJobDetail = (queueName: string, jobId: string): Promise<QueueJobDetail> =>
  api.get<QueueJobDetail>(`/queues/${queueName}/jobs/${jobId}`);

/**
 * 重试失败的任务
 */
export const retryJob = (queueName: string, jobId: string): Promise<{ message: string }> =>
  api.post<{ message: string }>(`/queues/${queueName}/jobs/${jobId}/retry`);

/**
 * 删除任务
 */
export const removeJob = (queueName: string, jobId: string): Promise<{ message: string }> =>
  api.delete<{ message: string }>(`/queues/${queueName}/jobs/${jobId}`);

/**
 * 暂停队列
 */
export const pauseQueue = (queueName: string): Promise<{ message: string }> =>
  api.post<{ message: string }>(`/queues/${queueName}/pause`);

/**
 * 恢复队列
 */
export const resumeQueue = (queueName: string): Promise<{ message: string }> =>
  api.post<{ message: string }>(`/queues/${queueName}/resume`);

/**
 * 清空队列
 */
export const emptyQueue = (queueName: string): Promise<{ message: string }> =>
  api.delete<{ message: string }>(`/queues/${queueName}/empty`);

/**
 * 清理已完成的任务
 */
export const cleanQueue = (
  queueName: string,
  grace: number = 24 * 3600 * 1000, // 默认 24 小时
  type: 'completed' | 'failed' = 'completed'
): Promise<{ message: string }> =>
  api.post<{ message: string }>(`/queues/${queueName}/clean`, {
    grace,
    type,
  });

// ============================================================================
// 测试功能：创建任务
// ============================================================================

/**
 * 测试：发送邮件任务
 */
export const testSendEmail = (
  to: string,
  subject: string,
  html: string
): Promise<{ message: string; jobId: string }> =>
  api.post<{ message: string; jobId: string }>('/queues/test/send-email', {
    to,
    subject,
    html,
  });

/**
 * 测试：发送短信任务
 */
export const testSendSms = (
  phone: string,
  message: string
): Promise<{ message: string; jobId: string }> =>
  api.post<{ message: string; jobId: string }>('/queues/test/send-sms', {
    phone,
    message,
  });

/**
 * 测试：启动设备任务
 */
export const testStartDevice = (
  deviceId: string,
  userId?: string
): Promise<{ message: string; jobId: string }> =>
  api.post<{ message: string; jobId: string }>('/queues/test/start-device', {
    deviceId,
    userId,
  });
