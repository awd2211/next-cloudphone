import { memo } from 'react';
import { Table, Button, Space, Tag, Select, Popconfirm, Progress } from 'antd';
import { ReloadOutlined, EyeOutlined, RetweetOutlined, DeleteOutlined } from '@ant-design/icons';
import type { QueueJob } from '@/types';
import dayjs from 'dayjs';

interface JobListTabProps {
  selectedQueue: string;
  jobStatus: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  jobs: QueueJob[];
  loading: boolean;
  onJobStatusChange: (status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed') => void;
  onRefresh: () => void;
  onCleanQueue: (queueName: string, type: 'completed' | 'failed') => void;
  onViewJobDetail: (queueName: string, jobId: string) => void;
  onRetryJob: (queueName: string, jobId: string) => void;
  onRemoveJob: (queueName: string, jobId: string) => void;
}

export const JobListTab = memo<JobListTabProps>(({
  selectedQueue,
  jobStatus,
  jobs,
  loading,
  onJobStatusChange,
  onRefresh,
  onCleanQueue,
  onViewJobDetail,
  onRetryJob,
  onRemoveJob,
}) => {
  const columns = [
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
            onClick={() => onViewJobDetail(selectedQueue, record.id)}
          >
            详情
          </Button>

          {jobStatus === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<RetweetOutlined />}
              onClick={() => onRetryJob(selectedQueue, record.id)}
            >
              重试
            </Button>
          )}

          <Popconfirm
            title="确定删除此任务？"
            onConfirm={() => onRemoveJob(selectedQueue, record.id)}
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
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <span>
          当前队列: <Tag color="blue">{selectedQueue}</Tag>
        </span>

        <Select value={jobStatus} onChange={onJobStatusChange} style={{ width: 120 }}>
          <Select.Option value="waiting">等待中</Select.Option>
          <Select.Option value="active">处理中</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
          <Select.Option value="failed">失败</Select.Option>
          <Select.Option value="delayed">延迟</Select.Option>
        </Select>

        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新
        </Button>

        {jobStatus === 'completed' && (
          <Button onClick={() => onCleanQueue(selectedQueue, 'completed')}>
            清理已完成
          </Button>
        )}

        {jobStatus === 'failed' && (
          <Button danger onClick={() => onCleanQueue(selectedQueue, 'failed')}>
            清理失败任务
          </Button>
        )}
      </Space>

      <Table
        columns={columns}
        dataSource={jobs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </>
  );
});

JobListTab.displayName = 'JobListTab';
