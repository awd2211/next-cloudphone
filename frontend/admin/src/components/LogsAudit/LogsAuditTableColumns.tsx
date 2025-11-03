import { useMemo } from 'react';
import { Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { AuditLog } from '@/services/log';
import dayjs from 'dayjs';
import {
  ACTION_COLORS,
  METHOD_COLORS,
  getStatusColor,
  getDurationColor,
} from './constants';

interface UseLogsAuditColumnsProps {
  onViewDetail: (record: AuditLog) => void;
}

export const useLogsAuditColumns = ({
  onViewDetail,
}: UseLogsAuditColumnsProps): ColumnsType<AuditLog> => {
  return useMemo(
    () => [
      {
        title: '用户',
        dataIndex: 'user',
        key: 'user',
        width: 120,
        sorter: (a, b) => (a.user?.username || '').localeCompare(b.user?.username || ''),
        render: (user: any) => user?.username || '-',
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 120,
        sorter: (a, b) => a.action.localeCompare(b.action),
        render: (action: string) => {
          const color = ACTION_COLORS[action.toLowerCase()] || 'default';
          return <Tag color={color}>{action}</Tag>;
        },
      },
      {
        title: '资源',
        dataIndex: 'resource',
        key: 'resource',
        width: 120,
        sorter: (a, b) => a.resource.localeCompare(b.resource),
      },
      {
        title: '资源ID',
        dataIndex: 'resourceId',
        key: 'resourceId',
        width: 100,
        ellipsis: true,
        render: (id: string) => id || '-',
      },
      {
        title: '请求方法',
        dataIndex: 'method',
        key: 'method',
        width: 100,
        sorter: (a, b) => a.method.localeCompare(b.method),
        render: (method: string) => {
          const color = METHOD_COLORS[method] || 'default';
          return <Tag color={color}>{method}</Tag>;
        },
      },
      {
        title: 'IP地址',
        dataIndex: 'ip',
        key: 'ip',
        width: 130,
        sorter: (a, b) => a.ip.localeCompare(b.ip),
      },
      {
        title: '状态码',
        dataIndex: 'responseStatus',
        key: 'responseStatus',
        width: 90,
        sorter: (a, b) => a.responseStatus - b.responseStatus,
        render: (status: number) => {
          const color = getStatusColor(status);
          return <Tag color={color}>{status}</Tag>;
        },
      },
      {
        title: '耗时(ms)',
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        sorter: (a, b) => a.duration - b.duration,
        render: (duration: number) => {
          const color = getDurationColor(duration);
          return <Tag color={color}>{duration}</Tag>;
        },
      },
      {
        title: '操作时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '操作',
        key: 'action',
        width: 80,
        fixed: 'right',
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onViewDetail(record)}
          >
            详情
          </Button>
        ),
      },
    ],
    [onViewDetail]
  );
};
