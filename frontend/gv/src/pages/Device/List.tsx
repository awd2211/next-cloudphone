import { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Row,
  Col,
  Statistic,
  Typography,
  Tooltip,
  Popconfirm,
  Dropdown,
  Badge,
  Drawer,
  Descriptions,
  Alert,
  Progress,
  Divider,
  Checkbox,
  InputNumber,
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  SettingOutlined,
  MobileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  GlobalOutlined,
  FilterOutlined,
  DownOutlined,
  ExportOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  EyeOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  ClearOutlined,
  SyncOutlined,
  CloudServerOutlined,
  DesktopOutlined,
  ApiOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import CloudPhonePlayer from '@/components/CloudPhonePlayer';
import DeviceGroupPanel, { type DeviceGroup } from '@/components/DeviceGroupPanel';
import { DeviceListSkeleton } from '@/components/Skeletons';
import VirtualDeviceList from '@/components/VirtualDeviceList';
import type { ColumnsType, TableRowSelection } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceApi, proxyApi } from '@/services/api';
import type { Device, CreateDeviceDto, ProxyConfig } from '@/types';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 筛选参数类型
interface FilterParams {
  status?: Device['status'];
  androidVersion?: string;
  hasProxy?: boolean;
  searchText?: string;
  groupId?: string; // 分组ID筛选
}

// 批量创建参数类型
interface BatchCreateDto {
  prefix: string;
  count: number;
  androidVersion: string;
  cpuCores: number;
  memoryMB: number;
}

