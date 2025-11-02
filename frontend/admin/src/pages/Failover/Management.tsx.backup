import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Descriptions,
  Drawer,
  Select,
  Input,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';

interface FailoverRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  sourceNode: string;
  targetNode: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  failureReason?: string;
  triggerType: 'manual' | 'automatic' | 'health_check';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
}

const FailoverManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    status: undefined as string | undefined,
    deviceId: '',
    page: 1,
    limit: 10,
  });
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FailoverRecord | null>(null);
  const [triggerModalVisible, setTriggerModalVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const queryClient = useQueryClient();

  // 查询故障转移记录
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['failover-records', searchParams],
    queryFn: async () => {
      const response = await request.get('/failover', { params: searchParams });
      return response;
    },
  });

  // 触发故障转移
  const triggerMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return await request.post(`/failover/trigger/${deviceId}`);
    },
    onSuccess: () => {
      message.success('故障转移已触发');
      setTriggerModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['failover-records'] });
    },
    onError: () => {
      message.error('触发故障转移失败');
    },
  });

  const columns: ColumnsType<FailoverRecord> = [
    {
      title: '设备ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 200,
      ellipsis: true,
    },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 150,
    },
    {
      title: '源节点',
      dataIndex: 'sourceNode',
      key: 'sourceNode',
      width: 120,
    },
    {
      title: '目标节点',
      dataIndex: 'targetNode',
      key: 'targetNode',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '等待中' },
          in_progress: { color: 'processing', text: '进行中' },
          completed: { color: 'success', text: '已完成' },
          failed: { color: 'error', text: '失败' },
          rolled_back: { color: 'warning', text: '已回滚' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '触发方式',
      dataIndex: 'triggerType',
      key: 'triggerType',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          manual: '手动',
          automatic: '自动',
          health_check: '健康检查',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startedAt',
      key: 'startedAt',
      width: 160,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => (duration ? `${duration}s` : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: FailoverRecord) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedRecord(record);
            setDetailDrawerVisible(true);
          }}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Alert
        message="故障转移说明"
        description="故障转移功能用于在设备或节点出现故障时，将设备迁移到健康的节点上，确保服务的高可用性。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 搜索区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="设备ID"
            value={searchParams.deviceId}
            onChange={(e) =>
              setSearchParams({ ...searchParams, deviceId: e.target.value })
            }
            style={{ width: 200 }}
          />
          <Select
            placeholder="状态"
            value={searchParams.status}
            onChange={(value) =>
              setSearchParams({ ...searchParams, status: value })
            }
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="pending">等待中</Select.Option>
            <Select.Option value="in_progress">进行中</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
            <Select.Option value="rolled_back">已回滚</Select.Option>
          </Select>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => setSearchParams({ ...searchParams, page: 1 })}
          >
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => setTriggerModalVisible(true)}
            danger
          >
            触发故障转移
          </Button>
        </Space>
      </Card>

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setSearchParams({ ...searchParams, page, limit: pageSize });
            },
          }}
        />
      </Card>

      {/* 触发故障转移弹窗 */}
      <Modal
        title="触发故障转移"
        open={triggerModalVisible}
        onOk={() => {
          if (!selectedDeviceId) {
            message.warning('请输入设备ID');
            return;
          }
          triggerMutation.mutate(selectedDeviceId);
        }}
        onCancel={() => {
          setTriggerModalVisible(false);
          setSelectedDeviceId('');
        }}
        confirmLoading={triggerMutation.isPending}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="警告"
            description="手动触发故障转移会导致设备短暂不可用，请谨慎操作。"
            type="warning"
            showIcon
          />
          <Input
            placeholder="请输入设备ID"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          />
        </Space>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title="故障转移详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={600}
      >
        {selectedRecord && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="ID">{selectedRecord.id}</Descriptions.Item>
            <Descriptions.Item label="设备ID">
              {selectedRecord.deviceId}
            </Descriptions.Item>
            <Descriptions.Item label="设备名称">
              {selectedRecord.deviceName}
            </Descriptions.Item>
            <Descriptions.Item label="源节点">
              {selectedRecord.sourceNode}
            </Descriptions.Item>
            <Descriptions.Item label="目标节点">
              {selectedRecord.targetNode}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag
                color={
                  selectedRecord.status === 'completed'
                    ? 'success'
                    : selectedRecord.status === 'failed'
                      ? 'error'
                      : 'processing'
                }
              >
                {selectedRecord.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="触发方式">
              {selectedRecord.triggerType}
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {selectedRecord.startedAt}
            </Descriptions.Item>
            <Descriptions.Item label="完成时间">
              {selectedRecord.completedAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="耗时">
              {selectedRecord.duration ? `${selectedRecord.duration}s` : '-'}
            </Descriptions.Item>
            {selectedRecord.failureReason && (
              <Descriptions.Item label="故障原因">
                {selectedRecord.failureReason}
              </Descriptions.Item>
            )}
            {selectedRecord.errorMessage && (
              <Descriptions.Item label="错误信息">
                <span style={{ color: 'red' }}>{selectedRecord.errorMessage}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default FailoverManagement;

