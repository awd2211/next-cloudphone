import { memo, useMemo } from 'react';
import { Table, Button, Space, Typography } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ServiceHealth } from './types';
import { getStatusTag } from './utils';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

const { Text } = Typography;

export interface ServiceTableProps {
  services: ServiceHealth[];
  loading: boolean;
  onViewDetail: (service: ServiceHealth) => void;
}

/**
 * 服务列表表格组件
 */
export const ServiceTable = memo<ServiceTableProps>(({ services, loading, onViewDetail }) => {
  const columns: ColumnsType<ServiceHealth> = useMemo(
    () => [
      {
        title: '服务名称',
        dataIndex: 'service',
        key: 'service',
        width: 200,
        sorter: (a, b) => a.service.localeCompare(b.service),
        render: (service: string) => (
          <Space>
            <ApiOutlined />
            <Text strong>{service}</Text>
          </Space>
        ),
      },
      {
        title: '实例数',
        key: 'instances',
        width: 120,
        align: 'center',
        sorter: (a, b) => a.instances.length - b.instances.length,
        render: (_, record) => <Text>{record.instances.length}</Text>,
      },
      {
        title: '健康实例',
        dataIndex: 'healthyCount',
        key: 'healthyCount',
        width: 120,
        align: 'center',
        sorter: (a, b) => a.healthyCount - b.healthyCount,
        render: (count: number) => <Text style={{ color: SEMANTIC.success.main }}>{count}</Text>,
      },
      {
        title: '异常实例',
        dataIndex: 'unhealthyCount',
        key: 'unhealthyCount',
        width: 120,
        align: 'center',
        sorter: (a, b) => a.unhealthyCount - b.unhealthyCount,
        render: (count: number) => (
          <Text style={{ color: count > 0 ? SEMANTIC.error.main : NEUTRAL_LIGHT.text.tertiary }}>{count}</Text>
        ),
      },
      {
        title: '整体状态',
        key: 'status',
        width: 120,
        render: (_, record) => {
          const hasUnhealthy = record.unhealthyCount > 0;
          const allUnhealthy = record.healthyCount === 0;
          return getStatusTag(allUnhealthy ? 'critical' : hasUnhealthy ? 'warning' : 'passing');
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Button type="link" onClick={() => onViewDetail(record)}>
            查看详情
          </Button>
        ),
      },
    ],
    [onViewDetail],
  );

  return (
    <Table
      columns={columns}
      dataSource={services}
      rowKey="service"
      loading={loading}
      pagination={false}
    />
  );
});

ServiceTable.displayName = 'ServiceTable';
