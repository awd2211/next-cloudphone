/**
 * lifecycleTableColumns - 生命周期表格列定义
 */
import { Space, Tooltip, Tag, Progress, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { LifecycleRule, LifecycleExecutionHistory } from '@/types';
import {
  LifecycleTypeTag,
  LifecycleStatusTag,
  LifecycleExecutionStats,
  LifecycleRuleToggle,
  LifecycleRuleActions,
} from '@/components/Lifecycle';
import dayjs from 'dayjs';

interface RuleColumnHandlers {
  onToggle: (id: string, enabled: boolean) => void;
  onExecute: (id: string, ruleName: string) => void;
  onTest: (id: string, ruleName: string) => void;
  onEdit: (rule: LifecycleRule) => void;
  onDelete: (id: string) => void;
}

interface HistoryColumnHandlers {
  onViewDetail: (history: LifecycleExecutionHistory) => void;
}

/**
 * 创建规则列表表格列定义
 */
export const createRuleColumns = (handlers: RuleColumnHandlers): ColumnsType<LifecycleRule> => [
  {
    title: '规则名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    render: (name, record) => (
      <Space direction="vertical" size={0}>
        <strong>{name}</strong>
        {record.description && (
          <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.description}</span>
        )}
      </Space>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 120,
    render: (type) => <LifecycleTypeTag type={type} />,
  },
  {
    title: '状态',
    dataIndex: 'enabled',
    key: 'enabled',
    width: 100,
    render: (enabled, record) => (
      <LifecycleRuleToggle ruleId={record.id} enabled={enabled} onToggle={handlers.onToggle} />
    ),
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
    align: 'center',
    sorter: (a, b) => a.priority - b.priority,
  },
  {
    title: '调度计划',
    dataIndex: 'schedule',
    key: 'schedule',
    width: 150,
    render: (schedule) => schedule || <Tag>手动触发</Tag>,
  },
  {
    title: '执行统计',
    key: 'execution',
    width: 150,
    render: (_, record) => (
      <LifecycleExecutionStats
        executionCount={record.executionCount}
        lastExecutedAt={record.lastExecutedAt}
      />
    ),
  },
  {
    title: '下次执行',
    dataIndex: 'nextExecutionAt',
    key: 'nextExecutionAt',
    width: 160,
    render: (time) =>
      time ? (
        <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(time).fromNow()}
        </Tooltip>
      ) : (
        '-'
      ),
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    fixed: 'right',
    render: (_, record) => (
      <LifecycleRuleActions
        rule={record}
        onExecute={handlers.onExecute}
        onTest={handlers.onTest}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
      />
    ),
  },
];

/**
 * 创建执行历史表格列定义
 */
export const createHistoryColumns = (
  handlers: HistoryColumnHandlers
): ColumnsType<LifecycleExecutionHistory> => [
  {
    title: '规则名称',
    dataIndex: 'ruleName',
    key: 'ruleName',
    width: 180,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status) => <LifecycleStatusTag status={status} />,
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    key: 'startTime',
    width: 160,
    render: (time) => dayjs(time).format('MM-DD HH:mm:ss'),
  },
  {
    title: '结束时间',
    dataIndex: 'endTime',
    key: 'endTime',
    width: 160,
    render: (time) => (time ? dayjs(time).format('MM-DD HH:mm:ss') : '-'),
  },
  {
    title: '耗时',
    key: 'duration',
    width: 100,
    render: (_, record) => {
      if (!record.endTime) return '-';
      const duration = dayjs(record.endTime).diff(dayjs(record.startTime), 'second');
      return `${duration}s`;
    },
  },
  {
    title: '影响设备',
    dataIndex: 'affectedDevices',
    key: 'affectedDevices',
    width: 100,
    align: 'center',
  },
  {
    title: '成功率',
    key: 'successRate',
    width: 120,
    render: (_, record) => {
      if (!record.details) return '-';
      const total = record.details.succeeded + record.details.failed;
      if (total === 0) return '-';
      const rate = (record.details.succeeded / total) * 100;
      return <Progress percent={Math.round(rate)} size="small" />;
    },
  },
  {
    title: '触发方式',
    dataIndex: 'executedBy',
    key: 'executedBy',
    width: 100,
    render: (type) => (type === 'manual' ? <Tag color="blue">手动</Tag> : <Tag>自动</Tag>),
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render: (_, record) => (
      <Button type="link" size="small" onClick={() => handlers.onViewDetail(record)}>
        查看详情
      </Button>
    ),
  },
];