const DeviceList = () => {
  const queryClient = useQueryClient();

  // 状态管理
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [batchCreateModalVisible, setBatchCreateModalVisible] = useState(false);
  const [proxyModalVisible, setProxyModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [filters, setFilters] = useState<FilterParams>({});
  const [playerVisible, setPlayerVisible] = useState(false);
  const [playerDevice, setPlayerDevice] = useState<Device | null>(null);

  // 设备分组状态
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([
    {
      id: 'group-us',
      name: '美国区设备',
      color: '#1677ff',
      deviceCount: 0,
      description: '部署在美国的云手机',
      createdAt: dayjs().subtract(7, 'day').toISOString(),
    },
    {
      id: 'group-sg',
      name: '新加坡区设备',
      color: '#52c41a',
      deviceCount: 0,
      description: '部署在新加坡的云手机',
      createdAt: dayjs().subtract(5, 'day').toISOString(),
    },
    {
      id: 'group-test',
      name: '测试设备',
      color: '#faad14',
      deviceCount: 0,
      description: '用于功能测试',
      createdAt: dayjs().subtract(3, 'day').toISOString(),
    },
  ]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  // 表单
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [proxyForm] = Form.useForm();
  const [filterForm] = Form.useForm();

  // 获取设备列表
  const { data: devicesData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list({ page: 1, pageSize: 100 }),
    refetchInterval: 30000, // 30秒自动刷新
  });

  // 获取设备统计
  const { data: stats } = useQuery({
    queryKey: ['deviceStats'],
    queryFn: deviceApi.stats,
  });

  // 获取可用代理
  const { data: proxiesData } = useQuery({
    queryKey: ['proxies'],
    queryFn: () => proxyApi.list({ page: 1, pageSize: 100 }),
  });

  // 筛选后的设备列表
  const filteredDevices = useMemo(() => {
    let result = devicesData?.data || [];

    if (filters.status) {
      result = result.filter((d: Device) => d.status === filters.status);
    }
    if (filters.androidVersion) {
      result = result.filter((d: Device) => d.androidVersion === filters.androidVersion);
    }
    if (filters.hasProxy !== undefined) {
      result = result.filter((d: Device) =>
        filters.hasProxy ? !!d.proxyId : !d.proxyId
      );
    }
    if (filters.searchText) {
      const text = filters.searchText.toLowerCase();
      result = result.filter((d: Device) =>
        d.name.toLowerCase().includes(text) ||
        d.id.toLowerCase().includes(text)
      );
    }

    return result;
  }, [devicesData?.data, filters]);

  // 已选择的设备
  const selectedDevices = useMemo(() => {
    return filteredDevices.filter((d: Device) => selectedRowKeys.includes(d.id));
  }, [filteredDevices, selectedRowKeys]);

  // 活跃筛选数量
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.androidVersion) count++;
    if (filters.hasProxy !== undefined) count++;
    if (filters.searchText) count++;
    return count;
  }, [filters]);

  // ================== 分组操作 ==================

  // 选择分组
  const handleSelectGroup = useCallback((groupId: string | undefined) => {
    setSelectedGroupId(groupId);
    setSelectedRowKeys([]); // 切换分组时清除选择
  }, []);

  // 创建分组
  const handleCreateGroup = useCallback((group: Omit<DeviceGroup, 'id' | 'deviceCount' | 'createdAt'>) => {
    const newGroup: DeviceGroup = {
      ...group,
      id: uuidv4(),
      deviceCount: 0,
      createdAt: new Date().toISOString(),
    };
    setDeviceGroups(prev => [...prev, newGroup]);
  }, []);

  // 编辑分组
  const handleEditGroup = useCallback((group: DeviceGroup) => {
    setDeviceGroups(prev => prev.map(g => g.id === group.id ? group : g));
  }, []);

  // 删除分组
  const handleDeleteGroup = useCallback((groupId: string) => {
    setDeviceGroups(prev => prev.filter(g => g.id !== groupId));
    if (selectedGroupId === groupId) {
      setSelectedGroupId(undefined);
    }
  }, [selectedGroupId]);

  // 创建设备
  const createMutation = useMutation({
    mutationFn: deviceApi.create,
    onSuccess: () => {
      message.success('设备创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  // 启动设备
  const startMutation = useMutation({
    mutationFn: deviceApi.start,
    onSuccess: () => {
      message.success('设备启动成功');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
    },
  });

  // 停止设备
  const stopMutation = useMutation({
    mutationFn: deviceApi.stop,
    onSuccess: () => {
      message.success('设备已停止');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
    },
  });

  // 删除设备
  const deleteMutation = useMutation({
    mutationFn: deviceApi.delete,
    onSuccess: () => {
      message.success('设备已删除');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
    },
  });

  // 配置代理
  const setProxyMutation = useMutation({
    mutationFn: ({ deviceId, proxyId }: { deviceId: string; proxyId: string }) =>
      deviceApi.setProxy(deviceId, proxyId),
    onSuccess: () => {
      message.success('代理配置成功');
      setProxyModalVisible(false);
      proxyForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // 移除代理
  const removeProxyMutation = useMutation({
    mutationFn: deviceApi.removeProxy,
    onSuccess: () => {
      message.success('代理已移除');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // ================== 批量操作 ==================

  // 批量启动
  const handleBatchStart = async () => {
    const stoppedDevices = selectedDevices.filter((d: Device) => d.status === 'stopped');
    if (stoppedDevices.length === 0) {
      message.warning('没有可启动的设备（需要处于停止状态）');
      return;
    }

    Modal.confirm({
      title: '批量启动设备',
      content: `确定要启动选中的 ${stoppedDevices.length} 台设备吗？`,
      icon: <PlayCircleOutlined style={{ color: '#52c41a' }} />,
      okText: '确定启动',
      cancelText: '取消',
      onOk: async () => {
        const hide = message.loading(`正在启动 ${stoppedDevices.length} 台设备...`, 0);
        let successCount = 0;

        for (const device of stoppedDevices) {
          try {
            await deviceApi.start(device.id);
            successCount++;
          } catch (error) {
            console.error(`启动设备 ${device.name} 失败:`, error);
          }
        }

        hide();
        message.success(`成功启动 ${successCount}/${stoppedDevices.length} 台设备`);
        setSelectedRowKeys([]);
        queryClient.invalidateQueries({ queryKey: ['devices'] });
        queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
      },
    });
  };

  // 批量停止
  const handleBatchStop = async () => {
    const runningDevices = selectedDevices.filter((d: Device) => d.status === 'running');
    if (runningDevices.length === 0) {
      message.warning('没有可停止的设备（需要处于运行状态）');
      return;
    }

    Modal.confirm({
      title: '批量停止设备',
      content: `确定要停止选中的 ${runningDevices.length} 台设备吗？`,
      icon: <StopOutlined style={{ color: '#faad14' }} />,
      okText: '确定停止',
      cancelText: '取消',
      onOk: async () => {
        const hide = message.loading(`正在停止 ${runningDevices.length} 台设备...`, 0);
        let successCount = 0;

        for (const device of runningDevices) {
          try {
            await deviceApi.stop(device.id);
            successCount++;
          } catch (error) {
            console.error(`停止设备 ${device.name} 失败:`, error);
          }
        }

        hide();
        message.success(`成功停止 ${successCount}/${runningDevices.length} 台设备`);
        setSelectedRowKeys([]);
        queryClient.invalidateQueries({ queryKey: ['devices'] });
        queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
      },
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedDevices.length === 0) return;

    Modal.confirm({
      title: '批量删除设备',
      content: (
        <div>
          <p>确定要删除选中的 <Text strong type="danger">{selectedDevices.length}</Text> 台设备吗？</p>
          <Alert
            type="warning"
            message="此操作不可恢复，请谨慎操作"
            style={{ marginTop: 12 }}
          />
        </div>
      ),
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      okText: '确定删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const hide = message.loading(`正在删除 ${selectedDevices.length} 台设备...`, 0);
        let successCount = 0;

        for (const device of selectedDevices) {
          try {
            await deviceApi.delete(device.id);
            successCount++;
          } catch (error) {
            console.error(`删除设备 ${device.name} 失败:`, error);
          }
        }

        hide();
        message.success(`成功删除 ${successCount}/${selectedDevices.length} 台设备`);
        setSelectedRowKeys([]);
        queryClient.invalidateQueries({ queryKey: ['devices'] });
        queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
      },
    });
  };

  // 批量配置代理
  const handleBatchSetProxy = () => {
    const devicesWithoutProxy = selectedDevices.filter((d: Device) => !d.proxyId);
    if (devicesWithoutProxy.length === 0) {
      message.warning('选中的设备都已配置代理');
      return;
    }
    // 打开批量代理配置弹窗（使用第一个设备作为参考）
    setSelectedDevice(devicesWithoutProxy[0]);
    setProxyModalVisible(true);
  };

  // 批量创建
  const handleBatchCreate = async (values: BatchCreateDto) => {
    const hide = message.loading(`正在创建 ${values.count} 台设备...`, 0);
    let successCount = 0;

    for (let i = 1; i <= values.count; i++) {
      try {
        await deviceApi.create({
          name: `${values.prefix}-${String(i).padStart(3, '0')}`,
          androidVersion: values.androidVersion,
          cpuCores: values.cpuCores,
          memoryMB: values.memoryMB,
        });
        successCount++;
      } catch (error) {
        console.error(`创建设备 ${values.prefix}-${i} 失败:`, error);
      }
    }

    hide();
    message.success(`成功创建 ${successCount}/${values.count} 台设备`);
    setBatchCreateModalVisible(false);
    batchForm.resetFields();
    queryClient.invalidateQueries({ queryKey: ['devices'] });
    queryClient.invalidateQueries({ queryKey: ['deviceStats'] });
  };

  // ================== 处理函数 ==================

  const handleCreate = async (values: CreateDeviceDto) => {
    createMutation.mutate(values);
  };

  const handleSetProxy = async (values: { proxyId: string }) => {
    if (selectedRowKeys.length > 1) {
      // 批量配置代理
      const devicesWithoutProxy = selectedDevices.filter((d: Device) => !d.proxyId);
      const hide = message.loading(`正在配置 ${devicesWithoutProxy.length} 台设备...`, 0);
      let successCount = 0;

      for (const device of devicesWithoutProxy) {
        try {
          await deviceApi.setProxy(device.id, values.proxyId);
          successCount++;
        } catch (error) {
          console.error(`配置设备 ${device.name} 代理失败:`, error);
        }
      }

      hide();
      message.success(`成功配置 ${successCount}/${devicesWithoutProxy.length} 台设备`);
      setSelectedRowKeys([]);
      setProxyModalVisible(false);
      proxyForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    } else if (selectedDevice) {
      // 单个配置代理
      setProxyMutation.mutate({ deviceId: selectedDevice.id, proxyId: values.proxyId });
    }
  };

  // 打开代理配置弹窗
  const openProxyModal = useCallback((device: Device) => {
    setSelectedDevice(device);
    setSelectedRowKeys([device.id]); // 设置为单选模式
    setProxyModalVisible(true);
  }, []);

  // 打开云手机投屏
  const openPlayer = useCallback((device: Device) => {
    setPlayerDevice(device);
    setPlayerVisible(true);
  }, []);

  // 关闭云手机投屏
  const closePlayer = useCallback(() => {
    setPlayerVisible(false);
    setPlayerDevice(null);
  }, []);

  // 打开详情抽屉
  const openDetailDrawer = useCallback((device: Device) => {
    setSelectedDevice(device);
    setDetailDrawerVisible(true);
  }, []);

  // 应用筛选
  const handleApplyFilter = (values: FilterParams) => {
    setFilters(values);
    setFilterDrawerVisible(false);
    setSelectedRowKeys([]); // 清除选择
  };

  // 清除筛选
  const handleClearFilter = () => {
    setFilters({});
    filterForm.resetFields();
    setSelectedRowKeys([]);
  };

  // 快速筛选
  const handleQuickFilter = (key: string, value: string | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedRowKeys([]);
  };

  // 复制ADB连接信息
  const copyAdbInfo = (device: Device) => {
    const adbInfo = `${device.adbHost}:${device.adbPort}`;
    navigator.clipboard.writeText(adbInfo);
    message.success('ADB连接信息已复制');
  };

  // 导出设备列表
  const handleExport = () => {
    const exportData = filteredDevices.map((d: Device) => ({
      名称: d.name,
      状态: d.status,
      Android版本: d.androidVersion,
      配置: `${d.cpuCores}核/${d.memoryMB / 1024}GB`,
      ADB地址: d.status === 'running' ? `${d.adbHost}:${d.adbPort}` : '-',
      代理: d.proxyId ? '已配置' : '未配置',
      创建时间: dayjs(d.createdAt).format('YYYY-MM-DD HH:mm'),
    }));

    const csvContent = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `设备列表_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
    link.click();
    message.success('导出成功');
  };

  // ================== 渲染函数 ==================

  // 设备状态渲染
  const renderStatus = (status: Device['status']) => {
    const statusMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      running: { color: 'success', icon: <CheckCircleOutlined />, text: '运行中' },
      stopped: { color: 'default', icon: <CloseCircleOutlined />, text: '已停止' },
      starting: { color: 'processing', icon: <SyncOutlined spin />, text: '启动中' },
      stopping: { color: 'warning', icon: <SyncOutlined spin />, text: '停止中' },
      error: { color: 'error', icon: <WarningOutlined />, text: '异常' },
      unknown: { color: 'default', icon: null, text: '未知' },
    };
    const config = statusMap[status] || statusMap.unknown;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 表格行选择配置
  const rowSelection: TableRowSelection<Device> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
      {
        key: 'selectRunning',
        text: '选择运行中',
        onSelect: () => {
          const runningKeys = filteredDevices
            .filter((d: Device) => d.status === 'running')
            .map((d: Device) => d.id);
          setSelectedRowKeys(runningKeys);
        },
      },
      {
        key: 'selectStopped',
        text: '选择已停止',
        onSelect: () => {
          const stoppedKeys = filteredDevices
            .filter((d: Device) => d.status === 'stopped')
            .map((d: Device) => d.id);
          setSelectedRowKeys(stoppedKeys);
        },
      },
    ],
  };

  // 表格列定义
  const columns: ColumnsType<Device> = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      fixed: 'left',
      render: (name: string, record) => (
        <Space>
          <MobileOutlined style={{ color: '#1677ff' }} />
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 500 }}
            onClick={() => openDetailDrawer(record)}
          >
            {name}
          </Button>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatus,
      filters: [
        { text: '运行中', value: 'running' },
        { text: '已停止', value: 'stopped' },
        { text: '异常', value: 'error' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Android版本',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
      width: 120,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
      filters: [
        { text: 'Android 11.0', value: '11.0' },
        { text: 'Android 12.0', value: '12.0' },
        { text: 'Android 13.0', value: '13.0' },
      ],
      onFilter: (value, record) => record.androidVersion === value,
    },
    {
      title: '配置',
      key: 'config',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>
            <DesktopOutlined /> {record.cpuCores}核 CPU
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            <CloudServerOutlined /> {record.memoryMB / 1024}GB 内存
          </Text>
        </Space>
      ),
    },
    {
      title: '连接信息',
      key: 'connection',
      width: 200,
      render: (_, record) => {
        if (record.status !== 'running') {
          return <Text type="secondary">设备未运行</Text>;
        }
        return (
          <Space>
            <Tooltip title="ADB连接地址">
              <code style={{
                fontSize: 12,
                background: '#f5f5f5',
                padding: '2px 8px',
                borderRadius: 4,
              }}>
                {record.adbHost}:{record.adbPort}
              </code>
            </Tooltip>
            <Tooltip title="复制连接信息">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => copyAdbInfo(record)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '代理配置',
      key: 'proxy',
      width: 140,
      filters: [
        { text: '已配置', value: true },
        { text: '未配置', value: false },
      ],
      onFilter: (value, record) => (value ? !!record.proxyId : !record.proxyId),
      render: (_, record) =>
        record.proxyId ? (
          <Space>
            <Tag color="blue" icon={<GlobalOutlined />}>
              已配置
            </Tag>
            <Popconfirm
              title="确定移除代理配置？"
              onConfirm={() => removeProxyMutation.mutate(record.id)}
            >
              <Button type="link" size="small" danger>
                移除
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => openProxyModal(record)}
          >
            配置代理
          </Button>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (time: string) => (
        <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(time).format('MM-DD HH:mm')}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'stopped' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              loading={startMutation.isPending}
              onClick={() => startMutation.mutate(record.id)}
            >
              启动
            </Button>
          )}
          {record.status === 'running' && (
            <>
              <Tooltip title="投屏">
                <Button
                  type="primary"
                  size="small"
                  icon={<VideoCameraOutlined />}
                  onClick={() => openPlayer(record)}
                />
              </Tooltip>
              <Button
                size="small"
                icon={<StopOutlined />}
                loading={stopMutation.isPending}
                onClick={() => stopMutation.mutate(record.id)}
              >
                停止
              </Button>
            </>
          )}
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openDetailDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此设备？"
            description="删除后不可恢复"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 批量操作下拉菜单
  const batchActionMenu = {
    items: [
      {
        key: 'start',
        icon: <PlayCircleOutlined />,
        label: '批量启动',
        onClick: handleBatchStart,
      },
      {
        key: 'stop',
        icon: <StopOutlined />,
        label: '批量停止',
        onClick: handleBatchStop,
      },
      {
        key: 'proxy',
        icon: <GlobalOutlined />,
        label: '批量配置代理',
        onClick: handleBatchSetProxy,
      },
      { type: 'divider' as const },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '批量删除',
        danger: true,
        onClick: handleBatchDelete,
      },
    ],
  };

  // 创建设备下拉菜单
  const createMenu = {
    items: [
      {
        key: 'single',
        icon: <PlusOutlined />,
        label: '创建单个设备',
        onClick: () => setCreateModalVisible(true),
      },
      {
        key: 'batch',
        icon: <ThunderboltOutlined />,
        label: '批量创建设备',
        onClick: () => setBatchCreateModalVisible(true),
      },
    ],
  };

  // 统计卡片数据
  const statsItems = [
    {
      title: '设备总数',
      value: stats?.total || 0,
      icon: <MobileOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      color: '#1677ff',
    },
    {
      title: '运行中',
      value: stats?.running || 0,
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      color: '#52c41a',
      suffix: stats?.total ? `${((stats?.running || 0) / stats?.total * 100).toFixed(0)}%` : '0%',
    },
    {
      title: '已停止',
      value: stats?.stopped || 0,
      icon: <CloseCircleOutlined style={{ fontSize: 24, color: '#999' }} />,
      color: '#999',
    },
    {
      title: '异常',
      value: stats?.error || 0,
      icon: <WarningOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />,
      color: '#ff4d4f',
    },
  ];

  // 初始加载时显示骨架屏
  if (isLoading) {
    return <DeviceListSkeleton />;
  }

  return (
    <Row gutter={16}>
      {/* 左侧分组面板 */}
      <Col xs={24} sm={24} md={6} lg={5} xl={4}>
        <DeviceGroupPanel
          groups={deviceGroups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleSelectGroup}
          onCreateGroup={handleCreateGroup}
          onEditGroup={handleEditGroup}
          onDeleteGroup={handleDeleteGroup}
          totalDeviceCount={stats?.total || 0}
        />
      </Col>

      {/* 右侧主内容区 */}
      <Col xs={24} sm={24} md={18} lg={19} xl={20}>
        <div>
          {/* 页面标题 */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                <MobileOutlined style={{ marginRight: 8 }} />
                设备管理
                {selectedGroupId && selectedGroupId !== 'ungrouped' && (
                  <Tag color={deviceGroups.find(g => g.id === selectedGroupId)?.color} style={{ marginLeft: 8 }}>
                    {deviceGroups.find(g => g.id === selectedGroupId)?.name || '未知分组'}
                  </Tag>
                )}
                {selectedGroupId === 'ungrouped' && (
                  <Tag color="default" style={{ marginLeft: 8 }}>未分组</Tag>
                )}
              </Title>
              <Text type="secondary">
                管理和监控云手机设备，支持批量操作和高级筛选
              </Text>
            </div>
            <Space>
              <Segmented
                options={[
                  { value: 'list', icon: <UnorderedListOutlined /> },
                  { value: 'card', icon: <AppstoreOutlined /> },
                ]}
                value={viewMode}
                onChange={(v) => setViewMode(v as 'list' | 'card')}
              />
            </Space>
          </div>

          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            {statsItems.map((item, index) => (
              <Col span={6} key={index}>
                <Card
                  hoverable
                  onClick={() => {
                    if (index === 1) handleQuickFilter('status', 'running');
                    else if (index === 2) handleQuickFilter('status', 'stopped');
                    else if (index === 3) handleQuickFilter('status', 'error');
                    else handleClearFilter();
                  }}
                  style={{
                    cursor: 'pointer',
                    borderColor: filters.status === ['running', 'stopped', 'error'][index - 1] ? item.color : undefined,
                  }}
                >
                  <Space>
                    {item.icon}
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.title}</Text>
                      <div style={{ fontSize: 24, fontWeight: 600, color: item.color }}>
                        {item.value}
                        {item.suffix && (
                          <Text style={{ fontSize: 12, marginLeft: 8, color: '#999' }}>
                            {item.suffix}
                          </Text>
                        )}
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              {/* 搜索框 */}
              <Input.Search
                placeholder="搜索设备名称或ID"
                allowClear
                style={{ width: 240 }}
                prefix={<SearchOutlined />}
                onSearch={(value) => handleQuickFilter('searchText', value || undefined)}
                onChange={(e) => {
                  if (!e.target.value) handleQuickFilter('searchText', undefined);
                }}
              />

              {/* 快速筛选 */}
              <Select
                placeholder="状态筛选"
                allowClear
                style={{ width: 120 }}
                value={filters.status}
                onChange={(value) => handleQuickFilter('status', value)}
              >
                <Option value="running">运行中</Option>
                <Option value="stopped">已停止</Option>
                <Option value="error">异常</Option>
              </Select>

              <Select
                placeholder="Android版本"
                allowClear
                style={{ width: 140 }}
                value={filters.androidVersion}
                onChange={(value) => handleQuickFilter('androidVersion', value)}
              >
                <Option value="11.0">Android 11.0</Option>
                <Option value="12.0">Android 12.0</Option>
                <Option value="13.0">Android 13.0</Option>
              </Select>

              <Select
                placeholder="代理状态"
                allowClear
                style={{ width: 120 }}
                value={filters.hasProxy}
                onChange={(value) => handleQuickFilter('hasProxy', value)}
              >
                <Option value={true}>已配置代理</Option>
                <Option value={false}>未配置代理</Option>
              </Select>

              {activeFilterCount > 0 && (
                <Button
                  type="link"
                  icon={<ClearOutlined />}
                  onClick={handleClearFilter}
                >
                  清除筛选 ({activeFilterCount})
                </Button>
              )}
            </Space>
          </Col>

          <Col>
            <Space>
              {/* 批量操作按钮 */}
              {selectedRowKeys.length > 0 && (
                <Dropdown menu={batchActionMenu}>
                  <Button>
                    <Space>
                      批量操作
                      <Badge count={selectedRowKeys.length} size="small" />
                      <DownOutlined />
                    </Space>
                  </Button>
                </Dropdown>
              )}

              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                disabled={filteredDevices.length === 0}
              >
                导出
              </Button>

              <Button
                icon={<ReloadOutlined spin={isRefetching} />}
                onClick={() => refetch()}
              >
                刷新
              </Button>

              <Dropdown menu={createMenu}>
                <Button type="primary" icon={<PlusOutlined />}>
                  创建设备 <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </Col>
        </Row>

        {/* 已选择提示 */}
        {selectedRowKeys.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 16 }}
            message={
              <Space>
                <span>已选择 <Text strong>{selectedRowKeys.length}</Text> 台设备</span>
                <Divider type="vertical" />
                <Button type="link" size="small" onClick={() => setSelectedRowKeys([])}>
                  取消选择
                </Button>
              </Space>
            }
          />
        )}
      </Card>

      {/* 设备列表 */}
      {viewMode === 'list' ? (
        <Card>
          <Table<Device>
            columns={columns}
            dataSource={filteredDevices}
            rowKey="id"
            loading={isLoading}
            rowSelection={rowSelection}
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `显示 ${range[0]}-${range[1]} 条，共 ${total} 台设备`,
            }}
            size="middle"
          />
        </Card>
      ) : (
        <Card
          title={
            <Space>
              <AppstoreOutlined />
              <span>设备卡片视图</span>
              <Tag color="blue">虚拟滚动优化</Tag>
            </Space>
          }
          extra={
            <Text type="secondary">
              共 {filteredDevices.length} 台设备
            </Text>
          }
        >
          <VirtualDeviceList
            devices={filteredDevices}
            onStart={handleStart}
            onStop={handleStop}
            onDelete={(device) => handleDelete(device.id)}
            onConfigProxy={handleOpenProxyModal}
            onViewDetail={handleViewDetail}
            onOpenPlayer={handleOpenPlayer}
            loading={isLoading}
            selectedKeys={selectedRowKeys}
            onSelectChange={setSelectedRowKeys}
          />
        </Card>
      )}

      {/* 创建设备弹窗 */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            创建设备
          </Space>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="设备名称"
            name="name"
            rules={[
              { required: true, message: '请输入设备名称' },
              { min: 3, message: '设备名称至少3个字符' },
              { max: 50, message: '设备名称最多50个字符' },
            ]}
          >
            <Input placeholder="例如: CloudPhone-001" prefix={<MobileOutlined />} />
          </Form.Item>
          <Form.Item label="Android版本" name="androidVersion" initialValue="12.0">
            <Select>
              <Option value="11.0">Android 11.0</Option>
              <Option value="12.0">Android 12.0 (推荐)</Option>
              <Option value="13.0">Android 13.0</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="CPU核心数" name="cpuCores" initialValue={4}>
                <Select>
                  <Option value={2}>2 核</Option>
                  <Option value={4}>4 核 (推荐)</Option>
                  <Option value={8}>8 核</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="内存大小" name="memoryMB" initialValue={4096}>
                <Select>
                  <Option value={2048}>2 GB</Option>
                  <Option value={4096}>4 GB (推荐)</Option>
                  <Option value={8192}>8 GB</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 批量创建设备弹窗 */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined />
            批量创建设备
          </Space>
        }
        open={batchCreateModalVisible}
        onCancel={() => setBatchCreateModalVisible(false)}
        onOk={() => batchForm.submit()}
        width={500}
      >
        <Alert
          type="info"
          message="批量创建会按照命名规则自动生成设备名称，例如: CP-001, CP-002..."
          style={{ marginBottom: 16 }}
        />
        <Form form={batchForm} layout="vertical" onFinish={handleBatchCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="名称前缀"
                name="prefix"
                rules={[{ required: true, message: '请输入名称前缀' }]}
                initialValue="CP"
              >
                <Input placeholder="例如: CP" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="创建数量"
                name="count"
                rules={[{ required: true, message: '请输入创建数量' }]}
                initialValue={5}
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Android版本" name="androidVersion" initialValue="12.0">
            <Select>
              <Option value="11.0">Android 11.0</Option>
              <Option value="12.0">Android 12.0 (推荐)</Option>
              <Option value="13.0">Android 13.0</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="CPU核心数" name="cpuCores" initialValue={4}>
                <Select>
                  <Option value={2}>2 核</Option>
                  <Option value={4}>4 核 (推荐)</Option>
                  <Option value={8}>8 核</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="内存大小" name="memoryMB" initialValue={4096}>
                <Select>
                  <Option value={2048}>2 GB</Option>
                  <Option value={4096}>4 GB (推荐)</Option>
                  <Option value={8192}>8 GB</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 代理配置弹窗 */}
      <Modal
        title={
          <Space>
            <GlobalOutlined />
            {selectedRowKeys.length > 1
              ? `为 ${selectedRowKeys.length} 台设备配置代理`
              : `为 ${selectedDevice?.name} 配置代理`
            }
          </Space>
        }
        open={proxyModalVisible}
        onCancel={() => {
          setProxyModalVisible(false);
          if (selectedRowKeys.length === 1) {
            setSelectedRowKeys([]);
          }
        }}
        onOk={() => proxyForm.submit()}
        confirmLoading={setProxyMutation.isPending}
      >
        <Form form={proxyForm} layout="vertical" onFinish={handleSetProxy}>
          <Form.Item
            label="选择代理"
            name="proxyId"
            rules={[{ required: true, message: '请选择代理' }]}
          >
            <Select placeholder="请选择可用代理" showSearch optionFilterProp="children">
              {(proxiesData?.data || [])
                .filter((p: ProxyConfig) => p.status === 'available')
                .map((proxy: ProxyConfig) => (
                  <Option key={proxy.id} value={proxy.id}>
                    <Space>
                      <GlobalOutlined />
                      {proxy.country} - {proxy.host}:{proxy.port}
                      <Tag>{proxy.protocol.toUpperCase()}</Tag>
                    </Space>
                  </Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 设备详情抽屉 */}
      <Drawer
        title={
          <Space>
            <MobileOutlined />
            设备详情
          </Space>
        }
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={500}
        extra={
          <Space>
            {selectedDevice?.status === 'stopped' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  startMutation.mutate(selectedDevice.id);
                  setDetailDrawerVisible(false);
                }}
              >
                启动
              </Button>
            )}
            {selectedDevice?.status === 'running' && (
              <Button
                icon={<StopOutlined />}
                onClick={() => {
                  stopMutation.mutate(selectedDevice.id);
                  setDetailDrawerVisible(false);
                }}
              >
                停止
              </Button>
            )}
          </Space>
        }
      >
        {selectedDevice && (
          <>
            {/* 状态卡片 */}
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: 18 }}>{selectedDevice.name}</Text>
                  {renderStatus(selectedDevice.status)}
                </div>
                <Text type="secondary" copyable style={{ fontSize: 12 }}>
                  ID: {selectedDevice.id}
                </Text>
              </Space>
            </Card>

            {/* 详细信息 */}
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Android版本">
                <Tag color="blue">{selectedDevice.androidVersion}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="CPU核心数">
                {selectedDevice.cpuCores} 核
              </Descriptions.Item>
              <Descriptions.Item label="内存大小">
                {selectedDevice.memoryMB / 1024} GB
              </Descriptions.Item>
              <Descriptions.Item label="ADB地址">
                {selectedDevice.status === 'running' ? (
                  <Space>
                    <code>{selectedDevice.adbHost}:{selectedDevice.adbPort}</code>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyAdbInfo(selectedDevice)}
                    />
                  </Space>
                ) : (
                  <Text type="secondary">设备未运行</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="代理配置">
                {selectedDevice.proxyId ? (
                  <Tag color="blue" icon={<GlobalOutlined />}>已配置</Tag>
                ) : (
                  <Tag>未配置</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(selectedDevice.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {dayjs(selectedDevice.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {/* 资源使用情况 */}
            <Card title="资源使用" style={{ marginTop: 16 }} size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary">CPU使用率</Text>
                    <Text>35%</Text>
                  </div>
                  <Progress percent={35} size="small" status="active" />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary">内存使用</Text>
                    <Text>1.5GB / {selectedDevice.memoryMB / 1024}GB</Text>
                  </div>
                  <Progress
                    percent={Math.round(1536 / selectedDevice.memoryMB * 100)}
                    size="small"
                    status="active"
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary">存储使用</Text>
                    <Text>8.2GB / 32GB</Text>
                  </div>
                  <Progress percent={26} size="small" />
                </div>
              </Space>
            </Card>

            {/* 快捷操作 */}
            <Card title="快捷操作" style={{ marginTop: 16 }} size="small">
              <Space wrap>
                <Button
                  type="primary"
                  icon={<VideoCameraOutlined />}
                  disabled={selectedDevice.status !== 'running'}
                  onClick={() => {
                    setDetailDrawerVisible(false);
                    openPlayer(selectedDevice);
                  }}
                >
                  连接云手机
                </Button>
                <Button
                  icon={<ApiOutlined />}
                  disabled={selectedDevice.status !== 'running'}
                >
                  ADB控制台
                </Button>
                <Button
                  icon={<GlobalOutlined />}
                  onClick={() => {
                    setDetailDrawerVisible(false);
                    openProxyModal(selectedDevice);
                  }}
                >
                  配置代理
                </Button>
                <Popconfirm
                  title="确定删除此设备？"
                  onConfirm={() => {
                    deleteMutation.mutate(selectedDevice.id);
                    setDetailDrawerVisible(false);
                  }}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    删除设备
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          </>
        )}
      </Drawer>

      {/* 云手机投屏弹窗 */}
      {playerDevice && (
        <CloudPhonePlayer
          device={playerDevice}
          visible={playerVisible}
          onClose={closePlayer}
        />
      )}
        </div>
      </Col>
    </Row>
  );
};

export default DeviceList;
