import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SchedulerNode, SchedulingTask } from '@/services/scheduler';
import {
  NodeStatusTag,
  ResourceUsageProgress,
  NodeDeviceCount,
  NodeActions,
} from '@/components/Scheduler';
import dayjs from 'dayjs';

interface NodeColumnHandlers {
  onEdit: (node?: SchedulerNode) => void;
  onToggleMaintenance: (id: string, enable: boolean) => void;
  onDrain: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetail: (node: SchedulerNode) => void;
}

export const createNodeColumns = (handlers: NodeColumnHandlers): ColumnsType<SchedulerNode> => [
  {
    title: '节点名称',
    dataIndex: 'name',
    key: 'name',
    width: 150,
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (name, record) => <a onClick={() => handlers.onViewDetail(record)}>{name}</a>,
  },
  {
    title: '地址',
    key: 'address',
    width: 200,
    render: (_, record) => `${record.host}:${record.port}`,
  },
  {
    title: '区域',
    key: 'location',
    width: 150,
    render: (_, record) => {
      if (!record.region && !record.zone) return '-';
      return `${record.region || ''}/${record.zone || ''}`;
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 120,
    sorter: (a, b) => a.status.localeCompare(b.status),
    render: (status) => <NodeStatusTag status={status} />,
  },
  {
    title: 'CPU使用率',
    key: 'cpuUsage',
    width: 150,
    render: (_, record) => (
      <ResourceUsageProgress type="cpu" usage={record.usage.cpu} capacity={record.capacity.cpu} />
    ),
  },
  {
    title: '内存使用率',
    key: 'memoryUsage',
    width: 150,
    render: (_, record) => (
      <ResourceUsageProgress
        type="memory"
        usage={record.usage.memory}
        capacity={record.capacity.memory}
        isMemoryInGB
      />
    ),
  },
  {
    title: '设备数',
    key: 'deviceCount',
    width: 120,
    align: 'center',
    render: (_, record) => (
      <NodeDeviceCount
        deviceCount={record.usage.deviceCount}
        maxDevices={record.capacity.maxDevices}
      />
    ),
  },
  {
    title: '最后心跳',
    dataIndex: 'lastHeartbeat',
    key: 'lastHeartbeat',
    width: 160,
    sorter: (a, b) => {
      const timeA = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
      const timeB = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
      return timeA - timeB;
    },
    render: (time) => (time ? dayjs(time).format('MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 240,
    fixed: 'right',
    render: (_, record) => (
      <NodeActions
        node={record}
        onEdit={handlers.onEdit}
        onToggleMaintenance={handlers.onToggleMaintenance}
        onDrain={handlers.onDrain}
        onDelete={handlers.onDelete}
      />
    ),
  },
];

export const createTaskColumns = (): ColumnsType<SchedulingTask> => [
  {
    title: '任务ID',
    dataIndex: 'id',
    key: 'id',
    width: 100,
    sorter: (a, b) => a.id.localeCompare(b.id),
    render: (id) => id.substring(0, 8),
  },
  {
    title: '设备ID',
    dataIndex: 'deviceId',
    key: 'deviceId',
    width: 100,
    sorter: (a, b) => a.deviceId.localeCompare(b.deviceId),
    render: (id) => id.substring(0, 8),
  },
  {
    title: '用户ID',
    dataIndex: 'userId',
    key: 'userId',
    width: 100,
    sorter: (a, b) => a.userId.localeCompare(b.userId),
    render: (id) => id.substring(0, 8),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    sorter: (a, b) => a.status.localeCompare(b.status),
    render: (status) => {
      const colorMap: Record<string, string> = {
        pending: 'default',
        scheduled: 'processing',
        running: 'success',
        completed: 'success',
        failed: 'error',
      };
      return <Tag color={colorMap[status]}>{status}</Tag>;
    },
  },
  {
    title: '节点ID',
    dataIndex: 'nodeId',
    key: 'nodeId',
    width: 100,
    sorter: (a, b) => (a.nodeId || '').localeCompare(b.nodeId || ''),
    render: (id) => (id ? id.substring(0, 8) : '-'),
  },
  {
    title: '资源需求',
    key: 'requirements',
    width: 200,
    render: (_, record) => (
      <div style={{ fontSize: '12px' }}>
        <div>CPU: {record.requirements.cpuCores}核</div>
        <div>内存: {(record.requirements.memoryMB / 1024).toFixed(1)}GB</div>
      </div>
    ),
  },
  {
    title: '请求时间',
    dataIndex: 'requestedAt',
    key: 'requestedAt',
    width: 160,
    sorter: (a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime(),
    render: (time) => dayjs(time).format('MM-DD HH:mm:ss'),
  },
];
