import React from 'react';
import { Card, Alert } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  StateOverviewCard,
  StateRecoveryFilterBar,
  RecoveryModal,
  useStateRecoveryColumns,
  type StateRecoveryRecord,
} from '@/components/StateRecovery';
import { useStateRecovery } from '@/hooks/useStateRecovery';

const StateRecoveryManagement: React.FC = () => {
  const {
    searchParams,
    setSearchParams,
    data,
    isLoading,
    deviceStates,
    recoveryModalVisible,
    selectedDeviceId,
    targetState,
    setSelectedDeviceId,
    setTargetState,
    validateLoading,
    recoveryLoading,
    handleSearch,
    handleRefresh,
    handleValidate,
    handleRecoveryClick,
    handleRecoveryOk,
    handleRecoveryCancel,
    handlePageChange,
  } = useStateRecovery();

  const columns = useStateRecoveryColumns();

  return (
    <div>
      <Alert
        message="状态恢复说明"
        description="状态恢复功能用于检测和修复设备状态不一致的问题，确保系统状态的准确性和一致性。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <StateRecoveryFilterBar
        deviceId={searchParams.deviceId}
        status={searchParams.status}
        validateLoading={validateLoading}
        onDeviceIdChange={(value) =>
          setSearchParams({ ...searchParams, deviceId: value })
        }
        onStatusChange={(value) =>
          setSearchParams({ ...searchParams, status: value })
        }
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onValidate={handleValidate}
        onRecovery={handleRecoveryClick}
      />

      <StateOverviewCard deviceStates={deviceStates} />

      <Card>
        <AccessibleTable<StateRecoveryRecord>
          ariaLabel="状态恢复记录列表"
          loadingText="正在加载状态恢复记录"
          emptyText="暂无状态恢复记录"
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1300, y: 600 }}
          virtual
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
          }}
        />
      </Card>

      <RecoveryModal
        visible={recoveryModalVisible}
        loading={recoveryLoading}
        deviceId={selectedDeviceId}
        targetState={targetState}
        onDeviceIdChange={setSelectedDeviceId}
        onTargetStateChange={setTargetState}
        onOk={handleRecoveryOk}
        onCancel={handleRecoveryCancel}
      />
    </div>
  );
};

export default StateRecoveryManagement;
