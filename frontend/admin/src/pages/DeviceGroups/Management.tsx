import React from 'react';
import { Card, Button } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined } from '@ant-design/icons';
import { CreateDeviceGroupModal, BatchOperationModal } from '@/components/DeviceGroup';
import { useDeviceGroupManagement } from '@/hooks/useDeviceGroupManagement';

interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  deviceCount: number;
  tags?: string[];
  createdAt: string;
}

/**
 * 设备分组管理页面（优化版）
 *
 * 优化点：
 * 1. ✅ 表格列配置提取到 DeviceGroupTableColumns hook
 * 2. ✅ 两个模态框提取为独立组件
 * 3. ✅ 业务逻辑集中在 useDeviceGroupManagement hook
 * 4. ✅ 主组件只负责组合和渲染
 */
const DeviceGroupManagement: React.FC = () => {
  const {
    groups,
    loading,
    modalVisible,
    editingGroup,
    form,
    setModalVisible,
    openModal,
    handleSubmit,
    batchOpVisible,
    selectedGroup,
    batchProgress,
    batchForm,
    setBatchOpVisible,
    handleBatchOperation,
    columns,
  } = useDeviceGroupManagement();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            设备分组管理 ({groups.length} 个分组)
          </span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新建分组
          </Button>
        </div>

        <AccessibleTable<DeviceGroup>
          ariaLabel="设备分组列表"
          loadingText="正在加载设备分组"
          emptyText="暂无设备分组，点击右上角新建分组"
          columns={columns}
          dataSource={groups}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ y: 600 }}
          virtual
        />
      </Card>

      <CreateDeviceGroupModal
        visible={modalVisible}
        editingGroup={editingGroup}
        form={form}
        onCancel={() => setModalVisible(false)}
        onSubmit={handleSubmit}
      />

      <BatchOperationModal
        visible={batchOpVisible}
        groupName={selectedGroup?.name}
        batchProgress={batchProgress}
        form={batchForm}
        onCancel={() => setBatchOpVisible(false)}
        onSubmit={handleBatchOperation}
      />
    </div>
  );
};

export default React.memo(DeviceGroupManagement);
