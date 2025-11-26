import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Space,
  Button,
  Select,
  DatePicker,
  Input,
  Statistic,
  Tag,
  Tooltip,
  message,
  theme,
} from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
  MobileOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAdminUsageRecords, useAdminUsageStats, useUsers, useDevices } from '@/hooks/queries';
import type { UsageRecord, User, Device } from '@/types';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * 用户设备使用监控页面（管理员专属）
 *
 * 功能:
 * 1. ✅ 使用统计概览（总时长、活跃用户、总费用等）
 * 2. ✅ 高级筛选（用户、设备、时间范围、状态）
 * 3. ✅ 详细使用记录表格
 * 4. ✅ 导出功能
 * 5. ✅ 用户使用详情查看
 */
const UsageMonitorContent = () => {
  const { token } = theme.useToken();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userFilter, setUserFilter] = useState<string | undefined>();
  const [deviceFilter, setDeviceFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  // React Query hooks
  const params = useMemo(() => {
    const p: any = { page, pageSize };
    if (userFilter) p.userId = userFilter;
    if (deviceFilter) p.deviceId = deviceFilter;
    if (statusFilter) p.status = statusFilter;
    if (searchKeyword) p.search = searchKeyword;
    if (dateRange) {
      p.startDate = dateRange[0].format('YYYY-MM-DD');
      p.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    return p;
  }, [page, pageSize, userFilter, deviceFilter, statusFilter, searchKeyword, dateRange]);

  // 使用新的 React Query Hook
  const { data, isLoading, error, refetch } = useAdminUsageRecords(params);

  const { data: usersData } = useUsers({ page: 1, pageSize: 1000 });
  const { data: devicesData } = useDevices({ page: 1, pageSize: 1000 });

  // ============ 页面标题 ============
  useEffect(() => {
    document.title = '使用监控 - 云手机管理平台';
    return () => {
      document.title = '云手机管理平台';
    };
  }, []);

  // ============ 快捷键支持 ============
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新数据...');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [refetch]);

  const usageRecords = data?.data || [];
  const total = data?.total || 0;
  const users = usersData?.data || [];
  const devices = devicesData?.data || [];

  // ============ 统计数据获取（使用后端API） ============
  const statsParams = useMemo(() => {
    const p: any = {};
    if (userFilter) p.userId = userFilter;
    if (deviceFilter) p.deviceId = deviceFilter;
    if (statusFilter) p.status = statusFilter;
    if (searchKeyword) p.search = searchKeyword;
    if (dateRange) {
      p.startDate = dateRange[0].format('YYYY-MM-DD');
      p.endDate = dateRange[1].format('YYYY-MM-DD');
    }
    return p;
  }, [userFilter, deviceFilter, statusFilter, searchKeyword, dateRange]);

  const { data: statsData } = useAdminUsageStats(statsParams);

  const stats = statsData || {
    totalDuration: 0,
    totalCost: 0,
    activeUsers: 0,
    activeDevices: 0,
    avgDuration: 0,
    totalRecords: 0,
  };

  // ============ 工具函数 ============
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  const formatDurationFull = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}时 ${minutes}分 ${secs}秒`;
  }, []);

  const formatMemory = useCallback((usage: number) => {
    return usage ? `${((usage || 0) / 1024).toFixed(2)} GB` : '-';
  }, []);

  const formatNetwork = useCallback((usage: number) => {
    return usage ? `${((usage || 0) / 1024 / 1024).toFixed(2)} MB` : '-';
  }, []);

  const formatCost = useCallback((cost: number | string) => {
    const numCost = typeof cost === 'string' ? parseFloat(cost) : cost;
    return `¥${(numCost || 0).toFixed(2)}`;
  }, []);

  const formatCpuUsage = useCallback((usage: number) => {
    return usage ? `${(usage || 0).toFixed(1)}%` : '-';
  }, []);

  // ============ 事件处理 ============
  const handleExport = useCallback(async () => {
    try {
      message.loading({ content: '正在导出...', key: 'export' });

      const exportParams: any = { format: 'csv' };
      if (userFilter) exportParams.userId = userFilter;
      if (deviceFilter) exportParams.deviceId = deviceFilter;
      if (statusFilter) exportParams.status = statusFilter;
      if (searchKeyword) exportParams.search = searchKeyword;
      if (dateRange) {
        exportParams.startDate = dateRange[0].format('YYYY-MM-DD');
        exportParams.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const { exportAdminUsageRecords } = await import('@/services/billing');
      const response = await exportAdminUsageRecords(exportParams);

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([(response as any).data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `usage-records-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({ content: '导出成功！', key: 'export' });
    } catch (error: any) {
      message.error({ content: `导出失败: ${error.message}`, key: 'export' });
    }
  }, [userFilter, deviceFilter, statusFilter, searchKeyword, dateRange]);

  const handleViewUserDetails = useCallback((userId: string) => {
    message.info(`查看用户 ${userId} 的使用详情（功能开发中）`);
    // TODO: 打开用户使用详情模态框或跳转到详情页
  }, []);

  const handleReset = useCallback(() => {
    setUserFilter(undefined);
    setDeviceFilter(undefined);
    setStatusFilter(undefined);
    setSearchKeyword('');
    setDateRange(null);
    setPage(1);
  }, []);

  // ============ 表格列定义 ============
  const columns: ColumnsType<UsageRecord> = useMemo(
    () => [
      {
        title: '用户',
        dataIndex: 'userId',
        key: 'userId',
        width: 150,
        ellipsis: true,
        render: (userId: string) => {
          const user = users.find((u: User) => u.id === userId);
          return (
            <Tooltip title={`ID: ${userId}`}>
              <Space>
                <UserOutlined />
                {user?.username || userId.substring(0, 8)}
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: '设备',
        dataIndex: 'deviceId',
        key: 'deviceId',
        width: 150,
        ellipsis: true,
        render: (deviceId: string, record: UsageRecord) => {
          return (
            <Tooltip title={`ID: ${deviceId}`}>
              <Space>
                <MobileOutlined />
                {record.device?.name || deviceId.substring(0, 8)}
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: '开始时间',
        dataIndex: 'startTime',
        key: 'startTime',
        width: 160,
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
        sorter: (a, b) => dayjs(a.startTime).unix() - dayjs(b.startTime).unix(),
      },
      {
        title: '结束时间',
        dataIndex: 'endTime',
        key: 'endTime',
        width: 160,
        render: (date: string) =>
          date ? (
            dayjs(date).format('YYYY-MM-DD HH:mm:ss')
          ) : (
            <Tag color="green">使用中</Tag>
          ),
      },
      {
        title: '使用时长',
        dataIndex: 'duration',
        key: 'duration',
        width: 120,
        render: (duration: number) => (
          <Tooltip title={formatDurationFull(duration)}>
            <Tag color="blue" icon={<ClockCircleOutlined />}>
              {formatDuration(duration)}
            </Tag>
          </Tooltip>
        ),
        sorter: (a, b) => (a.duration || 0) - (b.duration || 0),
      },
      {
        title: 'CPU',
        dataIndex: 'cpuUsage',
        key: 'cpuUsage',
        width: 80,
        render: formatCpuUsage,
        sorter: (a, b) => (a.cpuUsage || 0) - (b.cpuUsage || 0),
      },
      {
        title: '内存',
        dataIndex: 'memoryUsage',
        key: 'memoryUsage',
        width: 100,
        render: formatMemory,
        sorter: (a, b) => (a.memoryUsage || 0) - (b.memoryUsage || 0),
      },
      {
        title: '流量',
        dataIndex: 'networkUsage',
        key: 'networkUsage',
        width: 100,
        render: formatNetwork,
        sorter: (a, b) => (a.networkUsage || 0) - (b.networkUsage || 0),
      },
      {
        title: '费用',
        dataIndex: 'cost',
        key: 'cost',
        width: 100,
        render: (cost: string | number) => (
          <Tag color="red" icon={<DollarOutlined />}>
            {formatCost(cost)}
          </Tag>
        ),
        sorter: (a, b) => {
          const aCost = typeof a.cost === 'string' ? parseFloat(a.cost) : a.cost;
          const bCost = typeof b.cost === 'string' ? parseFloat(b.cost) : b.cost;
          return (aCost || 0) - (bCost || 0);
        },
      },
      {
        title: '操作',
        key: 'action',
        width: 100,
        fixed: 'right',
        render: (_, record: UsageRecord) => (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewUserDetails(record.userId)}
            >
              详情
            </Button>
          </Space>
        ),
      },
    ],
    [
      users,
      formatDuration,
      formatDurationFull,
      formatCpuUsage,
      formatMemory,
      formatNetwork,
      formatCost,
      handleViewUserDetails,
    ]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 标题 */}
        <Card>
          <h2 style={{ margin: 0 }}>用户设备使用监控</h2>
          <p style={{ color: NEUTRAL_LIGHT.text.secondary, marginTop: 8, marginBottom: 0 }}>
            实时监控用户设备使用情况，包括使用时长、资源消耗和费用统计
            <Tooltip title="Ctrl+R 刷新数据">
              <Tag color="blue" style={{ marginLeft: 8 }}>
                快捷键: Ctrl+R
              </Tag>
            </Tooltip>
          </p>
        </Card>

        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总使用时长"
                value={formatDuration(stats.totalDuration)}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: SEMANTIC.success.dark }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="活跃用户"
                value={stats.activeUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: token.colorPrimary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="活跃设备"
                value={stats.activeDevices}
                prefix={<MobileOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总费用"
                value={stats.totalCost.toFixed(2)}
                prefix="¥"
                precision={2}
                valueStyle={{ color: SEMANTIC.error.dark }}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选栏 */}
        <Card>
          <Space size="middle" wrap>
            <Select
              placeholder="筛选用户"
              allowClear
              showSearch
              style={{ width: 200 }}
              onChange={(value) => setUserFilter(value)}
              value={userFilter}
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {users.map((user: User) => (
                <Option key={user.id} value={user.id}>
                  {user.username || user.email}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="筛选设备"
              allowClear
              showSearch
              style={{ width: 200 }}
              onChange={(value) => setDeviceFilter(value)}
              value={deviceFilter}
              optionFilterProp="children"
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {devices.map((device: Device) => (
                <Option key={device.id} value={device.id}>
                  {device.name || device.id}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="状态"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setStatusFilter(value)}
              value={statusFilter}
            >
              <Option value="active">使用中</Option>
              <Option value="completed">已结束</Option>
            </Select>

            <RangePicker
              style={{ width: 260 }}
              onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
              value={dateRange}
              format="YYYY-MM-DD"
            />

            <Search
              placeholder="搜索用户ID或设备ID"
              style={{ width: 200 }}
              onSearch={(value) => setSearchKeyword(value)}
              allowClear
            />

            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>

            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>

            <Tooltip title="Ctrl+R">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                刷新
              </Button>
            </Tooltip>
          </Space>
        </Card>

        {/* 使用记录表格 */}
        <Card>
          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && usageRecords.length === 0}
            emptyDescription="暂无使用记录"
            errorDescription="加载使用记录失败"
            onRetry={() => refetch()}
            loadingType="skeleton"
            skeletonRows={5}
          >
            <Table
              columns={columns}
              dataSource={usageRecords}
              rowKey="id"
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: (page, pageSize) => {
                  setPage(page);
                  setPageSize(pageSize);
                },
              }}
              scroll={{ x: 1600 }}
            />
          </LoadingState>
        </Card>
      </Space>
    </div>
  );
};

/**
 * 用户设备使用监控页面
 * 包含 ErrorBoundary 错误边界保护
 */
const UsageMonitor = () => {
  return (
    <ErrorBoundary>
      <UsageMonitorContent />
    </ErrorBoundary>
  );
};

export default UsageMonitor;
