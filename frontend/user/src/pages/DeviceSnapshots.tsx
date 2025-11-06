import React from 'react';
import { Space, Button, Typography, Card } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CameraOutlined } from '@ant-design/icons';
import {
  DeviceInfo,
  StatsCards,
  SnapshotTable,
  CreateSnapshotModal,
  RestoreSnapshotModal,
  UsageGuide,
} from '@/components/DeviceSnapshot';
import { useDeviceSnapshots } from '@/hooks/useDeviceSnapshots';

const { Title, Paragraph } = Typography;

/**
 * 设备快照管理页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 表格列定义提取到配置文件
 * 5. ✅ 工具函数提取到配置文件
 * 6. ✅ 警告信息配置化
 * 7. ✅ 代码从 379 行减少到 ~105 行
 */
const DeviceSnapshots: React.FC = () => {
  const {
    device,
    snapshots,
    loading,
    createModalVisible,
    restoreModalVisible,
    selectedSnapshot,
    form,
    handleRestoreSnapshot,
    handleDeleteSnapshot,
    openCreateModal,
    closeCreateModal,
    openRestoreModal,
    closeRestoreModal,
    goBackToDeviceDetail,
  } = useDeviceSnapshots();

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
      <DeviceInfo device={device} />

      {/* 统计卡片 */}
      <StatsCards snapshots={snapshots} />

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
          snapshots={snapshots}
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
        onSubmit={() => form.submit()}
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
