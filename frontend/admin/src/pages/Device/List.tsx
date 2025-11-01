import { useState, useEffect, useMemo, useCallback } from 'react';
import { Space, Form, message, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import type { Device, CreateDeviceDto } from '@/types';
import dayjs from 'dayjs';
import { exportToExcel, exportToCSV } from '@/utils/export';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useRole } from '@/hooks/useRole';

// ✅ 导入优化的子组件（React.memo）
import { DeviceActions, DeviceStatusTag, STATUS_CONFIG } from '@/components/Device';
import {
  DeviceStatsCards,
  DeviceFilterBar,
  DeviceBatchActions,
  DeviceTable,
  CreateDeviceModal,
} from '@/components/DeviceList';

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
import {
  batchStartDevices,
  batchStopDevices,
  batchRebootDevices,
  batchDeleteDevices,
} from '@/services/device';
import { queryClient } from '@/lib/react-query';
import { deviceKeys } from '@/hooks/useDevices';

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
  const { isAdmin } = useRole();

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

  // 解构数据 (API Gateway包装了两层)
  const devices = devicesData?.data?.data || [];
  const total = devicesData?.data?.total || 0;

  // Real-time updates via Socket.IO
  // ✅ Backend uses Socket.IO (notification-service on port 30006)
  // For Socket.IO integration, install: pnpm add socket.io-client
  // Then create a useSocketIO hook similar to:
  //
  // import { io, Socket } from 'socket.io-client';
  // const socket = io('http://localhost:30006');
  // socket.on('notification', (data) => { /* handle device updates */ });
  // socket.emit('subscribe', { userId: currentUserId });
  //
  // For now, using polling via React Query's refetchInterval
  const isConnected = false;
  const lastMessage = null;

  // 处理 WebSocket 消息
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;

      // 设备状态更新 - 乐观更新 UI
      if (type === 'device:status') {
        // ✅ 直接更新缓存中的数据
        queryClient.setQueryData(deviceKeys.list(params), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((device: Device) =>
              device.id === data.deviceId ? { ...device, status: data.status } : device
            ),
          };
        });
        // 失效统计缓存
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      }
      // 设备创建/删除 - 失效列表缓存
      else if (type === 'device:created') {
        message.info(`新设备已创建: ${data.name}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      } else if (type === 'device:deleted') {
        message.warning(`设备已删除: ${data.name}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      }
    }
  }, [lastMessage, params]);

  // ✅ 使用 useCallback 优化事件处理函数
  const handleCreate = useCallback(
    async (values: CreateDeviceDto) => {
      await createDeviceMutation.mutateAsync(values);
      setCreateModalVisible(false);
      form.resetFields();
    },
    [createDeviceMutation, form]
  );

  const handleStart = useCallback(
    async (id: string) => {
      await startDeviceMutation.mutateAsync(id);
    },
    [startDeviceMutation]
  );

  const handleStop = useCallback(
    async (id: string) => {
      await stopDeviceMutation.mutateAsync(id);
    },
    [stopDeviceMutation]
  );

  const handleReboot = useCallback(
    async (id: string) => {
      await rebootDeviceMutation.mutateAsync(id);
    },
    [rebootDeviceMutation]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteDeviceMutation.mutateAsync(id);
    },
    [deleteDeviceMutation]
  );

  // ✅ 批量操作（使用 useAsyncOperation 消除静默失败）
  const { execute: executeBatchOperation } = useAsyncOperation();

  const handleBatchStart = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要启动的设备');
      return;
    }

    await executeBatchOperation(() => batchStartDevices(selectedRowKeys as string[]), {
      successMessage: `成功启动 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量启动${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        setSelectedRowKeys([]);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      },
    });
  }, [selectedRowKeys, executeBatchOperation]);

  const handleBatchStop = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要停止的设备');
      return;
    }

    await executeBatchOperation(() => batchStopDevices(selectedRowKeys as string[]), {
      successMessage: `成功停止 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量停止${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        setSelectedRowKeys([]);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      },
    });
  }, [selectedRowKeys, executeBatchOperation]);

  const handleBatchReboot = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要重启的设备');
      return;
    }

    await executeBatchOperation(() => batchRebootDevices(selectedRowKeys as string[]), {
      successMessage: `成功重启 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量重启${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        setSelectedRowKeys([]);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        }, 2000);
      },
    });
  }, [selectedRowKeys, executeBatchOperation]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的设备');
      return;
    }

    await executeBatchOperation(() => batchDeleteDevices(selectedRowKeys as string[]), {
      successMessage: `成功删除 ${selectedRowKeys.length} 台设备`,
      errorContext: `批量删除${selectedRowKeys.length}台设备`,
      onSuccess: () => {
        setSelectedRowKeys([]);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      },
    });
  }, [selectedRowKeys, executeBatchOperation]);

  // ✅ 使用 useMemo 优化导出数据转换（使用 STATUS_CONFIG 代替本地 statusMap）
  const exportData = useMemo(
    () =>
      devices.map((device) => ({
        设备ID: device.id,
        设备名称: device.name,
        状态: STATUS_CONFIG[device.status as keyof typeof STATUS_CONFIG]?.text || device.status,
        Android版本: device.androidVersion,
        CPU核心数: device.cpuCores,
        '内存(MB)': device.memoryMB,
        '存储(MB)': device.storageMB,
        IP地址: device.ipAddress || '-',
        VNC端口: device.vncPort || '-',
        创建时间: dayjs(device.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      })),
    [devices]
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
  const exportMenuItems: MenuProps['items'] = useMemo(
    () => [
      { key: 'excel', label: '导出为 Excel', onClick: handleExportExcel },
      { key: 'csv', label: '导出为 CSV', onClick: handleExportCSV },
      { key: 'json', label: '导出为 JSON', onClick: handleExportJSON },
    ],
    [handleExportExcel, handleExportCSV, handleExportJSON]
  );

  // ✅ 使用 useMemo 优化表格列配置（避免每次渲染都重新创建）
  const columns: ColumnsType<Device> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 120,
        ellipsis: true,
        render: (id: string) => (
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id.substring(0, 8)}...</span>
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
        // ✅ 使用 memo 化的 DeviceStatusTag 组件
        render: (status: string) => <DeviceStatusTag status={status as any} />,
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
        // ✅ 使用 memo 化的 DeviceActions 组件
        render: (_: any, record: Device) => (
          <DeviceActions
            device={record}
            onStart={handleStart}
            onStop={handleStop}
            onReboot={handleReboot}
            onDelete={handleDelete}
            loading={{
              start: startDeviceMutation.isPending,
              stop: stopDeviceMutation.isPending,
              reboot: rebootDeviceMutation.isPending,
              delete: deleteDeviceMutation.isPending,
            }}
          />
        ),
      },
    ],
    [
      handleStart,
      handleStop,
      handleReboot,
      handleDelete,
      startDeviceMutation.isPending,
      stopDeviceMutation.isPending,
      rebootDeviceMutation.isPending,
      deleteDeviceMutation.isPending,
    ]
  );

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <DeviceStatsCards stats={stats} />

      {/* 筛选和操作栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* 第一行：搜索和筛选 */}
          <DeviceFilterBar
            onSearch={setSearchKeyword}
            onStatusChange={setStatusFilter}
            onAndroidVersionChange={setAndroidVersionFilter}
            onDateRangeChange={(dates, dateStrings) => {
              setDateRange(dates ? [dateStrings[0], dateStrings[1]] : null);
            }}
            isConnected={isConnected}
            realtimeEnabled={realtimeEnabled}
            onRealtimeToggle={() => setRealtimeEnabled(!realtimeEnabled)}
          />

          {/* 第二行：批量操作和导出 */}
          <DeviceBatchActions
            selectedCount={selectedRowKeys.length}
            onCreateClick={() => setCreateModalVisible(true)}
            onBatchStart={handleBatchStart}
            onBatchStop={handleBatchStop}
            onBatchReboot={handleBatchReboot}
            onBatchDelete={handleBatchDelete}
            exportMenuItems={exportMenuItems}
          />
        </Space>
      </Card>

      {/* 设备列表表格 */}
      <Card>
        <DeviceTable
          columns={columns}
          dataSource={devices}
          loading={isLoading}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          }}
        />
      </Card>

      {/* 创建设备弹窗 */}
      <CreateDeviceModal
        visible={createModalVisible}
        form={form}
        loading={createDeviceMutation.isPending}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onFinish={handleCreate}
      />
    </div>
  );
};

export default DeviceList;
