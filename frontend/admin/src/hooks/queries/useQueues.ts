/**
 * Queues React Query Hooks
 *
 * 基于 @/services/queue
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as queueService from '@/services/queue';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  QueueJobDetailSchema,
} from '@/schemas/api.schemas';

/**
 * Query Keys
 */
export const queueKeys = {
  all: ['queues'] as const,
  status: () => [...queueKeys.all, 'status'] as const,
  queueJobs: (queueName: string, status: string, start: number, end: number) =>
    [...queueKeys.all, 'queue', queueName, 'jobs', { status, start, end }] as const,
  jobDetail: (queueName: string, jobId: string) =>
    [...queueKeys.all, 'queue', queueName, 'job', jobId] as const,
};

/**
 * 获取所有队列状态
 */
export const useAllQueuesStatus = () => {
  return useQuery({
    queryKey: queueKeys.status(),
    queryFn: () => queueService.getAllQueuesStatus(),
    staleTime: 30 * 1000, // 30秒
    refetchInterval: 60 * 1000, // 队列状态 - 中等实时性
  });
};

/**
 * 获取指定队列的任务列表
 */
export const useQueueJobs = (
  queueName: string,
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'waiting',
  start: number = 0,
  end: number = 10
) => {
  return useQuery({
    queryKey: queueKeys.queueJobs(queueName, status, start, end),
    queryFn: () => queueService.getQueueJobs(queueName, status, start, end),
    enabled: !!queueName,
  });
};

/**
 * 获取任务详情
 */
export const useJobDetail = (queueName: string, jobId: string) => {
  return useValidatedQuery({
    queryKey: queueKeys.jobDetail(queueName, jobId),
    queryFn: () => queueService.getJobDetail(queueName, jobId).then(res => res.data),
    schema: QueueJobDetailSchema,
    enabled: !!queueName && !!jobId,
  });
};

/**
 * 重试失败的任务 Mutation
 */
export const useRetryJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: string; jobId: string }) =>
      queueService.retryJob(queueName, jobId),
    onSuccess: (_, { queueName }) => {
      queryClient.invalidateQueries({ queryKey: [...queueKeys.all, 'queue', queueName] });
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('任务重试成功');
    },
    onError: () => {
      message.error('任务重试失败');
    },
  });
};

/**
 * 删除任务 Mutation
 */
export const useRemoveJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ queueName, jobId }: { queueName: string; jobId: string }) =>
      queueService.removeJob(queueName, jobId),
    onSuccess: (_, { queueName }) => {
      queryClient.invalidateQueries({ queryKey: [...queueKeys.all, 'queue', queueName] });
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('任务删除成功');
    },
    onError: () => {
      message.error('任务删除失败');
    },
  });
};

/**
 * 暂停队列 Mutation
 */
export const usePauseQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueName: string) => queueService.pauseQueue(queueName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('队列已暂停');
    },
    onError: () => {
      message.error('暂停队列失败');
    },
  });
};

/**
 * 恢复队列 Mutation
 */
export const useResumeQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueName: string) => queueService.resumeQueue(queueName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('队列已恢复');
    },
    onError: () => {
      message.error('恢复队列失败');
    },
  });
};

/**
 * 清空队列 Mutation
 */
export const useEmptyQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (queueName: string) => queueService.emptyQueue(queueName),
    onSuccess: (_, queueName) => {
      queryClient.invalidateQueries({ queryKey: [...queueKeys.all, 'queue', queueName] });
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('队列已清空');
    },
    onError: () => {
      message.error('清空队列失败');
    },
  });
};

/**
 * 清理已完成的任务 Mutation
 */
export const useCleanQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      queueName,
      grace = 24 * 3600 * 1000,
      type = 'completed',
    }: {
      queueName: string;
      grace?: number;
      type?: 'completed' | 'failed';
    }) => queueService.cleanQueue(queueName, grace, type),
    onSuccess: (_, { queueName }) => {
      queryClient.invalidateQueries({ queryKey: [...queueKeys.all, 'queue', queueName] });
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('队列清理成功');
    },
    onError: () => {
      message.error('清理队列失败');
    },
  });
};

// ============================================================================
// 测试功能
// ============================================================================

/**
 * 测试：发送邮件任务 Mutation
 */
export const useTestSendEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ to, subject, html }: { to: string; subject: string; html: string }) =>
      queueService.testSendEmail(to, subject, html),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('邮件任务已创建');
    },
    onError: () => {
      message.error('创建邮件任务失败');
    },
  });
};

/**
 * 测试：发送短信任务 Mutation
 */
export const useTestSendSms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phone, message: smsMessage }: { phone: string; message: string }) =>
      queueService.testSendSms(phone, smsMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('短信任务已创建');
    },
    onError: () => {
      message.error('创建短信任务失败');
    },
  });
};

/**
 * 测试：启动设备任务 Mutation
 */
export const useTestStartDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, userId }: { deviceId: string; userId?: string }) =>
      queueService.testStartDevice(deviceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.status() });
      message.success('设备启动任务已创建');
    },
    onError: () => {
      message.error('创建设备启动任务失败');
    },
  });
};
