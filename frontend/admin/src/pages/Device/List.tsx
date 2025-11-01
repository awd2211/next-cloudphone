import { useState, useEffect, useMemo, useCallback } from 'react';
import { Space, Form, message, Card } from 'antd';
import type { MenuProps } from 'antd';
import type { Device, CreateDeviceDto } from '@/types';
import { useRole } from '@/hooks/useRole';

// ✅ 导入优化的子组件
import { DeviceStatusTag } from '@/components/Device';
import {
  DeviceStatsCards,
  DeviceFilterBar,
  DeviceBatchActions,
  DeviceTable,
  CreateDeviceModal,
  useDeviceColumns,
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

// ✅ 批量操作 hook
import { useDeviceBatchOperations } from '@/hooks/useDeviceBatchOperations';

// ✅ 导出工具函数
import { exportDevicesAsExcel, exportDevicesAsCSV, exportDevicesAsJSON } from '@/utils/deviceExport';

// ✅ React Query 相关
import { queryClient } from '@/lib/react-query';
import { deviceKeys } from '@/hooks/useDevices';

/**
 * 设备列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 提取导出逻辑到 utils
 * 5. ✅ 提取表格列定义到 components
 * 6. ✅ 提取批量操作到 hooks
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

  // 解构数据
  const devices = devicesData?.data?.data || [];
  const total = devicesData?.data?.total || 0;

  // Real-time updates via Socket.IO (placeholder)
  const isConnected = false;
  const lastMessage = null;

  // 处理 WebSocket 消息
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;

      if (type === 'device:status') {
        queryClient.setQueryData(deviceKeys.list(params), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((device: Device) =>
              device.id === data.deviceId ? { ...device, status: data.status } : device
            ),
          };
        });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      } else if (type === 'device:created') {
        message.info(`新设备已创建: ${data.name}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      } else if (type === 'device:deleted') {
        message.warning(`设备已删除: ${data.name}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      }
    }
  }, [lastMessage, params]);

  // ✅ 设备操作事件处理
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

  // ✅ 批量操作（使用 hook）
  const { handleBatchStart, handleBatchStop, handleBatchReboot, handleBatchDelete } =
    useDeviceBatchOperations({
      selectedRowKeys,
      onSuccess: () => setSelectedRowKeys([]),
    });

  // ✅ 导出函数（使用 useCallback）
  const handleExportExcel = useCallback(() => {
    exportDevicesAsExcel(devices);
  }, [devices]);

  const handleExportCSV = useCallback(() => {
    exportDevicesAsCSV(devices);
  }, [devices]);

  const handleExportJSON = useCallback(() => {
    exportDevicesAsJSON(devices);
  }, [devices]);

  // ✅ 导出菜单
  const exportMenuItems: MenuProps['items'] = useMemo(
    () => [
      { key: 'excel', label: '导出为 Excel', onClick: handleExportExcel },
      { key: 'csv', label: '导出为 CSV', onClick: handleExportCSV },
      { key: 'json', label: '导出为 JSON', onClick: handleExportJSON },
    ],
    [handleExportExcel, handleExportCSV, handleExportJSON]
  );

  // ✅ 使用提取的表格列定义 hook
  const columns = useDeviceColumns({
    onStart: handleStart,
    onStop: handleStop,
    onReboot: handleReboot,
    onDelete: handleDelete,
    loading: {
      start: startDeviceMutation.isPending,
      stop: stopDeviceMutation.isPending,
      reboot: rebootDeviceMutation.isPending,
      delete: deleteDeviceMutation.isPending,
    },
  });

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
