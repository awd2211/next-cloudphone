import type { ColumnsType } from 'antd/es/table';
import type { Quota } from '@/types';
import {
  QuotaStatusTag,
  QuotaUsageProgress,
  QuotaActions,
} from '@/components/Quota';

/**
 * 配额列表表格列配置
 */
export const createQuotaColumns = (
  onEdit: (record: Quota) => void,
  onViewDetail: (record: Quota) => void
): ColumnsType<Quota> => [
  {
    title: '用户ID',
    dataIndex: 'userId',
    key: 'userId',
    width: 200,
    ellipsis: true,
  },
  {
    title: '设备配额',
    key: 'devices',
    width: 180,
    render: (record: Quota) => (
      <QuotaUsageProgress
        used={record.usage.currentDevices}
        total={record.limits.maxDevices}
        showException
      />
    ),
  },
  {
    title: 'CPU 配额',
    key: 'cpu',
    width: 180,
    render: (record: Quota) => (
      <QuotaUsageProgress
        used={record.usage.usedCpuCores}
        total={record.limits.totalCpuCores}
        unit="核"
        showException={false}
      />
    ),
  },
  {
    title: '内存配额',
    key: 'memory',
    width: 180,
    render: (record: Quota) => (
      <QuotaUsageProgress
        used={record.usage.usedMemoryGB}
        total={record.limits.totalMemoryGB}
        unit="GB"
        showException={false}
      />
    ),
  },
  {
    title: '存储配额',
    key: 'storage',
    width: 180,
    render: (record: Quota) => (
      <QuotaUsageProgress
        used={record.usage.usedStorageGB}
        total={record.limits.totalStorageGB}
        unit="GB"
        showException={false}
      />
    ),
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (status: string) => <QuotaStatusTag status={status} />,
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right' as const,
    render: (record: Quota) => (
      <QuotaActions
        onEdit={() => onEdit(record)}
        onDetail={() => onViewDetail(record)}
      />
    ),
  },
];
