import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
  Select,
  Badge,
  Progress,
  Tooltip,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  RollbackOutlined,
  CompressOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DeviceSnapshot, Device } from '@/types';
import dayjs from 'dayjs';
import {
  useSnapshots,
  useSnapshotStats,
  useCreateSnapshot,
  useRestoreSnapshot,
  useCompressSnapshot,
  useDeleteSnapshot
} from '@/hooks/useSnapshots';
import { useDevices } from '@/hooks/useDevices';

const { TextArea } = Input;
const { Option } = Select;

/**
 * 快照列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 统计信息独立缓存（1分钟）
 * 5. ✅ 设备列表复用 useDevices hook
 */
const SnapshotList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [form] = Form.useForm();

  // ✅ 使用 React Query hooks 替换手动状态管理
  const params = useMemo(() => {
    const p: any = { page, pageSize };
    if (deviceFilter) p.deviceId = deviceFilter;
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [page, pageSize, deviceFilter, statusFilter]);

  const { data, isLoading } = useSnapshots(params);
  const { data: stats } = useSnapshotStats();
  const { data: devicesData } = useDevices({ page: 1, pageSize: 1000 });

  // Mutations
  const createMutation = useCreateSnapshot();
  const restoreMutation = useRestoreSnapshot();
  const compressMutation = useCompressSnapshot();
  const deleteMutation = useDeleteSnapshot();

  const snapshots = data?.data || [];
  const total = data?.total || 0;
  const devices = devicesData?.data || [];

  // ✅ useCallback 优化事件处理函数
  const handleCreate = useCallback(async (values: any) => {
    await createMutation.mutateAsync(values);
    setCreateModalVisible(false);
    form.resetFields();
  }, [createMutation, form]);

  const handleRestore = useCallback(async (id: string, deviceName: string) => {
    await restoreMutation.mutateAsync({ id, deviceName });
  }, [restoreMutation]);

  const handleCompress = useCallback(async (id: string) => {
    await compressMutation.mutateAsync(id);
  }, [compressMutation]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const handleCreateModalOpen = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  const handleCreateModalClose = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  // ✅ useMemo 优化格式化函数
  const formatSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // ✅ useMemo 优化状态配置
  const statusConfig = useMemo(() => ({
    creating: { color: 'processing' as const, icon: <ClockCircleOutlined />, text: '创建中' },
    ready: { color: 'success' as const, icon: <CheckCircleOutlined />, text: '就绪' },
    restoring: { color: 'processing' as const, icon: <ClockCircleOutlined />, text: '恢复中' },
    failed: { color: 'error' as const, icon: <ExclamationCircleOutlined />, text: '失败' },
  }), []);

  const renderStatus = useCallback((status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ready;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  }, [statusConfig]);

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<DeviceSnapshot> = useMemo(() => [
    {
      title: '快照名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '设备',
      dataIndex: ['device', 'name'],
      key: 'deviceName',
      width: 150,
      render: (text, record) => (
        <Tooltip title={`设备 ID: ${record.deviceId}`}>
          <span>{text || record.deviceId}</span>
        </Tooltip>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      sorter: (a, b) => a.size - b.size,
      render: (size) => formatSize(size),
    },
    {
      title: '压缩状态',
      dataIndex: 'compressed',
      key: 'compressed',
      width: 100,
      align: 'center',
      filters: [
        { text: '已压缩', value: true },
        { text: '未压缩', value: false },
      ],
      render: (compressed) =>
        compressed ? (
          <Tag color="green">已压缩</Tag>
        ) : (
          <Tag color="orange">未压缩</Tag>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      filters: [
        { text: '创建中', value: 'creating' },
        { text: '就绪', value: 'ready' },
        { text: '恢复中', value: 'restoring' },
        { text: '失败', value: 'failed' },
      ],
      render: renderStatus,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'ready' && (
            <>
              <Popconfirm
                title={`确定要恢复快照 "${record.name}" 吗？`}
                description="此操作将覆盖设备当前状态，无法撤销"
                onConfirm={() => handleRestore(record.id, record.device?.name || record.deviceId)}
              >
                <Button type="link" size="small" icon={<RollbackOutlined />}>
                  恢复
                </Button>
              </Popconfirm>
              {!record.compressed && (
                <Tooltip title="压缩快照以节省存储空间">
                  <Button
                    type="link"
                    size="small"
                    icon={<CompressOutlined />}
                    onClick={() => handleCompress(record.id)}
                  >
                    压缩
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          <Popconfirm
            title="确定要删除这个快照吗？"
            description="删除后将无法恢复"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [formatSize, renderStatus, handleRestore, handleCompress, handleDelete]);

  // ✅ useMemo 优化存储使用率计算
  const storageUsage = useMemo(() => {
    if (!stats?.totalSize) return 0;
    const maxSize = 100 * 1024 * 1024 * 1024; // 假设最大 100GB
    return Math.min((stats.totalSize / maxSize) * 100, 100);
  }, [stats?.totalSize]);

  // ✅ useMemo 优化设备选项
  const deviceOptions = useMemo(() =>
    devices.map((device) => ({
      label: device.name || device.id,
      value: device.id,
    })),
    [devices]
  );

  const deviceOptionsForCreate = useMemo(() =>
    devices.map((device) => ({
      label: `${device.name || device.id} - ${device.status}`,
      value: device.id,
    })),
    [devices]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Alert
        message="快照功能说明"
        description="快照可以保存设备的当前状态，包括系统、应用和数据。创建快照后，您可以随时将设备恢复到该状态。压缩快照可以节省存储空间，但会增加恢复时间。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: '16px' }}
      />

      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总快照数"
              value={stats?.totalSnapshots || 0}
              prefix={<DatabaseOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总存储大小"
              value={formatSize(stats?.totalSize || 0)}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均快照大小"
              value={formatSize(stats?.avgSize || 0)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
                存储使用率
              </div>
              <Progress percent={Math.round(storageUsage)} status="active" />
            </div>
          </Col>
        </Row>
      </Card>

      <Card>
        <Space style={{ marginBottom: '16px' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateModalOpen}>
            创建快照
          </Button>
          <Select
            placeholder="筛选设备"
            allowClear
            style={{ width: 200 }}
            onChange={(value) => setDeviceFilter(value)}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={deviceOptions}
          />
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setStatusFilter(value)}
          >
            <Option value="creating">创建中</Option>
            <Option value="ready">就绪</Option>
            <Option value="restoring">恢复中</Option>
            <Option value="failed">失败</Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={snapshots}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
        />
      </Card>

      {/* 创建快照模态框 */}
      <Modal
        title="创建设备快照"
        open={createModalVisible}
        onCancel={handleCreateModalClose}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        <Alert
          message="提示"
          description="创建快照可能需要几分钟时间，具体取决于设备的存储使用情况。在创建快照期间，建议停止设备以确保数据一致性。"
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            label="选择设备"
            name="deviceId"
            rules={[{ required: true, message: '请选择设备' }]}
          >
            <Select
              showSearch
              placeholder="请选择要创建快照的设备"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={deviceOptionsForCreate}
            />
          </Form.Item>
          <Form.Item
            label="快照名称"
            name="name"
            rules={[{ required: true, message: '请输入快照名称' }]}
          >
            <Input placeholder="例如：系统备份_v1.0" />
          </Form.Item>
          <Form.Item label="快照描述" name="description">
            <TextArea
              rows={3}
              placeholder="记录快照的用途或包含的重要变更"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SnapshotList;
