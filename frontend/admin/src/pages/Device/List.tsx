import { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Tag, Space, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Card, Statistic, Row, Col, Select, DatePicker, Dropdown, Badge } from 'antd';
import { PlusOutlined, PlayCircleOutlined, StopOutlined, ReloadOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, DownloadOutlined, DownOutlined, WifiOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import type { Device, CreateDeviceDto } from '@/types';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { exportToExcel, exportToCSV } from '@/utils/export';
import { useWebSocket } from '@/hooks/useWebSocket';

// ✅ 使用 React Query hooks
import {
  useDevices,
  useDeviceStats,
  useCreateDevice,
  useStartDevice,
  useStopDevice,
  useRebootDevice,
  useDeleteDevice,
} from '@/hooks/useDevices';

// ✅ 导入批量操作服务（暂时保留直接调用，后续可以改造为 hooks）
import { batchStartDevices, batchStopDevices, batchRebootDevices, batchDeleteDevices } from '@/services/device';
import { queryClient } from '@/lib/react-query';
import { deviceKeys } from '@/hooks/useDevices';

const { Search } = Input;
const { RangePicker } = DatePicker;

/**
 * 设备列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 自动请求去重和缓存
 * 5. ✅ 乐观更新支持
 */
const DeviceList = () => {
  const navigate = useNavigate();

  // 筛选和分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [androidVersionFilter, setAndroidVersionFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [form] = Form.useForm();

  // ✅ 使用 React Query hooks（自动管理 loading、error、data）
  const params = useMemo(() => {
    const p: any = { page, pageSize };
    if (searchKeyword) p.search = searchKeyword;
    if (statusFilter) p.status = statusFilter;
    if (androidVersionFilter) p.androidVersion = androidVersionFilter;
    if (dateRange) {
      p.startDate = dateRange[0];
      p.endDate = dateRange[1];
    }
    return p;
  }, [page, pageSize, searchKeyword, statusFilter, androidVersionFilter, dateRange]);

  // ✅ 自动缓存、去重、后台刷新
  const { data: devicesData, isLoading } = useDevices(params);
  const { data: stats } = useDeviceStats();

  // ✅ Mutation hooks（自动失效缓存）
  const createDeviceMutation = useCreateDevice();
  const startDeviceMutation = useStartDevice();
  const stopDeviceMutation = useStopDevice();
  const rebootDeviceMutation = useRebootDevice();
  const deleteDeviceMutation = useDeleteDevice();

  // 解构数据
  const devices = devicesData?.data || [];
  const total = devicesData?.total || 0;

  // WebSocket 实时更新
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:30006';
  const { isConnected, lastMessage } = useWebSocket(wsUrl, realtimeEnabled);

  // 处理 WebSocket 消息
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;

      // 设备状态更新 - 乐观更新 UI
      if (type === 'device:status') {
        // ✅ 直接更新缓存中的数据
        queryClient.setQueryData(
          deviceKeys.list(params),
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.map((device: Device) =>
                device.id === data.deviceId
                  ? { ...device, status: data.status }
                  : device
              ),
            };
          }
        );
        // 失效统计缓存
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      }
      // 设备创建/删除 - 失效列表缓存
      else if (type === 'device:created') {
        message.info(`新设备已创建: ${data.name}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      }
      else if (type === 'device:deleted') {
        message.warning(`设备已删除: ${data.name}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      }
    }
  }, [lastMessage, params]);

  // ✅ 使用 useCallback 优化事件处理函数
  const handleCreate = useCallback(async (values: CreateDeviceDto) => {
    await createDeviceMutation.mutateAsync(values);
    setCreateModalVisible(false);
    form.resetFields();
  }, [createDeviceMutation, form]);

  const handleStart = useCallback(async (id: string) => {
    await startDeviceMutation.mutateAsync(id);
  }, [startDeviceMutation]);

  const handleStop = useCallback(async (id: string) => {
    await stopDeviceMutation.mutateAsync(id);
  }, [stopDeviceMutation]);

  const handleReboot = useCallback(async (id: string) => {
    await rebootDeviceMutation.mutateAsync(id);
  }, [rebootDeviceMutation]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteDeviceMutation.mutateAsync(id);
  }, [deleteDeviceMutation]);

  // 批量操作（暂时保留原有实现）
  const handleBatchStart = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要启动的设备');
      return;
    }
    try {
      await batchStartDevices(selectedRowKeys as string[]);
      message.success(`成功启动 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      // ✅ 失效缓存触发刷新
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    } catch (error) {
      message.error('批量启动失败');
    }
  }, [selectedRowKeys]);

  const handleBatchStop = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要停止的设备');
      return;
    }
    try {
      await batchStopDevices(selectedRowKeys as string[]);
      message.success(`成功停止 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    } catch (error) {
      message.error('批量停止失败');
    }
  }, [selectedRowKeys]);

  const handleBatchReboot = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要重启的设备');
      return;
    }
    try {
      await batchRebootDevices(selectedRowKeys as string[]);
      message.success(`成功重启 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      }, 2000);
    } catch (error) {
      message.error('批量重启失败');
    }
  }, [selectedRowKeys]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的设备');
      return;
    }
    try {
      await batchDeleteDevices(selectedRowKeys as string[]);
      message.success(`成功删除 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
    } catch (error) {
      message.error('批量删除失败');
    }
  }, [selectedRowKeys]);

  // ✅ 使用 useMemo 优化状态映射（避免每次渲染都重新创建）
  const statusMap = useMemo(() => ({
    idle: { color: 'default', text: '空闲' },
    running: { color: 'green', text: '运行中' },
    stopped: { color: 'red', text: '已停止' },
    error: { color: 'error', text: '错误' },
  }), []);

  // ✅ 使用 useMemo 优化导出数据转换
  const exportData = useMemo(() =>
    devices.map(device => ({
      '设备ID': device.id,
      '设备名称': device.name,
      '状态': statusMap[device.status as keyof typeof statusMap]?.text || device.status,
      'Android版本': device.androidVersion,
      'CPU核心数': device.cpuCores,
      '内存(MB)': device.memoryMB,
      '存储(MB)': device.storageMB,
      'IP地址': device.ipAddress || '-',
      'VNC端口': device.vncPort || '-',
      '创建时间': dayjs(device.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    })),
    [devices, statusMap]
  );

  // ✅ 使用 useCallback 优化导出函数
  const handleExportExcel = useCallback(() => {
    exportToExcel(exportData, '设备列表');
    message.success('导出成功');
  }, [exportData]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(exportData, '设备列表');
    message.success('导出成功');
  }, [exportData]);

  const handleExportJSON = useCallback(() => {
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `设备列表_${dayjs().format('YYYYMMDD_HHmmss')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    message.success('导出成功');
  }, [exportData]);

  // ✅ 使用 useMemo 优化导出菜单
  const exportMenuItems: MenuProps['items'] = useMemo(() => [
    { key: 'excel', label: '导出为 Excel', onClick: handleExportExcel },
    { key: 'csv', label: '导出为 CSV', onClick: handleExportCSV },
    { key: 'json', label: '导出为 JSON', onClick: handleExportJSON },
  ], [handleExportExcel, handleExportCSV, handleExportJSON]);

  // 批量选择配置
  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  }), [selectedRowKeys]);

  // ✅ 使用 useMemo 优化表格列配置（避免每次渲染都重新创建）
  const columns: ColumnsType<Device> = useMemo(() => [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      ellipsis: true,
      render: (id: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {id.substring(0, 8)}...
        </span>
      ),
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      responsive: ['md'],
    },
    {
      title: 'Android版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
      width: 120,
      responsive: ['lg'],
    },
    {
      title: 'CPU',
      dataIndex: 'cpuCores',
      key: 'cpuCores',
      width: 80,
      render: (cores: number) => `${cores}核`,
      responsive: ['lg'],
    },
    {
      title: '内存',
      dataIndex: 'memoryMB',
      key: 'memoryMB',
      width: 100,
      render: (memory: number) => `${(memory / 1024).toFixed(1)}GB`,
      responsive: ['lg'],
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      ellipsis: true,
      responsive: ['xl'],
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('MM-DD HH:mm'),
      responsive: ['xl'],
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      fixed: 'right',
      render: (_: any, record: Device) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            详情
          </Button>

          {record.status !== 'running' ? (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
              loading={startDeviceMutation.isPending}
            >
              启动
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleStop(record.id)}
              loading={stopDeviceMutation.isPending}
            >
              停止
            </Button>
          )}

          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleReboot(record.id)}
            loading={rebootDeviceMutation.isPending}
          >
            重启
          </Button>

          <Popconfirm
            title="确定删除该设备？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteDeviceMutation.isPending}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [navigate, handleStart, handleStop, handleReboot, handleDelete, statusMap, startDeviceMutation.isPending, stopDeviceMutation.isPending, rebootDeviceMutation.isPending, deleteDeviceMutation.isPending]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={stats?.total || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={stats?.running || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="空闲"
              value={stats?.idle || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已停止"
              value={stats?.stopped || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 第一行：搜索和筛选 */}
          <Space wrap>
            <Search
              placeholder="搜索设备名称或ID"
              allowClear
              style={{ width: 250 }}
              onSearch={setSearchKeyword}
              prefix={<SearchOutlined />}
            />

            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 120 }}
              onChange={setStatusFilter}
              options={[
                { label: '空闲', value: 'idle' },
                { label: '运行中', value: 'running' },
                { label: '已停止', value: 'stopped' },
                { label: '错误', value: 'error' },
              ]}
            />

            <Select
              placeholder="Android版本"
              allowClear
              style={{ width: 150 }}
              onChange={setAndroidVersionFilter}
              options={[
                { label: 'Android 12', value: 'android-12' },
                { label: 'Android 13', value: 'android-13' },
                { label: 'Android 14', value: 'android-14' },
              ]}
            />

            <RangePicker
              onChange={(dates, dateStrings) => {
                setDateRange(dates ? [dateStrings[0], dateStrings[1]] : null);
              }}
            />

            <Badge dot={isConnected} status={isConnected ? 'success' : 'error'}>
              <Button
                icon={<WifiOutlined />}
                onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                type={realtimeEnabled ? 'primary' : 'default'}
              >
                实时更新
              </Button>
            </Badge>
          </Space>

          {/* 第二行：批量操作和导出 */}
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建设备
            </Button>

            {selectedRowKeys.length > 0 && (
              <>
                <Button icon={<PlayCircleOutlined />} onClick={handleBatchStart}>
                  批量启动 ({selectedRowKeys.length})
                </Button>
                <Button icon={<StopOutlined />} onClick={handleBatchStop}>
                  批量停止
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleBatchReboot}>
                  批量重启
                </Button>
                <Popconfirm
                  title={`确定删除 ${selectedRowKeys.length} 台设备？`}
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除
                  </Button>
                </Popconfirm>
              </>
            )}

            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button icon={<DownloadOutlined />}>
                导出 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </Space>
      </Card>

      {/* 设备列表表格 */}
      <Card>
        <Table<Device>
          rowKey="id"
          columns={columns}
          dataSource={devices}
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 台设备`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建设备弹窗 */}
      <Modal
        title="创建设备"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createDeviceMutation.isPending}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            label="设备名称"
            name="name"
            rules={[{ required: true, message: '请输入设备名称' }]}
          >
            <Input placeholder="例如: MyDevice-001" />
          </Form.Item>

          <Form.Item
            label="模板"
            name="template"
            rules={[{ required: true, message: '请选择模板' }]}
          >
            <Select
              placeholder="选择Android版本模板"
              options={[
                { label: 'Android 12', value: 'android-12' },
                { label: 'Android 13', value: 'android-13' },
                { label: 'Android 14', value: 'android-14' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="CPU 核心数"
            name="cpuCores"
            initialValue={2}
            rules={[{ required: true, message: '请输入CPU核心数' }]}
          >
            <InputNumber min={1} max={16} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="内存 (MB)"
            name="memoryMB"
            initialValue={4096}
            rules={[{ required: true, message: '请输入内存大小' }]}
          >
            <InputNumber min={1024} max={32768} step={1024} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="存储 (MB)"
            name="storageMB"
            initialValue={10240}
            rules={[{ required: true, message: '请输入存储大小' }]}
          >
            <InputNumber min={2048} max={102400} step={1024} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceList;
