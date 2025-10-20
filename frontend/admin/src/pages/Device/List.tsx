import { Table, Tag, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  androidVersion: string;
  cpu: string;
  memory: string;
  createdAt: string;
}

const DeviceList = () => {
  const columns: ColumnsType<Device> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          online: 'green',
          offline: 'default',
          busy: 'orange',
        };
        const textMap: Record<string, string> = {
          online: '在线',
          offline: '离线',
          busy: '使用中',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      },
    },
    {
      title: '安卓版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
    },
    {
      title: 'CPU',
      dataIndex: 'cpu',
      key: 'cpu',
    },
    {
      title: '内存',
      dataIndex: 'memory',
      key: 'memory',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <a>查看</a>
          <a>编辑</a>
          <a>删除</a>
        </Space>
      ),
    },
  ];

  const data: Device[] = [
    {
      id: 'device-001',
      name: 'Android-1',
      status: 'online',
      androidVersion: '11.0',
      cpu: '4核',
      memory: '4GB',
      createdAt: '2025-01-15',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}>
          创建设备
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" />
    </div>
  );
};

export default DeviceList;
