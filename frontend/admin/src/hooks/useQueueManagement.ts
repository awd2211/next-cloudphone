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
import type { QueueStatus, QueueJob, QueueJobDetail, QueueSummary } from '@/types';

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
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [queues, setQueues] = useState<QueueStatus[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [jobStatus, setJobStatus] = useState<
    'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  >('waiting');
  const [loading, setLoading] = useState(false);
  const [jobDetailVisible, setJobDetailVisible] = useState(false);
  const [jobDetail, setJobDetail] = useState<QueueJobDetail | null>(null);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testType, setTestType] = useState<'email' | 'sms' | 'device'>('email');

  const [testForm] = Form.useForm();

  // ===== 数据加载 =====
  /**
   * 加载所有队列状态
   */
  const loadQueuesStatus = useCallback(async () => {
    try {
      const res = await getAllQueuesStatus();
      setQueues(res.queues);
      setSummary(res.summary);

      // 如果还没选择队列，自动选择第一个
      if (!selectedQueue && res.queues.length > 0) {
        setSelectedQueue(res.queues[0].name);
      }
    } catch (error) {
      message.error('加载队列状态失败');
    }
  }, [selectedQueue]);

  /**
   * 加载指定队列的任务列表
   */
  const loadJobs = useCallback(async () => {
    if (!selectedQueue) return;

    setLoading(true);
    try {
      const res = await getQueueJobs(selectedQueue, jobStatus, 0, 50);
      setJobs(res.jobs);
    } catch (error) {
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [selectedQueue, jobStatus]);

  /**
   * 查看任务详情
   */
  const viewJobDetail = useCallback(async (queueName: string, jobId: string) => {
    try {
      const res = await getJobDetail(queueName, jobId);
      setJobDetail(res);
      setJobDetailVisible(true);
    } catch (error) {
      message.error('加载任务详情失败');
    }
  }, []);

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

  // ===== 副作用 =====
  // 初始加载和自动刷新
  useEffect(() => {
    loadQueuesStatus();
    const interval = setInterval(loadQueuesStatus, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, [loadQueuesStatus]);

  // 当队列或状态改变时，重新加载任务列表
  useEffect(() => {
    if (selectedQueue) {
      loadJobs();
    }
  }, [selectedQueue, jobStatus, loadJobs]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    summary,
    queues,
    selectedQueue,
    jobs,
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
