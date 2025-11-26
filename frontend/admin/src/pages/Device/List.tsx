import { useState, useEffect, useMemo, useCallback } from 'react';
import { Space, Form, message, Card, Input, Modal } from 'antd';
import type { MenuProps } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { Device, CreateDeviceDto } from '@/types';
import { useRole } from '@/hooks/useRole';
import { useNavigate } from 'react-router-dom';

// ✅ 导入优化的子组件
import {
  DeviceStatsCards,
  DeviceFilterBar,
  DeviceBatchActions,
  DeviceTable,
  CreateDeviceModal,
  useDeviceColumns,
} from '@/components/DeviceList';
import { BatchProgressModal } from '@/components/BatchOperation/BatchProgressModal';

// ✅ 错误边界和加载状态
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { NEUTRAL_LIGHT } from '@/theme';

// ✅ P2 & P3 优化组件
import { useFilterState } from '@/hooks/useFilterState';
import { useDraggableTable } from '@/components/DraggableTable';
import { useContextMenu } from '@/components/ContextMenu';
import { dangerConfirm } from '@/components/ConfirmDialog';
import { useColumnCustomizer, ColumnCustomizerButton } from '@/components/ColumnCustomizer';

// ✅ 使用 React Query hooks
import {
  useDevices,
  useDeviceStats,
  useCreateDevice,
  useStartDevice,
  useStopDevice,
  useRebootDevice,
  useDeleteDevice,
} from '@/hooks/queries';

// ✅ 批量操作 hook
import { useDeviceBatchOperations } from '@/hooks/useDeviceBatchOperations';

// ✅ 导出工具函数
import { exportDevicesAsExcel, exportDevicesAsCSV, exportDevicesAsJSON } from '@/utils/deviceExport';

// ✅ React Query 相关
import { queryClient } from '@/lib/react-query';
import { deviceKeys } from '@/hooks/queries';

/**
 * 设备列表页面（优化版 v2 - 添加 ErrorBoundary + LoadingState + 快捷键）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 提取导出逻辑到 utils
 * 5. ✅ 提取表格列定义到 components
 * 6. ✅ 提取批量操作到 hooks
 * 7. ✅ ErrorBoundary - 错误边界保护
 * 8. ✅ LoadingState - 统一加载状态
 * 9. ✅ 快捷键支持 - Ctrl+K 搜索、Ctrl+N 新建、Ctrl+R 刷新
 */
