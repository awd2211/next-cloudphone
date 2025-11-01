import React from 'react';
import { Card, Table, Alert } from 'antd';
import {
  ApiKeyStatsCards,
  ApiKeyToolbar,
  CreateEditApiKeyModal,
  NewKeyDisplayModal,
  ApiKeyDetailModal,
  useApiKeyColumns,
} from '@/components/ApiKey';
import { useApiKeyManagement } from '@/hooks/useApiKeyManagement';

const ApiKeyManagement: React.FC = () => {
  const {
    keys,
    statistics,
    loading,
    isModalVisible,
    isDetailModalVisible,
    isKeyModalVisible,
    editingKey,
    selectedKey,
    newKeyData,
    form,
    filterUserId,
    confirmLoading,
    setFilterUserId,
    loadKeys,
    handleCreate,
    handleEdit,
    handleRevoke,
    handleDelete,
    handleViewDetail,
    handleSubmit,
    handleCancel,
    handleDetailModalClose,
    handleKeyModalClose,
  } = useApiKeyManagement();

  const columns = useApiKeyColumns({
    onViewDetail: handleViewDetail,
    onEdit: handleEdit,
    onRevoke: handleRevoke,
    onDelete: handleDelete,
  });

  return (
    <div style={{ padding: '24px' }}>
      <ApiKeyStatsCards statistics={statistics} />

      <Card
        title="API 密钥管理"
        extra={
          <ApiKeyToolbar
            filterUserId={filterUserId}
            onFilterUserIdChange={setFilterUserId}
            onRefresh={loadKeys}
            onCreate={handleCreate}
          />
        }
      >
        <Alert
          message="安全提示"
          description="API密钥具有完整的账户权限,请妥善保管。创建后仅显示一次完整密钥,请立即复制保存。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={keys}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1800 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <CreateEditApiKeyModal
        visible={isModalVisible}
        editingKey={editingKey}
        form={form}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={confirmLoading}
      />

      <NewKeyDisplayModal
        visible={isKeyModalVisible}
        newKeyData={newKeyData}
        onClose={handleKeyModalClose}
      />

      <ApiKeyDetailModal
        visible={isDetailModalVisible}
        apiKey={selectedKey}
        onClose={handleDetailModalClose}
      />
    </div>
  );
};

export default ApiKeyManagement;
