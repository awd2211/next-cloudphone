import { useMemo, useCallback } from 'react';
import { Space, Tag, Badge, Button, Tooltip } from 'antd';
import { EyeOutlined, MessageOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  Ticket,
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  PRIORITY_ORDER,
} from './constants';

interface UseTicketTableColumnsProps {
  onViewDetail: (ticket: Ticket) => void;
}

export const useTicketTableColumns = ({ onViewDetail }: UseTicketTableColumnsProps) => {
  // 使用 useCallback 优化渲染函数
  const getCategoryTag = useCallback((category: Ticket['category']) => {
    const config = CATEGORY_CONFIG[category];
    return <Tag color={config.color}>{config.text}</Tag>;
  }, []);

  const getPriorityTag = useCallback((priority: Ticket['priority']) => {
    const config = PRIORITY_CONFIG[priority];
    return <Tag color={config.color}>{config.text}</Tag>;
  }, []);

  const getStatusBadge = useCallback((status: Ticket['status']) => {
    const config = STATUS_CONFIG[status] as any;
    return <Badge status={config.status} text={config.text} />;
  }, []);

  // 使用 useMemo 缓存 columns 配置
  const columns: ColumnsType<Ticket> = useMemo(
    () => [
      {
        title: '工单编号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 160,
        sorter: (a, b) => a.ticketNo.localeCompare(b.ticketNo),
        render: (ticketNo: string, record: Ticket) => (
          <Space>
            <a onClick={() => onViewDetail(record)}>{ticketNo}</a>
            {record.unreadReplies > 0 && <Badge count={record.unreadReplies} size="small" />}
          </Space>
        ),
      },
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        ellipsis: true,
        sorter: (a, b) => a.title.localeCompare(b.title),
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 110,
        sorter: (a, b) => a.category.localeCompare(b.category),
        render: (category: Ticket['category']) => getCategoryTag(category),
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 90,
        render: (priority: Ticket['priority']) => getPriorityTag(priority),
        sorter: (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status: Ticket['status']) => getStatusBadge(status),
      },
      {
        title: '提交人',
        dataIndex: 'userName',
        key: 'userName',
        width: 100,
        sorter: (a, b) => a.userName.localeCompare(b.userName),
      },
      {
        title: '负责人',
        dataIndex: 'assignedToName',
        key: 'assignedToName',
        width: 100,
        sorter: (a, b) => (a.assignedToName || '').localeCompare(b.assignedToName || ''),
        render: (name?: string) => name || <Tag>未分配</Tag>,
      },
      {
        title: '回复数',
        dataIndex: 'replyCount',
        key: 'replyCount',
        width: 80,
        align: 'center',
        sorter: (a, b) => a.replyCount - b.replyCount,
        render: (count: number) => (
          <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
        ),
      },
      {
        title: '最后更新',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Tooltip title="查看详情">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewDetail(record)}
              />
            </Tooltip>
            <Tooltip title="快速回复">
              <Button
                type="link"
                size="small"
                icon={<MessageOutlined />}
                onClick={() => onViewDetail(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [getCategoryTag, getPriorityTag, getStatusBadge, onViewDetail]
  );

  return columns;
};
