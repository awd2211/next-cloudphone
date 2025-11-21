import { useMemo } from 'react';
import { Tag, Button, Space, Badge } from 'antd';
import { WifiOutlined, UsbOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { PhysicalDevice } from '@/types';
import { statusConfig } from './physicalDeviceUtils';
import { createTimeColumn } from '@/utils/tableColumns';

interface PhysicalDeviceTableColumnsProps {
  onDelete: (id: string) => void;
}

export const usePhysicalDeviceTableColumns = ({
  onDelete,
}: PhysicalDeviceTableColumnsProps): ColumnsType<PhysicalDevice> => {
  const renderStatus = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  return useMemo(
    () => [
      {
        title: '设备名称',
        dataIndex: 'name',
        key: 'name',
        width: 200,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (text, record) => (
          <Space>
            <Badge status={record.status === 'online' ? 'success' : 'default'} />
            <span style={{ fontWeight: 500 }}>{text}</span>
          </Space>
        ),
      },
      {
        title: '序列号',
        dataIndex: 'serialNumber',
        key: 'serialNumber',
        width: 180,
        sorter: (a, b) => a.serialNumber.localeCompare(b.serialNumber),
        render: (text) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>,
      },
      {
        title: '设备信息',
        key: 'deviceInfo',
        width: 200,
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            {record.manufacturer && <span>{record.manufacturer}</span>}
            {record.model && (
              <span style={{ fontSize: '12px', color: '#999' }}>{record.model}</span>
            )}
            {record.androidVersion && (
              <Tag color="blue">
                Android {record.androidVersion}
              </Tag>
            )}
          </Space>
        ),
      },
      {
        title: '连接方式',
        dataIndex: 'connectionType',
        key: 'connectionType',
        width: 120,
        align: 'center',
        sorter: (a, b) => a.connectionType.localeCompare(b.connectionType),
        render: (type) =>
          type === 'network' ? (
            <Tag icon={<WifiOutlined />} color="blue">
              网络
            </Tag>
          ) : (
            <Tag icon={<UsbOutlined />} color="green">
              USB
            </Tag>
          ),
      },
      {
        title: 'IP 地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 150,
        sorter: (a, b) => (a.ipAddress || '').localeCompare(b.ipAddress || ''),
        render: (ip, record) => (ip && record.connectionType === 'network' ? ip : '-'),
      },
      {
        title: 'ADB 端口',
        dataIndex: 'adbPort',
        key: 'adbPort',
        width: 100,
        align: 'center',
        sorter: (a, b) => (a.adbPort || 0) - (b.adbPort || 0),
        render: (port) => port || '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        align: 'center',
        sorter: (a, b) => a.status.localeCompare(b.status),
        filters: [
          { text: '在线', value: 'online' },
          { text: '离线', value: 'offline' },
          { text: '未注册', value: 'unregistered' },
        ],
        render: renderStatus,
      },
      createTimeColumn<PhysicalDevice>('最后在线', 'lastSeenAt', { format: 'YYYY-MM-DD HH:mm' }),
      {
        title: '操作',
        key: 'action',
        width: 150,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            <Button type="link" size="small" danger onClick={() => onDelete(record.id)}>
              移除
            </Button>
          </Space>
        ),
      },
    ],
    [onDelete]
  );
};
