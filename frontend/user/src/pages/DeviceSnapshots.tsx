import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Space, Button, Typography, Card, Form } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CameraOutlined } from '@ant-design/icons';
import {
  DeviceInfo,
  StatsCards,
  SnapshotTable,
  CreateSnapshotModal,
  RestoreSnapshotModal,
  UsageGuide,
} from '@/components/DeviceSnapshot';
import {
  useDevice,
  useDeviceSnapshots,
  useCreateSnapshot,
  useRestoreSnapshot,
  useDeleteSnapshot,
} from '@/hooks/queries';
import type { Snapshot } from '@/utils/snapshotConfig';

const { Title, Paragraph } = Typography;

/**
 * 设备快照管理页面
 *
 * 功能：
 * 1. 查看设备的所有快照
 * 2. 创建新快照
 * 3. 恢复到指定快照
 * 4. 删除快照
 * 5. 快照统计信息
 */
const DeviceSnapshots: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // 本地状态
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  // React Query hooks
  const { data: device } = useDevice(id!);
  const { data: snapshots, isLoading: loading } = useDeviceSnapshots(id!);

  const createSnapshot = useCreateSnapshot();
  const restoreSnapshot = useRestoreSnapshot();
  const deleteSnapshot = useDeleteSnapshot();

  // 创建快照
  const handleCreateSnapshot = useCallback(async () => {
    const values = await form.validateFields();
    await createSnapshot.mutateAsync({
      deviceId: id!,
      ...values,
    });
    setCreateModalVisible(false);
    form.resetFields();
  }, [id, form, createSnapshot]);

  // 恢复快照
  const handleRestoreSnapshot = useCallback(async () => {
    if (!selectedSnapshot) return;
    await restoreSnapshot.mutateAsync({
      snapshotId: selectedSnapshot.id,
      deviceId: id,
    });
    setRestoreModalVisible(false);
    setSelectedSnapshot(null);
  }, [id, selectedSnapshot, restoreSnapshot]);

  // 删除快照
  const handleDeleteSnapshot = useCallback(async (snapshotId: string) => {
    await deleteSnapshot.mutateAsync({
      snapshotId,
      deviceId: id,
    });
  }, [id, deleteSnapshot]);

  // Modal 控制
  const openCreateModal = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false);
    form.resetFields();
  }, [form]);

  const openRestoreModal = useCallback((snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setRestoreModalVisible(true);
  }, []);

  const closeRestoreModal = useCallback(() => {
    setRestoreModalVisible(false);
    setSelectedSnapshot(null);
  }, []);

  // 返回设备详情
  const goBackToDeviceDetail = useCallback(() => {
    navigate(`/devices/${id}`);
  }, [id, navigate]);

  return (
    <div>
      {/* 返回按钮 */}
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={goBackToDeviceDetail}>
          返回设备详情
        </Button>
      </Space>

      {/* 页面标题 */}
      <Title level={2}>
        <CameraOutlined /> 设备快照管理
      </Title>
      <Paragraph type="secondary">快照可以保存设备的完整状态，包括系统、应用和数据</Paragraph>

      {/* 设备信息 */}
      <DeviceInfo device={device ?? null} />

      {/* 统计卡片 */}
      <StatsCards snapshots={snapshots?.data || []} />

      {/* 快照列表 */}
      <Card
        title="快照列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            disabled={device?.status !== 'running' && device?.status !== 'stopped'}
          >
            创建快照
          </Button>
        }
      >
        <SnapshotTable
          snapshots={snapshots?.data || []}
          loading={loading}
          onRestore={openRestoreModal}
          onDelete={handleDeleteSnapshot}
        />
      </Card>

      {/* 创建快照 Modal */}
      <CreateSnapshotModal
        visible={createModalVisible}
        form={form}
        onCancel={closeCreateModal}
        onSubmit={handleCreateSnapshot}
      />

      {/* 恢复快照 Modal */}
      <RestoreSnapshotModal
        visible={restoreModalVisible}
        snapshot={selectedSnapshot}
        onCancel={closeRestoreModal}
        onConfirm={handleRestoreSnapshot}
      />

      {/* 使用说明 */}
      <UsageGuide />
    </div>
  );
};

export default DeviceSnapshots;
