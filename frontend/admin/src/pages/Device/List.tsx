import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Card, Statistic, Row, Col, Select, DatePicker, Dropdown, Badge } from 'antd';
import { PlusOutlined, PlayCircleOutlined, StopOutlined, ReloadOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, DownloadOutlined, DownOutlined, WifiOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { getDevices, createDevice, deleteDevice, startDevice, stopDevice, rebootDevice, getDeviceStats, batchStartDevices, batchStopDevices, batchRebootDevices, batchDeleteDevices } from '@/services/device';
import type { Device, CreateDeviceDto, DeviceStats } from '@/types';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { exportToExcel, exportToCSV } from '@/utils/export';
import { useWebSocket } from '@/hooks/useWebSocket';

const { Search } = Input;
const { RangePicker } = DatePicker;

const DeviceList = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats>();
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
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

  // WebSocket实时更新
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:30006';
  const { isConnected, lastMessage } = useWebSocket(wsUrl, realtimeEnabled);

  // 加载设备列表
  const loadDevices = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (searchKeyword) params.search = searchKeyword;
      if (statusFilter) params.status = statusFilter;
      if (androidVersionFilter) params.androidVersion = androidVersionFilter;
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }
      const res = await getDevices(params);
      setDevices(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载设备列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const data = await getDeviceStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  useEffect(() => {
    loadDevices();
    loadStats();
  }, [page, pageSize, searchKeyword, statusFilter, androidVersionFilter, dateRange]);

  // 处理WebSocket消息
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;

      // 设备状态更新
      if (type === 'device:status') {
        setDevices(prevDevices =>
          prevDevices.map(device =>
            device.id === data.deviceId
              ? { ...device, status: data.status }
              : device
          )
        );
        // 更新统计数据
        loadStats();
      }

      // 设备创建
      else if (type === 'device:created') {
        message.info(`新设备已创建: ${data.name}`);
        loadDevices();
      }

      // 设备删除
      else if (type === 'device:deleted') {
        message.warning(`设备已删除: ${data.name}`);
        loadDevices();
      }
    }
  }, [lastMessage]);

  // 创建设备
  const handleCreate = async (values: CreateDeviceDto) => {
    try {
      await createDevice(values);
      message.success('创建设备成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('创建设备失败');
    }
  };

  // 启动设备
  const handleStart = async (id: string) => {
    try {
      await startDevice(id);
      message.success('设备启动成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('启动设备失败');
    }
  };

  // 停止设备
  const handleStop = async (id: string) => {
    try {
      await stopDevice(id);
      message.success('设备停止成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('停止设备失败');
    }
  };

  // 重启设备
  const handleReboot = async (id: string) => {
    try {
      await rebootDevice(id);
      message.success('设备重启中...');
      setTimeout(() => loadDevices(), 2000);
    } catch (error) {
      message.error('重启设备失败');
    }
  };

  // 删除设备
  const handleDelete = async (id: string) => {
    try {
      await deleteDevice(id);
      message.success('删除设备成功');
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('删除设备失败');
    }
  };

  // 批量启动设备
  const handleBatchStart = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要启动的设备');
      return;
    }
    try {
      await batchStartDevices(selectedRowKeys as string[]);
      message.success(`成功启动 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('批量启动失败');
    }
  };

  // 批量停止设备
  const handleBatchStop = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要停止的设备');
      return;
    }
    try {
      await batchStopDevices(selectedRowKeys as string[]);
      message.success(`成功停止 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('批量停止失败');
    }
  };

  // 批量重启设备
  const handleBatchReboot = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要重启的设备');
      return;
    }
    try {
      await batchRebootDevices(selectedRowKeys as string[]);
      message.success(`成功重启 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      setTimeout(() => loadDevices(), 2000);
    } catch (error) {
      message.error('批量重启失败');
    }
  };

  // 批量删除设备
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的设备');
      return;
    }
    try {
      await batchDeleteDevices(selectedRowKeys as string[]);
      message.success(`成功删除 ${selectedRowKeys.length} 台设备`);
      setSelectedRowKeys([]);
      loadDevices();
      loadStats();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 批量选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(selectedRowKeys);
    },
  };

  // 导出Excel
  const handleExportExcel = () => {
    const exportData = devices.map(device => ({
      '设备ID': device.id,
      '设备名称': device.name,
      '状态': device.status === 'idle' ? '空闲' : device.status === 'running' ? '运行中' : device.status === 'stopped' ? '已停止' : device.status,
      'Android版本': device.androidVersion,
      'CPU核心数': device.cpuCores,
      '内存(GB)': (device.memoryMB / 1024).toFixed(1),
      '存储(GB)': (device.storageMB / 1024).toFixed(1),
      'IP地址': device.ipAddress || '-',
      '创建时间': dayjs(device.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    exportToExcel(exportData, `设备列表_${dayjs().format('YYYYMMDD_HHmmss')}`, '设备列表');
    message.success('导出成功');
  };

  // 导出CSV
  const handleExportCSV = () => {
    const exportData = devices.map(device => ({
      '设备ID': device.id,
      '设备名称': device.name,
      '状态': device.status === 'idle' ? '空闲' : device.status === 'running' ? '运行中' : device.status === 'stopped' ? '已停止' : device.status,
      'Android版本': device.androidVersion,
      'CPU核心数': device.cpuCores,
      '内存(GB)': (device.memoryMB / 1024).toFixed(1),
      '存储(GB)': (device.storageMB / 1024).toFixed(1),
      'IP地址': device.ipAddress || '-',
      '创建时间': dayjs(device.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    exportToCSV(exportData, `设备列表_${dayjs().format('YYYYMMDD_HHmmss')}`);
    message.success('导出成功');
  };

  // 导出选中设备
  const handleExportSelected = () => {
    const selectedDevices = devices.filter(device => selectedRowKeys.includes(device.id));
    const exportData = selectedDevices.map(device => ({
      '设备ID': device.id,
      '设备名称': device.name,
      '状态': device.status === 'idle' ? '空闲' : device.status === 'running' ? '运行中' : device.status === 'stopped' ? '已停止' : device.status,
      'Android版本': device.androidVersion,
      'CPU核心数': device.cpuCores,
      '内存(GB)': (device.memoryMB / 1024).toFixed(1),
      '存储(GB)': (device.storageMB / 1024).toFixed(1),
      'IP地址': device.ipAddress || '-',
      '创建时间': dayjs(device.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));
    exportToExcel(exportData, `选中设备_${dayjs().format('YYYYMMDD_HHmmss')}`, '设备列表');
    message.success('导出成功');
  };

  // 导出菜单
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: '导出为Excel',
      icon: <DownloadOutlined />,
      onClick: handleExportExcel,
    },
    {
      key: 'csv',
      label: '导出为CSV',
      icon: <DownloadOutlined />,
      onClick: handleExportCSV,
    },
    ...(selectedRowKeys.length > 0
      ? [
          {
            type: 'divider' as const,
          },
          {
            key: 'selected',
            label: `导出选中 (${selectedRowKeys.length})`,
            icon: <DownloadOutlined />,
            onClick: handleExportSelected,
          },
        ]
      : []),
  ];

  const columns: ColumnsType<Device> = [
    {
      title: '设备 ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
      fixed: 'left',
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          idle: { color: 'default', text: '空闲' },
          running: { color: 'green', text: '运行中' },
          stopped: { color: 'red', text: '已停止' },
          error: { color: 'error', text: '错误' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '安卓版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
      width: 100,
      responsive: ['md'],
      sorter: (a, b) => (a.androidVersion || '').localeCompare(b.androidVersion || ''),
    },
    {
      title: 'CPU',
      dataIndex: 'cpuCores',
      key: 'cpuCores',
      width: 80,
      responsive: ['lg'],
      sorter: (a, b) => a.cpuCores - b.cpuCores,
      render: (cores: number) => `${cores} 核`,
    },
    {
      title: '内存',
      dataIndex: 'memoryMB',
      key: 'memoryMB',
      width: 100,
      responsive: ['lg'],
      sorter: (a, b) => a.memoryMB - b.memoryMB,
      render: (memory: number) => `${((memory || 0) / 1024).toFixed(1)} GB`,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      responsive: ['xl'],
      sorter: (a, b) => (a.ipAddress || '').localeCompare(b.ipAddress || ''),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      responsive: ['md'],
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            详情
          </Button>
          {record.status === 'stopped' || record.status === 'idle' ? (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleStart(record.id)}
            >
              启动
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleStop(record.id)}
              danger
            >
              停止
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleReboot(record.id)}
          >
            重启
          </Button>
          <Popconfirm
            title="确定要删除这个设备吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>设备管理</h2>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="总设备数" value={stats.total} />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="运行中" value={stats.running} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="空闲" value={stats.idle} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic title="已停止" value={stats.stopped} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜索设备名称/ID/IP地址"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={(value) => {
                setSearchKeyword(value);
                setPage(1);
              }}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="设备状态"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="idle">空闲</Select.Option>
              <Select.Option value="running">运行中</Select.Option>
              <Select.Option value="stopped">已停止</Select.Option>
              <Select.Option value="error">错误</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Android版本"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => {
                setAndroidVersionFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="9">Android 9</Select.Option>
              <Select.Option value="10">Android 10</Select.Option>
              <Select.Option value="11">Android 11</Select.Option>
              <Select.Option value="12">Android 12</Select.Option>
              <Select.Option value="13">Android 13</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([
                    dates[0]!.format('YYYY-MM-DD'),
                    dates[1]!.format('YYYY-MM-DD'),
                  ]);
                } else {
                  setDateRange(null);
                }
                setPage(1);
              }}
            />
          </Col>
        </Row>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建设备
          </Button>
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
            <Button icon={<DownloadOutlined />}>
              导出数据 <DownOutlined />
            </Button>
          </Dropdown>
          <Badge dot={isConnected} status={isConnected ? 'success' : 'default'}>
            <Button
              icon={<WifiOutlined />}
              onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            >
              {realtimeEnabled ? '实时更新已开启' : '实时更新已关闭'}
            </Button>
          </Badge>
          {selectedRowKeys.length > 0 && (
            <>
              <Button
                icon={<PlayCircleOutlined />}
                onClick={handleBatchStart}
              >
                批量启动 ({selectedRowKeys.length})
              </Button>
              <Button
                icon={<StopOutlined />}
                danger
                onClick={handleBatchStop}
              >
                批量停止 ({selectedRowKeys.length})
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleBatchReboot}
              >
                批量重启 ({selectedRowKeys.length})
              </Button>
              <Popconfirm
                title={`确定要删除选中的 ${selectedRowKeys.length} 台设备吗？`}
                onConfirm={handleBatchDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  icon={<DeleteOutlined />}
                  danger
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={devices}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 1200 }}
      />

      {/* 创建设备对话框 */}
      <Modal
        title="创建设备"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item
            label="用户 ID"
            name="userId"
            rules={[{ required: true, message: '请输入用户 ID' }]}
          >
            <Input placeholder="请输入用户 ID" />
          </Form.Item>

          <Form.Item label="设备名称" name="name">
            <Input placeholder="可选，不填则自动生成" />
          </Form.Item>

          <Form.Item label="安卓版本" name="androidVersion" initialValue="11">
            <Input placeholder="例如: 11" />
          </Form.Item>

          <Form.Item label="CPU 核心数" name="cpuCores" initialValue={4}>
            <InputNumber min={1} max={16} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="内存 (MB)" name="memoryMB" initialValue={4096}>
            <InputNumber min={1024} max={16384} step={1024} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="存储 (MB)" name="storageMB" initialValue={8192}>
            <InputNumber min={2048} max={65536} step={1024} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceList;
