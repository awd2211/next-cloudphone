import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  message,
  Tag,
  Popconfirm,
  Modal,
  Descriptions,
  Progress,
  Alert,
  Form,
  Input,
  Select,
  Tabs,
} from 'antd';
import {
  DatabaseOutlined,
  ReloadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  RetweetOutlined,
  EyeOutlined,
  ClearOutlined,
  SendOutlined,
} from '@ant-design/icons';
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
import dayjs from 'dayjs';

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

  // 队列表格列
  const queueColumns = [
    {
      title: '队列名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'isPaused',
      key: 'isPaused',
      width: 100,
      render: (isPaused: boolean) => (
        <Tag color={isPaused ? 'red' : 'green'}>{isPaused ? '已暂停' : '运行中'}</Tag>
      ),
    },
    {
      title: '等待',
      dataIndex: ['counts', 'waiting'],
      key: 'waiting',
      width: 80,
      render: (count: number) => <Tag color="orange">{count}</Tag>,
    },
    {
      title: '处理中',
      dataIndex: ['counts', 'active'],
      key: 'active',
      width: 80,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '已完成',
      dataIndex: ['counts', 'completed'],
      key: 'completed',
      width: 80,
      render: (count: number) => <Tag color="green">{count}</Tag>,
    },
    {
      title: '失败',
      dataIndex: ['counts', 'failed'],
      key: 'failed',
      width: 80,
      render: (count: number) => <Tag color="red">{count}</Tag>,
    },
    {
      title: '延迟',
      dataIndex: ['counts', 'delayed'],
      key: 'delayed',
      width: 80,
      render: (count: number) => <Tag>{count}</Tag>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      render: (_: any, record: QueueStatus) => (
        <Space size="small">
          {record.isPaused ? (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleResumeQueue(record.name)}
            >
              恢复
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handlePauseQueue(record.name)}
            >
              暂停
            </Button>
          )}

          <Popconfirm
            title="清空队列"
            description="确定清空此队列的所有任务？"
            onConfirm={() => handleEmptyQueue(record.name)}
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<ClearOutlined />}>
              清空
            </Button>
          </Popconfirm>

          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedQueue(record.name);
              setJobStatus('waiting');
            }}
          >
            查看任务
          </Button>
        </Space>
      ),
    },
  ];

  // 任务表格列
  const jobColumns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => id.substring(0, 8),
    },
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number) => <Progress percent={progress} size="small" />,
    },
    {
      title: '尝试次数',
      dataIndex: 'attemptsMade',
      key: 'attemptsMade',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (timestamp: number) => dayjs(timestamp).format('MM-DD HH:mm:ss'),
    },
    {
      title: '失败原因',
      dataIndex: 'failedReason',
      key: 'failedReason',
      width: 200,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: QueueJob) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewJobDetail(selectedQueue, record.id)}
          >
            详情
          </Button>

          {jobStatus === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<RetweetOutlined />}
              onClick={() => handleRetryJob(selectedQueue, record.id)}
            >
              重试
            </Button>
          )}

          <Popconfirm
            title="确定删除此任务？"
            onConfirm={() => handleRemoveJob(selectedQueue, record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="队列管理"
          description="管理 BullMQ 任务队列。支持队列暂停/恢复、任务重试、批量清理等操作。包含邮件、短信、设备启动等异步任务队列。"
          type="info"
          showIcon
        />

        {/* 统计信息 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="队列总数"
                value={summary?.totalQueues || 0}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="等待任务"
                value={summary?.totalWaiting || 0}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="处理中任务"
                value={summary?.totalActive || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="失败任务"
                value={summary?.totalFailed || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 队列列表和任务列表 */}
        <Card>
          <Tabs>
            <TabPane tab="队列概览" key="queues">
              <Space style={{ marginBottom: 16 }}>
                <Button icon={<ReloadOutlined />} onClick={loadQueuesStatus}>
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => setTestModalVisible(true)}
                >
                  测试任务
                </Button>
              </Space>

              <Table
                columns={queueColumns}
                dataSource={queues}
                rowKey="name"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>

            <TabPane tab="任务列表" key="jobs" disabled={!selectedQueue}>
              <Space style={{ marginBottom: 16 }} wrap>
                <span>
                  当前队列: <Tag color="blue">{selectedQueue}</Tag>
                </span>

                <Select value={jobStatus} onChange={setJobStatus} style={{ width: 120 }}>
                  <Select.Option value="waiting">等待中</Select.Option>
                  <Select.Option value="active">处理中</Select.Option>
                  <Select.Option value="completed">已完成</Select.Option>
                  <Select.Option value="failed">失败</Select.Option>
                  <Select.Option value="delayed">延迟</Select.Option>
                </Select>

                <Button icon={<ReloadOutlined />} onClick={loadJobs}>
                  刷新
                </Button>

                {jobStatus === 'completed' && (
                  <Button onClick={() => handleCleanQueue(selectedQueue, 'completed')}>
                    清理已完成
                  </Button>
                )}

                {jobStatus === 'failed' && (
                  <Button danger onClick={() => handleCleanQueue(selectedQueue, 'failed')}>
                    清理失败任务
                  </Button>
                )}
              </Space>

              <Table
                columns={jobColumns}
                dataSource={jobs}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 任务详情 Modal */}
      <Modal
        title="任务详情"
        open={jobDetailVisible}
        onCancel={() => setJobDetailVisible(false)}
        footer={null}
        width={800}
      >
        {jobDetail && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="任务ID">{jobDetail.id}</Descriptions.Item>
            <Descriptions.Item label="任务名称">{jobDetail.name}</Descriptions.Item>
            <Descriptions.Item label="进度">
              <Progress percent={jobDetail.progress} />
            </Descriptions.Item>
            <Descriptions.Item label="尝试次数">{jobDetail.attemptsMade}</Descriptions.Item>
            <Descriptions.Item label="延迟">{jobDetail.delay}ms</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(jobDetail.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {jobDetail.processedOn && (
              <Descriptions.Item label="处理时间">
                {dayjs(jobDetail.processedOn).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {jobDetail.finishedOn && (
              <Descriptions.Item label="完成时间">
                {dayjs(jobDetail.finishedOn).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {jobDetail.failedReason && (
              <Descriptions.Item label="失败原因">
                <Alert message={jobDetail.failedReason} type="error" />
              </Descriptions.Item>
            )}
            {jobDetail.stacktrace && jobDetail.stacktrace.length > 0 && (
              <Descriptions.Item label="堆栈跟踪">
                <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {jobDetail.stacktrace.join('\n')}
                </pre>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="任务数据">
              <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
                {JSON.stringify(jobDetail.data, null, 2)}
              </pre>
            </Descriptions.Item>
            {jobDetail.returnvalue && (
              <Descriptions.Item label="返回值">
                <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(jobDetail.returnvalue, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 测试任务 Modal */}
      <Modal
        title="创建测试任务"
        open={testModalVisible}
        onOk={handleTestJob}
        onCancel={() => {
          setTestModalVisible(false);
          testForm.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form form={testForm} layout="vertical">
          <Form.Item label="任务类型">
            <Select value={testType} onChange={setTestType}>
              <Select.Option value="email">发送邮件</Select.Option>
              <Select.Option value="sms">发送短信</Select.Option>
              <Select.Option value="device">启动设备</Select.Option>
            </Select>
          </Form.Item>

          {testType === 'email' && (
            <>
              <Form.Item name="to" label="收件人邮箱" rules={[{ required: true }]}>
                <Input placeholder="test@example.com" />
              </Form.Item>
              <Form.Item name="subject" label="邮件主题" rules={[{ required: true }]}>
                <Input placeholder="测试邮件" />
              </Form.Item>
              <Form.Item name="html" label="邮件内容" rules={[{ required: true }]}>
                <Input.TextArea rows={4} placeholder="<h1>测试邮件</h1>" />
              </Form.Item>
            </>
          )}

          {testType === 'sms' && (
            <>
              <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
                <Input placeholder="13800138000" />
              </Form.Item>
              <Form.Item name="message" label="短信内容" rules={[{ required: true }]}>
                <Input.TextArea rows={3} placeholder="这是一条测试短信" />
              </Form.Item>
            </>
          )}

          {testType === 'device' && (
            <>
              <Form.Item name="deviceId" label="设备ID" rules={[{ required: true }]}>
                <Input placeholder="device-uuid" />
              </Form.Item>
              <Form.Item name="userId" label="用户ID (可选)">
                <Input placeholder="user-uuid" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default QueueManagement;
