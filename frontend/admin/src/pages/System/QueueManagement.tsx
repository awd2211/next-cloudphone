import { useState, useEffect } from 'react';
import {
  Card,
  Space,
  message,
  Alert,
  Form,
  Tabs,
} from 'antd';
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
import {
  QueueStatsCards,
  QueueOverviewTab,
  JobListTab,
  JobDetailModal,
  TestJobModal,
} from '@/components/Queue';

const { TabPane } = Tabs;

const QueueManagement = () => {
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

  // 加载所有队列状态
  const loadQueuesStatus = async () => {
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
  };

  // 加载指定队列的任务列表
  const loadJobs = async () => {
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
  };

  // 查看任务详情
  const viewJobDetail = async (queueName: string, jobId: string) => {
    try {
      const res = await getJobDetail(queueName, jobId);
      setJobDetail(res);
      setJobDetailVisible(true);
    } catch (error) {
      message.error('加载任务详情失败');
    }
  };

  // 重试任务
  const handleRetryJob = async (queueName: string, jobId: string) => {
    try {
      await retryJob(queueName, jobId);
      message.success('任务已重试');
      loadJobs();
    } catch (error) {
      message.error('重试失败');
    }
  };

  // 删除任务
  const handleRemoveJob = async (queueName: string, jobId: string) => {
    try {
      await removeJob(queueName, jobId);
      message.success('任务已删除');
      loadJobs();
      loadQueuesStatus();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 暂停队列
  const handlePauseQueue = async (queueName: string) => {
    try {
      await pauseQueue(queueName);
      message.success(`队列 ${queueName} 已暂停`);
      loadQueuesStatus();
    } catch (error) {
      message.error('暂停失败');
    }
  };

  // 恢复队列
  const handleResumeQueue = async (queueName: string) => {
    try {
      await resumeQueue(queueName);
      message.success(`队列 ${queueName} 已恢复`);
      loadQueuesStatus();
    } catch (error) {
      message.error('恢复失败');
    }
  };

  // 清空队列
  const handleEmptyQueue = async (queueName: string) => {
    try {
      await emptyQueue(queueName);
      message.success(`队列 ${queueName} 已清空`);
      loadJobs();
      loadQueuesStatus();
    } catch (error) {
      message.error('清空失败');
    }
  };

  // 清理任务
  const handleCleanQueue = async (queueName: string, type: 'completed' | 'failed') => {
    try {
      await cleanQueue(queueName, 24 * 3600 * 1000, type); // 24小时
      message.success(`已清理 ${queueName} 中的 ${type} 任务`);
      loadJobs();
      loadQueuesStatus();
    } catch (error) {
      message.error('清理失败');
    }
  };

  // 测试创建任务
  const handleTestJob = async () => {
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
  };

  useEffect(() => {
    loadQueuesStatus();
    const interval = setInterval(loadQueuesStatus, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      loadJobs();
    }
  }, [selectedQueue, jobStatus]);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="队列管理"
          description="管理 BullMQ 任务队列。支持队列暂停/恢复、任务重试、批量清理等操作。包含邮件、短信、设备启动等异步任务队列。"
          type="info"
          showIcon
        />

        <QueueStatsCards summary={summary} />

        <Card>
          <Tabs>
            <TabPane tab="队列概览" key="queues">
              <QueueOverviewTab
                queues={queues}
                onRefresh={loadQueuesStatus}
                onTestJob={() => setTestModalVisible(true)}
                onPauseQueue={handlePauseQueue}
                onResumeQueue={handleResumeQueue}
                onEmptyQueue={handleEmptyQueue}
                onSelectQueue={(queueName) => {
                  setSelectedQueue(queueName);
                  setJobStatus('waiting');
                }}
              />
            </TabPane>

            <TabPane tab="任务列表" key="jobs" disabled={!selectedQueue}>
              <JobListTab
                selectedQueue={selectedQueue}
                jobStatus={jobStatus}
                jobs={jobs}
                loading={loading}
                onJobStatusChange={setJobStatus}
                onRefresh={loadJobs}
                onCleanQueue={handleCleanQueue}
                onViewJobDetail={viewJobDetail}
                onRetryJob={handleRetryJob}
                onRemoveJob={handleRemoveJob}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      <JobDetailModal
        visible={jobDetailVisible}
        jobDetail={jobDetail}
        onClose={() => setJobDetailVisible(false)}
      />

      <TestJobModal
        visible={testModalVisible}
        testType={testType}
        form={testForm}
        onTestTypeChange={setTestType}
        onOk={handleTestJob}
        onCancel={() => {
          setTestModalVisible(false);
          testForm.resetFields();
        }}
      />
    </div>
  );
};

export default QueueManagement;
