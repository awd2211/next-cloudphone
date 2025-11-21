import { useState, useEffect, useCallback } from 'react';
import { message, Form } from 'antd';
import {
  getAllQueuesStatus,
  getQueueJobs,
  getJobDetail,
  retryJob,
  removeJob,
  pauseQueue,
  resumeQueue,
  emptyQueue,
  cleanQueue,
  testSendEmail,
  testSendSms,
  testStartDevice,
} from '@/services/queue';
import type { QueueJobDetail } from '@/types';
import { useValidatedQuery } from '@/hooks/utils';
import { QueuesStatusResponseSchema, QueueJobsResponseSchema, QueueJobDetailSchema } from '@/schemas/api.schemas';

/**
 * 队列管理 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化事件处理函数
 * 3. ✅ 统一错误处理
 * 4. ✅ 自动刷新机制
 */
export const useQueueManagement = () => {
  // ===== 状态管理 =====
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<
    'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  >('waiting');
  const [jobDetailVisible, setJobDetailVisible] = useState(false);
  const [jobDetail, setJobDetail] = useState<QueueJobDetail | null>(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testType, setTestType] = useState<'email' | 'sms' | 'device'>('email');

  const [testForm] = Form.useForm();

  // ✅ 使用 useValidatedQuery 加载队列状态
  const {
    data: queuesStatusResponse,
    refetch: loadQueuesStatus,
  } = useValidatedQuery({
    queryKey: ['queues-status'],
    queryFn: getAllQueuesStatus,
    schema: QueuesStatusResponseSchema,
    apiErrorMessage: '加载队列状态失败',
    fallbackValue: { queues: [], summary: undefined },
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000, // 每10秒自动刷新
  });

  // ✅ 使用 useValidatedQuery 加载任务列表
  const {
    data: jobsResponse,
    isLoading: loading,
    refetch: loadJobs,
  } = useValidatedQuery({
    queryKey: ['queue-jobs', selectedQueue, jobStatus],
    queryFn: () => {
      if (!selectedQueue) return Promise.resolve({ jobs: [], total: 0 });
      return getQueueJobs(selectedQueue, jobStatus, 0, 50);
    },
    schema: QueueJobsResponseSchema,
    apiErrorMessage: '加载任务列表失败',
    fallbackValue: { jobs: [], total: 0 },
    enabled: !!selectedQueue,
    staleTime: 5 * 1000,
  });

  // ✅ 使用 useValidatedQuery 加载任务详情
  const {
    refetch: executeLoadJobDetail,
  } = useValidatedQuery({
    queryKey: ['job-detail'],
    queryFn: ({ queryKey }) => {
      const [, queueName, jobId] = queryKey as [string, string, string];
      return getJobDetail(queueName, jobId);
    },
    schema: QueueJobDetailSchema,
    apiErrorMessage: '加载任务详情失败',
    enabled: false, // 手动触发
  });

  // ===== 数据加载 =====
  /**
   * 自动选择第一个队列
   */
  useEffect(() => {
    if (!selectedQueue && queuesStatusResponse?.queues && queuesStatusResponse.queues.length > 0) {
      const firstQueueName = queuesStatusResponse.queues?.[0]?.name;
      if (firstQueueName) {
        setSelectedQueue(firstQueueName);
      }
    }
  }, [selectedQueue, queuesStatusResponse]);

  /**
   * 查看任务详情
   */
  const viewJobDetail = useCallback(async (_queueName: string, _jobId: string) => {
    // TODO: 需要重构 executeLoadJobDetail 以支持动态参数
    const { data: detail } = await executeLoadJobDetail();
    if (detail) {
      setJobDetail(detail);
      setJobDetailVisible(true);
    }
  }, [executeLoadJobDetail]);

  // ===== 任务操作 =====
  /**
   * 重试任务
   */
  const handleRetryJob = useCallback(
    async (queueName: string, jobId: string) => {
      try {
        await retryJob(queueName, jobId);
        message.success('任务已重试');
        loadJobs();
      } catch (error) {
        message.error('重试失败');
      }
    },
    [loadJobs]
  );

  /**
   * 删除任务
   */
  const handleRemoveJob = useCallback(
    async (queueName: string, jobId: string) => {
      try {
        await removeJob(queueName, jobId);
        message.success('任务已删除');
        loadJobs();
        loadQueuesStatus();
      } catch (error) {
        message.error('删除失败');
      }
    },
    [loadJobs, loadQueuesStatus]
  );

  // ===== 队列操作 =====
  /**
   * 暂停队列
   */
  const handlePauseQueue = useCallback(
    async (queueName: string) => {
      try {
        await pauseQueue(queueName);
        message.success(`队列 ${queueName} 已暂停`);
        loadQueuesStatus();
      } catch (error) {
        message.error('暂停失败');
      }
    },
    [loadQueuesStatus]
  );

  /**
   * 恢复队列
   */
  const handleResumeQueue = useCallback(
    async (queueName: string) => {
      try {
        await resumeQueue(queueName);
        message.success(`队列 ${queueName} 已恢复`);
        loadQueuesStatus();
      } catch (error) {
        message.error('恢复失败');
      }
    },
    [loadQueuesStatus]
  );

  /**
   * 清空队列
   */
  const handleEmptyQueue = useCallback(
    async (queueName: string) => {
      try {
        await emptyQueue(queueName);
        message.success(`队列 ${queueName} 已清空`);
        loadJobs();
        loadQueuesStatus();
      } catch (error) {
        message.error('清空失败');
      }
    },
    [loadJobs, loadQueuesStatus]
  );

  /**
   * 清理任务
   */
  const handleCleanQueue = useCallback(
    async (queueName: string, type: 'completed' | 'failed') => {
      try {
        await cleanQueue(queueName, 24 * 3600 * 1000, type); // 24小时
        message.success(`已清理 ${queueName} 中的 ${type} 任务`);
        loadJobs();
        loadQueuesStatus();
      } catch (error) {
        message.error('清理失败');
      }
    },
    [loadJobs, loadQueuesStatus]
  );

  // ===== 测试任务 =====
  /**
   * 测试创建任务
   */
  const handleTestJob = useCallback(async () => {
    try {
      const values = await testForm.validateFields();
      let res;

      if (testType === 'email') {
        res = await testSendEmail(values.to, values.subject, values.html);
      } else if (testType === 'sms') {
        res = await testSendSms(values.phone, values.message);
      } else {
        res = await testStartDevice(values.deviceId, values.userId);
      }

      message.success(`任务已创建: ${res.jobId}`);
      testForm.resetFields();
      setTestModalVisible(false);

      // 刷新数据
      setTimeout(() => {
        loadQueuesStatus();
        loadJobs();
      }, 500);
    } catch (error) {
      message.error('创建任务失败');
    }
  }, [testType, testForm, loadQueuesStatus, loadJobs]);

  /**
   * 处理队列选择
   */
  const handleSelectQueue = useCallback((queueName: string) => {
    setSelectedQueue(queueName);
    setJobStatus('waiting');
  }, []);

  /**
   * 关闭任务详情弹窗
   */
  const handleCloseJobDetail = useCallback(() => {
    setJobDetailVisible(false);
  }, []);

  /**
   * 打开测试任务弹窗
   */
  const handleOpenTestModal = useCallback(() => {
    setTestModalVisible(true);
  }, []);

  /**
   * 关闭测试任务弹窗
   */
  const handleCloseTestModal = useCallback(() => {
    setTestModalVisible(false);
    testForm.resetFields();
  }, [testForm]);


  // ===== 返回所有状态和方法 =====
  return {
    // 状态 - ✅ 从响应中提取
    summary: queuesStatusResponse?.summary || null,
    queues: queuesStatusResponse?.queues || [],
    selectedQueue,
    jobs: jobsResponse?.jobs || [],
    jobStatus,
    loading,
    jobDetailVisible,
    jobDetail,
    testModalVisible,
    testType,
    testForm,

    // 状态设置
    setJobStatus,
    setTestType,

    // 数据加载
    loadQueuesStatus,
    loadJobs,

    // 任务操作
    viewJobDetail,
    handleRetryJob,
    handleRemoveJob,

    // 队列操作
    handlePauseQueue,
    handleResumeQueue,
    handleEmptyQueue,
    handleCleanQueue,

    // 测试任务
    handleTestJob,

    // UI 操作
    handleSelectQueue,
    handleCloseJobDetail,
    handleOpenTestModal,
    handleCloseTestModal,
  };
};
