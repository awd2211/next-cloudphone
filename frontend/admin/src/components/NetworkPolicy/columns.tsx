import { useMemo } from 'react';
import { Space, Button, Switch, Tag } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { NetworkPolicy } from './types';
import { getDirectionTag, getActionTag, formatDestination, formatBandwidth } from './utils';
import { NEUTRAL_LIGHT } from '@/theme';

interface UseNetworkPolicyColumnsOptions {
  onEdit: (policy: NetworkPolicy) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, isEnabled: boolean) => void;
}

/**
 * 网络策略表格列定义 Hook
 */
export const useNetworkPolicyColumns = ({
  onEdit,
  onDelete,
  onToggle,
}: UseNetworkPolicyColumnsOptions): ColumnsType<NetworkPolicy> => {
  return useMemo(
    () => [
      {
        title: '策略名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (name: string, record: NetworkPolicy) => (
          <Space direction="vertical" size={0}>
            <strong>{name}</strong>
            {record.description && (
              <span style={{ fontSize: '12px', color: NEUTRAL_LIGHT.text.tertiary }}>{record.description}</span>
            )}
          </Space>
        ),
      },
      {
        title: '方向',
        dataIndex: 'direction',
        key: 'direction',
        width: 100,
        sorter: (a, b) => a.direction.localeCompare(b.direction),
        render: (dir: string) => getDirectionTag(dir),
      },
      {
        title: '协议',
        dataIndex: 'protocol',
        key: 'protocol',
        width: 100,
        sorter: (a, b) => (a.protocol || '').localeCompare(b.protocol || ''),
        render: (proto?: string) => <Tag>{proto || 'all'}</Tag>,
      },
      {
        title: '源地址',
        dataIndex: 'sourceIp',
        key: 'sourceIp',
        width: 150,
        sorter: (a, b) => (a.sourceIp || '').localeCompare(b.sourceIp || ''),
        render: (ip?: string) => ip || '*',
      },
      {
        title: '目标地址',
        key: 'dest',
        width: 180,
        render: (_: any, record: NetworkPolicy) => formatDestination(record.destIp, record.destPort),
      },
      {
        title: '动作',
        dataIndex: 'action',
        key: 'action',
        width: 100,
        sorter: (a, b) => a.action.localeCompare(b.action),
        render: (action: string) => getActionTag(action),
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 100,
        align: 'center',
        sorter: (a: NetworkPolicy, b: NetworkPolicy) => a.priority - b.priority,
      },
      {
        title: '带宽限制',
        dataIndex: 'bandwidthLimit',
        key: 'bandwidthLimit',
        width: 120,
        render: (limit?: number) => formatBandwidth(limit),
      },
      {
        title: '状态',
        dataIndex: 'isEnabled',
        key: 'isEnabled',
        width: 100,
        render: (enabled: boolean, record: NetworkPolicy) => (
          <Switch checked={enabled} onChange={(checked) => onToggle(record.id, checked)} />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 180,
        fixed: 'right',
        render: (_: any, record: NetworkPolicy) => (
          <Space size="small">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record.id)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [onEdit, onDelete, onToggle]
  );
};
