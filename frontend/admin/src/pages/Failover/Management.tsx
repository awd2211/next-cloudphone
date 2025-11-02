import React from 'react';
import { Card, Table, Alert } from 'antd';
import {
  FailoverFilterBar,
  useFailoverTableColumns,
  TriggerFailoverModal,
  FailoverDetailDrawer,
} from '@/components/Failover';
import { useFailoverManagement } from '@/hooks/useFailoverManagement';

const FailoverManagement: React.FC = () => {
  const {
    data,
    isLoading,
    searchParams,
    setSearchParams,
    detailDrawerVisible,
    selectedRecord,
    triggerModalVisible,
    selectedDeviceId,
    setSelectedDeviceId,
    triggerLoading,
    handleSearch,
    handleRefresh,
    handleOpenTriggerModal,
    handleTrigger,
    handleCancelTrigger,
    handleViewDetail,
    handleCloseDetail,
    handlePageChange,
  } = useFailoverManagement();

  const columns = useFailoverTableColumns({
    onViewDetail: handleViewDetail,
  });

  return (
    <div>
      <Alert
        message="故障转移说明"
        description="故障转移功能用于在设备或节点出现故障时，将设备迁移到健康的节点上，确保服务的高可用性。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <FailoverFilterBar
        deviceId={searchParams.deviceId}
        status={searchParams.status}
        onDeviceIdChange={(value) =>
          setSearchParams({ ...searchParams, deviceId: value })
        }
        onStatusChange={(value) =>
          setSearchParams({ ...searchParams, status: value })
        }
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onTrigger={handleOpenTriggerModal}
      />

      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
          }}
        />
      </Card>

      <TriggerFailoverModal
        visible={triggerModalVisible}
        loading={triggerLoading}
        deviceId={selectedDeviceId}
        onDeviceIdChange={setSelectedDeviceId}
        onOk={handleTrigger}
        onCancel={handleCancelTrigger}
      />

      <FailoverDetailDrawer
        visible={detailDrawerVisible}
        record={selectedRecord}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default FailoverManagement;
