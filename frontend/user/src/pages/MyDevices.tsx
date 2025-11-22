import { useState, useMemo, useCallback } from 'react';
import { Card, Table, Button } from 'antd';
import type { TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import type { Device, PaginationParams } from '@/types';
import { getListData } from '@/types';
import { CreateDeviceDialog } from '@/components/CreateDeviceDialog';
import {
  DeviceStatusTag,
  DeviceStatsCards,
  DeviceActions,
  DeviceConfigCell,
  BatchOperationToolbar,
  BatchOperationModal,
  BatchInstallAppModal,
} from '@/components/Device';
import { useMyDevices, useDeviceStats, useStartDevice, useStopDevice, useRebootDevice } from '@/hooks/queries';
import { useBatchDeviceOperation } from '@/hooks/useBatchDeviceOperation';
import dayjs from 'dayjs';

const MyDevices = () => {
  const navigate = useNavigate();

  // 本地状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [queryParams, setQueryParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // React Query hooks
  const { data: devicesData, isLoading: loading, refetch: refetchDevices } = useMyDevices(queryParams);
  const { data: stats, refetch: refetchStats } = useDeviceStats();
  const startDevice = useStartDevice();
  const stopDevice = useStopDevice();
  const rebootDevice = useRebootDevice();

  // useMyDevices 返回 PaginatedResponse<Device>: { items/data: Device[], total, page, pageSize }
  const devices: Device[] = getListData(devicesData);
  const total = devicesData?.total ?? 0;

  // 设备操作处理函数
  const handleStart = useCallback(
    async (id: string) => {
      await startDevice.mutateAsync(id);
    },
    [startDevice]
  );

  const handleStop = useCallback(
    async (id: string) => {
      await stopDevice.mutateAsync(id);
    },
    [stopDevice]
  );

  const handleReboot = useCallback(
    async (id: string) => {
      await rebootDevice.mutateAsync(id);
    },
    [rebootDevice]
  );

  const handleCreateSuccess = useCallback(
    (_device: Device) => {
      refetchDevices();
      refetchStats();
    },
    [refetchDevices, refetchStats]
  );

  // 处理表格变化（分页、排序）
  const handleTableChange = useCallback(
    (
      pagination: TablePaginationConfig,
      _filters: Record<string, any>,
      sorter: SorterResult<Device> | SorterResult<Device>[]
    ) => {
      const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      const sortField = singleSorter?.field as string | undefined;
      const sortOrder = singleSorter?.order;

      setQueryParams((prev) => ({
        ...prev,
        page: pagination.current || 1,
        pageSize: pagination.pageSize || 10,
        sortBy: sortField,
        sortOrder: sortOrder === 'ascend' ? 'asc' : sortOrder === 'descend' ? 'desc' : undefined,
      }));
    },
    []
  );

  const handleRefresh = useCallback(() => {
    refetchDevices();
    refetchStats();
  }, [refetchDevices, refetchStats]);

  // 将操作函数包装成 actions 对象（保持与原组件兼容）
  const actions = useMemo(
    () => ({
      handleStart,
      handleStop,
      handleReboot,
      handleCreateSuccess,
      handleRefresh,
    }),
    [handleStart, handleStop, handleReboot, handleCreateSuccess, handleRefresh]
  );

  // 分页配置
  const pagination = useMemo(
    () => ({
      current: queryParams.page,
      pageSize: queryParams.pageSize,
      total,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total: number) => `共 ${total} 条`,
    }),
    [queryParams.page, queryParams.pageSize, total]
  );

  // 批量操作相关
  const {
    modalVisible,
    modalTitle,
    operationType,
    results,
    installAppModalVisible,
    handleBatchStart,
    handleBatchStop,
    handleBatchRestart,
    handleBatchDelete,
    handleBatchInstallApp,
    openInstallAppModal,
    closeInstallAppModal,
    closeModal,
  } = useBatchDeviceOperation();

  const handleView = useCallback(
    (id: string) => {
      navigate(`/devices/${id}`);
    },
    [navigate]
  );

  const handleCloseDialog = useCallback(() => {
    setCreateDialogOpen(false);
  }, []);

  const handleOpenDialog = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  // 获取选中设备的名称映射
  const getSelectedDeviceNames = useCallback(() => {
    const nameMap: Record<string, string> = {};
    selectedRowKeys.forEach((key) => {
      const device = devices.find((d: Device) => d.id === key);
      if (device) {
        nameMap[key as string] = device.name;
      }
    });
    return nameMap;
  }, [selectedRowKeys, devices]);

  // 批量操作处理函数
  const onBatchStart = useCallback(() => {
    const deviceIds = selectedRowKeys.map((key) => key as string);
    const deviceNames = getSelectedDeviceNames();
    handleBatchStart(deviceIds, deviceNames);
  }, [selectedRowKeys, getSelectedDeviceNames, handleBatchStart]);

  const onBatchStop = useCallback(() => {
    const deviceIds = selectedRowKeys.map((key) => key as string);
    const deviceNames = getSelectedDeviceNames();
    handleBatchStop(deviceIds, deviceNames);
  }, [selectedRowKeys, getSelectedDeviceNames, handleBatchStop]);

  const onBatchRestart = useCallback(() => {
    const deviceIds = selectedRowKeys.map((key) => key as string);
    const deviceNames = getSelectedDeviceNames();
    handleBatchRestart(deviceIds, deviceNames);
  }, [selectedRowKeys, getSelectedDeviceNames, handleBatchRestart]);

  const onBatchDelete = useCallback(() => {
    const deviceIds = selectedRowKeys.map((key) => key as string);
    const deviceNames = getSelectedDeviceNames();
    handleBatchDelete(deviceIds, deviceNames, () => {
      // 删除成功后刷新列表并清除选择
      actions.handleRefresh();
      setSelectedRowKeys([]);
    });
  }, [selectedRowKeys, getSelectedDeviceNames, handleBatchDelete, actions]);

  const onBatchInstallApp = useCallback(
    (appId: string) => {
      const deviceIds = selectedRowKeys.map((key) => key as string);
      const deviceNames = getSelectedDeviceNames();
      handleBatchInstallApp(appId, deviceIds, deviceNames);
    },
    [selectedRowKeys, getSelectedDeviceNames, handleBatchInstallApp]
  );

  const onClearSelection = useCallback(() => {
    setSelectedRowKeys([]);
  }, []);

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (_record: Device) => ({
      disabled: false, // 所有设备都可以选择
    }),
  };

  const columns: ColumnsType<Device> = useMemo(
    () => [
      {
        title: '设备名称',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        sorter: true,
        render: (status: string) => <DeviceStatusTag status={status} />,
      },
      {
        title: 'Android 版本',
        dataIndex: 'androidVersion',
        key: 'androidVersion',
        sorter: true,
      },
      {
        title: '配置',
        key: 'config',
        render: (_, record) => (
          <DeviceConfigCell cpuCores={record.cpuCores} memoryMB={record.memoryMB} />
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        sorter: true,
        defaultSortOrder: 'descend',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'action',
        width: 240,
        fixed: 'right',
        render: (_, record) => (
          <DeviceActions
            device={record}
            onView={handleView}
            onStart={actions.handleStart}
            onStop={actions.handleStop}
            onReboot={actions.handleReboot}
          />
        ),
      },
    ],
    [handleView, actions]
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>我的设备</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenDialog}>
          创建云手机
        </Button>
      </div>

      {/* api 包装器已自动解包，stats 直接是统计对象 */}
      <DeviceStatsCards stats={stats ?? null} />

      {/* 批量操作工具栏 */}
      {selectedRowKeys.length > 0 && (
        <BatchOperationToolbar
          selectedCount={selectedRowKeys.length}
          onBatchStart={onBatchStart}
          onBatchStop={onBatchStop}
          onBatchRestart={onBatchRestart}
          onBatchDelete={onBatchDelete}
          onBatchInstallApp={openInstallAppModal}
          onClearSelection={onClearSelection}
        />
      )}

      <Card>
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={pagination}
          rowSelection={rowSelection}
        />
      </Card>

      <CreateDeviceDialog
        open={createDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={actions.handleCreateSuccess}
      />

      {/* 批量操作进度模态框 */}
      <BatchOperationModal
        open={modalVisible}
        title={modalTitle}
        operationType={operationType}
        results={results}
        onClose={closeModal}
      />

      {/* 批量安装应用模态框 */}
      <BatchInstallAppModal
        open={installAppModalVisible}
        deviceCount={selectedRowKeys.length}
        onConfirm={onBatchInstallApp}
        onCancel={closeInstallAppModal}
      />
    </div>
  );
};

export default MyDevices;
