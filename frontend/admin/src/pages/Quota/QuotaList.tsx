import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Progress, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

interface Quota {
  id: string;
  userId: string;
  userName: string;
  limits: {
    maxDevices: number;
    totalCpuCores: number;
    totalMemoryGB: number;
    totalStorageGB: number;
  };
  usage: {
    currentDevices: number;
    usedCpuCores: number;
    usedMemoryGB: number;
    usedStorageGB: number;
  };
  status: string;
}

const QuotaList: React.FC = () => {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: '设备配额',
      key: 'devices',
      render: (record: Quota) => (
        <div>
          <div>{record.usage.currentDevices} / {record.limits.maxDevices}</div>
          <Progress
            percent={(record.usage.currentDevices / record.limits.maxDevices) * 100}
            size="small"
            status={record.usage.currentDevices > record.limits.maxDevices * 0.9 ? 'exception' : 'active'}
          />
        </div>
      ),
    },
    {
      title: 'CPU 配额',
      key: 'cpu',
      render: (record: Quota) => (
        <div>
          <div>{record.usage.usedCpuCores} / {record.limits.totalCpuCores} 核</div>
          <Progress
            percent={(record.usage.usedCpuCores / record.limits.totalCpuCores) * 100}
            size="small"
          />
        </div>
      ),
    },
    {
      title: '内存配额',
      key: 'memory',
      render: (record: Quota) => (
        <div>
          <div>{record.usage.usedMemoryGB} / {record.limits.totalMemoryGB} GB</div>
          <Progress
            percent={(record.usage.usedMemoryGB / record.limits.totalMemoryGB) * 100}
            size="small"
          />
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '超限'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: () => (
        <Space>
          <Button type="link" size="small">编辑</Button>
          <Button type="link" size="small">详情</Button>
        </Space>
      ),
    },
  ];

  // 配额使用率饼图
  const getUsageChartOption = () => ({
    title: { text: '配额使用率分布', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [
      {
        name: '配额使用',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 35, name: 'CPU' },
          { value: 28, name: '内存' },
          { value: 22, name: '存储' },
          { value: 15, name: '设备' },
        ],
      },
    ],
  });

  return (
    <div>
      <Card
        title="配额管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />}>
            创建配额
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={quotas}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card title="配额使用分析" style={{ marginTop: 16 }}>
        <ReactECharts option={getUsageChartOption()} style={{ height: 400 }} />
      </Card>
    </div>
  );
};

export default QuotaList;
