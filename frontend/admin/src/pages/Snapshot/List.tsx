import { useState, useMemo, useCallback } from 'react';
import { Space, Button, Select, Card, Alert, Form } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined } from '@ant-design/icons';
import type { DeviceSnapshot } from '@/types';
import {
  useSnapshots,
  useSnapshotStats,
  useCreateSnapshot,
  useRestoreSnapshot,
  useCompressSnapshot,
  useDeleteSnapshot,
} from '@/hooks/useSnapshots';
import { useDevices } from '@/hooks/useDevices';
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
  const devices = devicesData?.data?.data || [];

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
    async (id: string, deviceName: string) => {
      await restoreMutation.mutateAsync({ id, deviceName });
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
      devices.map((device) => ({
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
            {STATUS_FILTER_OPTIONS.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Space>

        <AccessibleTable<DeviceSnapshot>
          ariaLabel="设备快照列表"
          loadingText="正在加载设备快照列表"
          emptyText="暂无设备快照数据，点击上方创建快照"
          columns={columns}
          dataSource={snapshots}
          rowKey="id"
          loading={isLoading}
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

export default SnapshotList;
