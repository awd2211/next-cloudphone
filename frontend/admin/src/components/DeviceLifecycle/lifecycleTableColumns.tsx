/**
 * lifecycleTableColumns - 生命周期表格列定义
 */
import { Space, Tooltip, Tag, Progress, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { NEUTRAL_LIGHT } from '@/theme';
import type { LifecycleRule, LifecycleExecutionHistory } from '@/types';
import {
  LifecycleTypeTag,
  LifecycleStatusTag,
  LifecycleExecutionStats,
  LifecycleRuleToggle,
  LifecycleRuleActions,
} from '@/components/Lifecycle';
import dayjs from 'dayjs';
import { createTimeColumn } from '@/utils/tableColumns';

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
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (name, record) => (
      <Space direction="vertical" size={0}>
        <strong>{name}</strong>
        {record.description && (
          <span style={{ fontSize: '12px', color: NEUTRAL_LIGHT.text.tertiary }}>{record.description}</span>
        )}
      </Space>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 120,
    sorter: (a, b) => a.type.localeCompare(b.type),
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
    sorter: (a, b) => (a.schedule || '').localeCompare(b.schedule || ''),
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
    sorter: (a, b) => {
      const timeA = a.nextExecutionAt ? new Date(a.nextExecutionAt).getTime() : 0;
      const timeB = b.nextExecutionAt ? new Date(b.nextExecutionAt).getTime() : 0;
      return timeA - timeB;
    },
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
    sorter: (a, b) => a.ruleName.localeCompare(b.ruleName),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    sorter: (a, b) => a.status.localeCompare(b.status),
    render: (status) => <LifecycleStatusTag status={status} />,
  },
  createTimeColumn<LifecycleExecutionHistory>('开始时间', 'startTime', { format: 'MM-DD HH:mm:ss', width: 160 }),
  createTimeColumn<LifecycleExecutionHistory>('结束时间', 'endTime', { format: 'MM-DD HH:mm:ss', width: 160 }),
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
    sorter: (a, b) => a.affectedDevices - b.affectedDevices,
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
    sorter: (a, b) => a.executedBy?.localeCompare(b.executedBy ?? "") ?? 0,
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
