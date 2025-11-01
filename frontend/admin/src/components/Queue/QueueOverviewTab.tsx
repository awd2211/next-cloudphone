import { memo } from 'react';
import { Table, Button, Space, Tag, Popconfirm } from 'antd';
import { ReloadOutlined, SendOutlined, PlayCircleOutlined, PauseCircleOutlined, ClearOutlined } from '@ant-design/icons';
import type { QueueStatus } from '@/types';

interface QueueOverviewTabProps {
  queues: QueueStatus[];
  onRefresh: () => void;
  onTestJob: () => void;
  onPauseQueue: (queueName: string) => void;
  onResumeQueue: (queueName: string) => void;
  onEmptyQueue: (queueName: string) => void;
  onSelectQueue: (queueName: string) => void;
}

export const QueueOverviewTab = memo<QueueOverviewTabProps>(({
  queues,
  onRefresh,
  onTestJob,
  onPauseQueue,
  onResumeQueue,
  onEmptyQueue,
  onSelectQueue,
}) => {
  const columns = [
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
              onClick={() => onResumeQueue(record.name)}
            >
              恢复
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => onPauseQueue(record.name)}
            >
              暂停
            </Button>
          )}

          <Popconfirm
            title="清空队列"
            description="确定清空此队列的所有任务？"
            onConfirm={() => onEmptyQueue(record.name)}
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<ClearOutlined />}>
              清空
            </Button>
          </Popconfirm>

          <Button
            type="link"
            size="small"
            onClick={() => onSelectQueue(record.name)}
          >
            查看任务
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新
        </Button>
        <Button type="primary" icon={<SendOutlined />} onClick={onTestJob}>
          测试任务
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={queues}
        rowKey="name"
        pagination={{ pageSize: 10 }}
      />
    </>
  );
});

QueueOverviewTab.displayName = 'QueueOverviewTab';
