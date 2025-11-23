import { useState, useMemo, useCallback, useEffect } from 'react';
import { Space, Button, Select, Card, Alert, Form, Tooltip } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { DeviceSnapshot } from '@/types';
import {
  useSnapshots,
  useSnapshotStats,
  useCreateSnapshot,
  useRestoreSnapshot,
  useCompressSnapshot,
  useDeleteSnapshot,
} from '@/hooks/queries';
import { useDevices } from '@/hooks/queries';
import {
  SnapshotStatsCards,
  CreateSnapshotModal,
  useSnapshotColumns,
  STATUS_FILTER_OPTIONS,
} from '@/components/Snapshot';

const { Option } = Select;

/**
 * 快照列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 组件拆分 - 提取 SnapshotStatsCards, CreateSnapshotModal
 * 5. ✅ 提取表格列定义到 hook
 * 6. ✅ 提取常量和工具函数
 * 7. ✅ ErrorBoundary 错误边界
 * 8. ✅ LoadingState 统一加载状态
 * 9. ✅ 快捷键支持 (Ctrl+R 刷新)
 * 10. ✅ 页面标题优化
 */
const SnapshotListContent = () => {
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

  const { data, isLoading, error, refetch } = useSnapshots(params);
  const { data: stats } = useSnapshotStats();
  const { data: devicesData } = useDevices({ page: 1, pageSize: 1000 });

  // ✅ 刷新回调
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ✅ 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  // ✅ 设置页面标题
  useEffect(() => {
    document.title = '设备快照 - 云手机管理平台';
    return () => {
      document.title = '云手机管理平台';
    };
  }, []);

  // Mutations
  const createMutation = useCreateSnapshot();
  const restoreMutation = useRestoreSnapshot();
  const compressMutation = useCompressSnapshot();
  const deleteMutation = useDeleteSnapshot();

  const snapshots = data?.data || [];
  const total = data?.total || 0;
  const devices = devicesData?.data || [];

  // ✅ useCallback 优化事件处理函数
  const handleCreate = useCallback(
    async (values: any) => {
      await createMutation.mutateAsync(values);
      setCreateModalVisible(false);
      form.resetFields();
    },
    [createMutation, form],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      await restoreMutation.mutateAsync(id);
    },
    [restoreMutation],
  );

  const handleCompress = useCallback(
    async (id: string) => {
      await compressMutation.mutateAsync(id);
    },
    [compressMutation],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  const handleCreateModalOpen = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  const handleCreateModalClose = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  // ✅ useMemo 优化设备选项
  const deviceOptions = useMemo(
    () =>
      devices.map((device: any) => ({
        label: device.name || device.id,
        value: device.id,
      })),
    [devices],
  );

  // ✅ 使用提取的表格列定义 hook
  const columns = useSnapshotColumns({
    onRestore: handleRestore,
    onCompress: handleCompress,
    onDelete: handleDelete,
  });

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

      {/* 统计卡片 */}
      <SnapshotStatsCards
        totalSnapshots={stats?.totalSnapshots || 0}
        totalSize={stats?.totalSize || 0}
        avgSize={stats?.avgSize || 0}
      />

      <Card>
        <Space style={{ marginBottom: '16px' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateModalOpen}>
            创建快照
          </Button>
          <Tooltip title="刷新数据 (Ctrl+R)">
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
              刷新
            </Button>
          </Tooltip>
          <Select
            placeholder="筛选设备"
            allowClear
            style={{ width: 200 }}
            onChange={(value) => setDeviceFilter(value)}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            options={deviceOptions}
          />
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setStatusFilter(value)}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Space>

        {/* ✅ 使用 LoadingState 统一加载状态 */}
        <LoadingState
          loading={isLoading}
          error={error}
          empty={!isLoading && snapshots.length === 0}
          emptyDescription="暂无设备快照数据，点击上方创建快照"
          errorDescription="加载快照列表失败"
          onRetry={handleRefresh}
          loadingType="skeleton"
          skeletonRows={5}
        >
          <AccessibleTable<DeviceSnapshot>
            ariaLabel="设备快照列表"
            loadingText="正在加载设备快照列表"
            emptyText="暂无设备快照数据，点击上方创建快照"
            columns={columns}
            dataSource={snapshots}
            rowKey="id"
            loading={false}
            scroll={{ x: 1400, y: 600 }}
            virtual
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
              pageSizeOptions: ['10', '20', '50', '100', '200'],
            }}
          />
        </LoadingState>
      </Card>

      {/* 创建快照模态框 */}
      <CreateSnapshotModal
        visible={createModalVisible}
        loading={createMutation.isPending}
        devices={devices}
        form={form}
        onOk={() => form.submit()}
        onCancel={handleCreateModalClose}
        onFinish={handleCreate}
      />
    </div>
  );
};

/**
 * 快照列表页面（带错误边界）
 */
const SnapshotList = () => {
  return (
    <ErrorBoundary>
      <SnapshotListContent />
    </ErrorBoundary>
  );
};

export default SnapshotList;
