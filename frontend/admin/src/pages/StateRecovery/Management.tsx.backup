import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Select,
  Input,
  Alert,
  Modal,
} from 'antd';
import {
  ReloadOutlined,
  RollbackOutlined,
  SearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';

interface StateRecoveryRecord {
  id: string;
  deviceId: string;
  deviceName: string;
  previousState: string;
  currentState: string;
  targetState: string;
  recoveryType: 'automatic' | 'manual' | 'rollback';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  reason?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

const StateRecoveryManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    status: undefined as string | undefined,
    deviceId: '',
    page: 1,
    limit: 10,
  });
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [targetState, setTargetState] = useState('');
  const queryClient = useQueryClient();

  // 查询状态恢复记录
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['state-recovery-records', searchParams],
    queryFn: async () => {
      const response = await request.get('/state-recovery', { params: searchParams });
      return response;
    },
  });

  // 获取设备当前状态
  const { data: deviceStates } = useQuery({
    queryKey: ['device-states'],
    queryFn: async () => {
      const response = await request.get('/state-recovery/device-states');
      return response;
    },
  });

  // 触发状态恢复
  const recoveryMutation = useMutation({
    mutationFn: async (params: { deviceId: string; targetState: string }) => {
      return await request.post('/state-recovery/recover', params);
    },
    onSuccess: () => {
      message.success('状态恢复已触发');
      setRecoveryModalVisible(false);
      setSelectedDeviceId('');
      setTargetState('');
      queryClient.invalidateQueries({ queryKey: ['state-recovery-records'] });
      queryClient.invalidateQueries({ queryKey: ['device-states'] });
    },
    onError: () => {
      message.error('触发状态恢复失败');
    },
  });

  // 验证一致性
  const validateMutation = useMutation({
    mutationFn: async () => {
      return await request.post('/state-recovery/validate-all');
    },
    onSuccess: (data) => {
      if (data.inconsistent?.length > 0) {
        Modal.warning({
          title: '发现状态不一致',
          content: `发现 ${data.inconsistent.length} 个设备状态不一致，是否立即修复？`,
          okText: '立即修复',
          onOk: () => {
            // 触发批量修复
            request.post('/state-recovery/fix-inconsistencies').then(() => {
              message.success('状态修复已触发');
              queryClient.invalidateQueries({ queryKey: ['state-recovery-records'] });
              queryClient.invalidateQueries({ queryKey: ['device-states'] });
            });
          },
        });
      } else {
        message.success('所有设备状态一致');
      }
    },
    onError: () => {
      message.error('一致性验证失败');
    },
  });

  const columns: ColumnsType<StateRecoveryRecord> = [
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
      title: '之前状态',
      dataIndex: 'previousState',
      key: 'previousState',
      width: 100,
      render: (state: string) => <Tag>{state}</Tag>,
    },
    {
      title: '当前状态',
      dataIndex: 'currentState',
      key: 'currentState',
      width: 100,
      render: (state: string) => <Tag color="blue">{state}</Tag>,
    },
    {
      title: '目标状态',
      dataIndex: 'targetState',
      key: 'targetState',
      width: 100,
      render: (state: string) => <Tag color="green">{state}</Tag>,
    },
    {
      title: '恢复类型',
      dataIndex: 'recoveryType',
      key: 'recoveryType',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          automatic: '自动',
          manual: '手动',
          rollback: '回滚',
        };
        return typeMap[type] || type;
      },
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
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 160,
      render: (time: string) => time || '-',
    },
  ];

  return (
    <div>
      <Alert
        message="状态恢复说明"
        description="状态恢复功能用于检测和修复设备状态不一致的问题，确保系统状态的准确性和一致性。"
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
            icon={<CheckCircleOutlined />}
            onClick={() => validateMutation.mutate()}
            loading={validateMutation.isPending}
          >
            验证一致性
          </Button>
          <Button
            type="primary"
            icon={<RollbackOutlined />}
            onClick={() => setRecoveryModalVisible(true)}
          >
            恢复状态
          </Button>
        </Space>
      </Card>

      {/* 设备状态概览 */}
      {deviceStates && (
        <Card title="设备状态概览" style={{ marginBottom: 16 }}>
          <Space size="large">
            <div>
              <div style={{ color: '#666' }}>总设备数</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {deviceStates.total || 0}
              </div>
            </div>
            <div>
              <div style={{ color: '#666' }}>状态一致</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                {deviceStates.consistent || 0}
              </div>
            </div>
            <div>
              <div style={{ color: '#666' }}>状态不一致</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                {deviceStates.inconsistent || 0}
              </div>
            </div>
            <div>
              <div style={{ color: '#666' }}>恢复中</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                {deviceStates.recovering || 0}
              </div>
            </div>
          </Space>
        </Card>
      )}

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1300 }}
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

      {/* 恢复状态弹窗 */}
      <Modal
        title="恢复设备状态"
        open={recoveryModalVisible}
        onOk={() => {
          if (!selectedDeviceId || !targetState) {
            message.warning('请填写完整信息');
            return;
          }
          recoveryMutation.mutate({ deviceId: selectedDeviceId, targetState });
        }}
        onCancel={() => {
          setRecoveryModalVisible(false);
          setSelectedDeviceId('');
          setTargetState('');
        }}
        confirmLoading={recoveryMutation.isPending}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <div style={{ marginBottom: 8 }}>设备ID</div>
            <Input
              placeholder="请输入设备ID"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>目标状态</div>
            <Select
              placeholder="请选择目标状态"
              value={targetState}
              onChange={setTargetState}
              style={{ width: '100%' }}
            >
              <Select.Option value="running">运行中</Select.Option>
              <Select.Option value="stopped">已停止</Select.Option>
              <Select.Option value="paused">已暂停</Select.Option>
              <Select.Option value="error">错误</Select.Option>
            </Select>
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default StateRecoveryManagement;

