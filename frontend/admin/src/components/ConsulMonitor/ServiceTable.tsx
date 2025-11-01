import { memo, useMemo } from 'react';
import { Table, Button, Space, Typography } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ServiceHealth } from './types';
import { getStatusTag } from './utils';

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
        render: (_, record) => <Text>{record.instances.length}</Text>,
      },
      {
        title: '健康实例',
        dataIndex: 'healthyCount',
        key: 'healthyCount',
        width: 120,
        align: 'center',
        render: (count: number) => <Text style={{ color: '#52c41a' }}>{count}</Text>,
      },
      {
        title: '异常实例',
        dataIndex: 'unhealthyCount',
        key: 'unhealthyCount',
        width: 120,
        align: 'center',
        render: (count: number) => (
          <Text style={{ color: count > 0 ? '#ff4d4f' : '#999' }}>{count}</Text>
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
