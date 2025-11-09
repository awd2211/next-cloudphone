import { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { AuditLog } from './constants';
import { getResourceTypeTag, getMethodTag, getStatusTag } from './utils';

interface UseAuditColumnsProps {
  onViewDetails: (record: AuditLog) => void;
}

export const useAuditColumns = ({ onViewDetails }: UseAuditColumnsProps): ColumnsType<AuditLog> => {
  return useMemo(
    () => [
      {
        title: '时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      },
      {
        title: '操作人',
        dataIndex: 'userName',
        key: 'userName',
        width: 100,
        sorter: (a, b) => a.userName.localeCompare(b.userName),
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 150,
        ellipsis: true,
        sorter: (a, b) => a.action.localeCompare(b.action),
      },
      {
        title: '资源类型',
        dataIndex: 'resourceType',
        key: 'resourceType',
        width: 100,
        sorter: (a, b) => a.resourceType.localeCompare(b.resourceType),
        render: (type: AuditLog['resourceType']) => getResourceTypeTag(type),
      },
      {
        title: '方法',
        dataIndex: 'method',
        key: 'method',
        width: 80,
        sorter: (a, b) => a.method.localeCompare(b.method),
        render: (method: AuditLog['method']) => getMethodTag(method),
      },
      {
        title: 'IP 地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 130,
        sorter: (a, b) => a.ipAddress.localeCompare(b.ipAddress),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status: AuditLog['status']) => getStatusTag(status),
      },
      {
        title: '详情',
        dataIndex: 'details',
        key: 'details',
        ellipsis: { showTitle: false },
        render: (details?: string) => (
          <Tooltip placement="topLeft" title={details}>
            {details}
          </Tooltip>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 80,
        fixed: 'right',
        render: (_, record) => (
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onViewDetails(record)}
            />
          </Tooltip>
        ),
      },
    ],
    [onViewDetails]
  );
};