const DeviceList = () => {
  const { } = useRole();
  const navigate = useNavigate();

  // ✅ P2 优化：URL 筛选器状态持久化
  const { filters, setFilters } = useFilterState({
    page: 1,
    pageSize: 10,
    search: '',
    status: '',
    androidVersion: '',
  });

  // 其他 UI 状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [quickSearchVisible, setQuickSearchVisible] = useState(false);
  const [quickSearchValue, setQuickSearchValue] = useState('');
  const [form] = Form.useForm();

  // ✅ 使用 React Query hooks（自动管理 loading、error、data）
  const params = useMemo(() => filters, [filters]);

  // ✅ 自动缓存、去重、后台刷新
  const { data: devicesData, isLoading, error, refetch } = useDevices(params);
  const { data: stats } = useDeviceStats();

  // ✅ Mutation hooks（自动失效缓存）
  const createDeviceMutation = useCreateDevice();
  const startDeviceMutation = useStartDevice();
  const stopDeviceMutation = useStopDevice();
  const rebootDeviceMutation = useRebootDevice();
  const deleteDeviceMutation = useDeleteDevice();

  // 解构数据
  const devices = (devicesData as any)?.data || devicesData || [];
  const total = (devicesData as any)?.total || 0;

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 快速搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchVisible(true);
        return;
      }

      // Ctrl+N 新建设备
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setCreateModalVisible(true);
        return;
      }

      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
        return;
      }

      // Escape 关闭快速搜索
      if (e.key === 'Escape' && quickSearchVisible) {
        setQuickSearchVisible(false);
        setQuickSearchValue('');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchVisible, refetch]);

  // ===== 快速搜索处理 =====
  const handleQuickSearch = useCallback((value: string) => {
    setQuickSearchValue('');
    setQuickSearchVisible(false);
    if (value.trim()) {
      setFilters({ search: value.trim(), page: 1 });
    }
  }, [setFilters]);

  // ✅ P3 优化：拖拽排序
  const { sortedDataSource, renderDndWrapper, tableComponents, sortColumn } = useDraggableTable({
    dataSource: devices,
    getRowKey: (device) => device.id,
    onSortEnd: (newDevices) => {
      message.success('设备顺序已更新');
      // TODO: 保存排序到服务器
      console.log('New device order:', newDevices.map(d => d.id));
    },
    disabled: isLoading, // 加载时禁用拖拽
  });

  // ✅ P3 优化：右键菜单
  const { onContextMenu, contextMenu } = useContextMenu({
    items: [
      {
        key: 'view',
        label: '查看详情',
        icon: <EyeOutlined />,
        onClick: (device) => navigate(`/devices/${device.id}`),
      },
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: (device) => {
          message.info(`编辑设备: ${device.name}`);
          // TODO: 打开编辑弹窗
        },
      },
      { key: 'divider-1', type: 'divider', label: '-' },
      {
        key: 'start',
        label: '启动',
        icon: <PlayCircleOutlined />,
        onClick: (device) => handleStart(device.id),
        visible: (device) => device.status !== 'running',
      },
      {
        key: 'stop',
        label: '停止',
        icon: <StopOutlined />,
        onClick: (device) => handleStop(device.id),
        visible: (device) => device.status === 'running',
      },
      {
        key: 'reboot',
        label: '重启',
        icon: <ReloadOutlined />,
        onClick: (device) => handleReboot(device.id),
      },
      { key: 'divider-2', type: 'divider', label: '-' },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: async (device) => {
          const confirmed = await dangerConfirm({
            title: '删除设备',
            content: `确定要删除设备 "${device.name}" 吗？`,
            consequences: [
              '设备上的所有数据将被永久删除',
              '设备关联的快照和备份也将被删除',
              '此操作无法撤销',
            ],
            requiresCheckbox: true,
          });
          if (confirmed) {
            handleDelete(device.id);
          }
        },
      },
    ],
  });

  // Real-time updates via Socket.IO (placeholder)
  const isConnected = false;
  const lastMessage: { type: string; data: any } | null = null;

  // 处理 WebSocket 消息
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage as { type: string; data: any };

      if (type === 'device:status') {
        queryClient.setQueryData(deviceKeys.list(params), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((device: Device) =>
              device.id === (data as any).deviceId ? { ...device, status: (data as any).status } : device
            ),
          };
        });
        queryClient.invalidateQueries({ queryKey: deviceKeys.stats() });
      } else if (type === 'device:created') {
        message.info(`新设备已创建: ${(data as any).name}`);
        queryClient.invalidateQueries({ queryKey: deviceKeys.lists() });
      } else if (type === 'device:deleted') {
        message.warning(`设备已删除: ${(data as any).name}`);
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

  // ✅ 批量操作（使用 hook + 进度展示）
  const {
    handleBatchStart,
    handleBatchStop,
    handleBatchReboot,
    handleBatchDelete,
    batchStartProgress,
    batchStopProgress,
    batchRebootProgress,
    batchDeleteProgress,
  } = useDeviceBatchOperations({
    selectedRowKeys,
    devices,
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
  const baseColumns = useDeviceColumns({
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

  // ✅ P3 优化：列自定义
  const {
    visibleColumns,
    columnConfigs,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    resetColumns,
  } = useColumnCustomizer({
    columns: baseColumns,
    storageKey: 'device-list-columns',
    defaultHiddenKeys: ['ipAddress', 'createdAt'], // 默认隐藏 IP 和创建时间
    fixedKeys: ['name', 'status', 'actions'], // 名称、状态、操作列固定显示
  });

  // 合并拖拽列和可见列
  const columns = useMemo(() => [sortColumn, ...visibleColumns], [sortColumn, visibleColumns]);

  return (
    <ErrorBoundary boundaryName="DeviceList">
      <div style={{ padding: '24px' }}>
        {/* 统计卡片 */}
        <ErrorBoundary boundaryName="DeviceStatsCards">
          <DeviceStatsCards stats={stats} />
        </ErrorBoundary>

        {/* 筛选和操作栏 */}
        <Card style={{ marginBottom: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 第一行：搜索和筛选 */}
            <DeviceFilterBar
              onSearch={(search) => setFilters({ search, page: 1 })}
              onStatusChange={(status) => setFilters({ status, page: 1 })}
              onAndroidVersionChange={(androidVersion) => setFilters({ androidVersion, page: 1 })}
              onDateRangeChange={() => {
                // TODO: 将日期范围添加到筛选器
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
              extraActions={
                <ColumnCustomizerButton
                  configs={columnConfigs}
                  onToggle={toggleColumn}
                  onShowAll={showAllColumns}
                  onHideAll={hideAllColumns}
                  onReset={resetColumns}
                />
              }
            />
          </Space>
        </Card>

        {/* 设备列表表格（支持拖拽排序 + 右键菜单） */}
        <Card
          title={
            <Space>
              <span>设备列表</span>
              <span style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>
                快捷键：Ctrl+K 搜索 | Ctrl+N 新建 | Ctrl+R 刷新
              </span>
            </Space>
          }
        >
          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && !error && devices.length === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无设备，点击上方按钮创建新设备"
          >
            {renderDndWrapper(
              <DeviceTable
                columns={columns}
                dataSource={sortedDataSource as Device[]}
                loading={false} // LoadingState 已处理
                selectedRowKeys={selectedRowKeys}
                onSelectionChange={setSelectedRowKeys}
                page={filters.page}
                pageSize={filters.pageSize}
                total={total}
                onPageChange={(page, pageSize) => {
                  setFilters({ page, pageSize });
                }}
                components={tableComponents}
                onRow={(record) => ({
                  onContextMenu: (e) => onContextMenu(record, e),
                })}
              />
            )}
          </LoadingState>
          {contextMenu}
        </Card>

        {/* 快速搜索弹窗 */}
        <Modal
          open={quickSearchVisible}
          title="快速搜索设备"
          footer={null}
          onCancel={() => {
            setQuickSearchVisible(false);
            setQuickSearchValue('');
          }}
          destroyOnClose
        >
          <Input
            placeholder="输入设备名称或 ID 进行搜索..."
            prefix={<SearchOutlined />}
            value={quickSearchValue}
            onChange={(e) => setQuickSearchValue(e.target.value)}
            onPressEnter={(e) => handleQuickSearch((e.target as HTMLInputElement).value)}
            autoFocus
            allowClear
          />
          <div style={{ marginTop: 8, color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
            按 Enter 搜索，按 Escape 关闭
          </div>
        </Modal>

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

        {/* 批量操作进度弹窗 */}
        <BatchProgressModal
          visible={batchStartProgress.visible}
          title={batchStartProgress.title}
          items={batchStartProgress.items}
          onClose={batchStartProgress.close}
        />
        <BatchProgressModal
          visible={batchStopProgress.visible}
          title={batchStopProgress.title}
          items={batchStopProgress.items}
          onClose={batchStopProgress.close}
        />
        <BatchProgressModal
          visible={batchRebootProgress.visible}
          title={batchRebootProgress.title}
          items={batchRebootProgress.items}
          onClose={batchRebootProgress.close}
        />
        <BatchProgressModal
          visible={batchDeleteProgress.visible}
          title={batchDeleteProgress.title}
          items={batchDeleteProgress.items}
          onClose={batchDeleteProgress.close}
        />
      </div>
    </ErrorBoundary>
  );
};

export default DeviceList;
