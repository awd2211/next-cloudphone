import React, { useCallback } from 'react';
import { Card, Button, Space } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined, ExperimentOutlined } from '@ant-design/icons';
import {
  PolicyFormModal,
  TestConnectivityModal,
  useNetworkPolicyColumns,
  TABLE_PAGE_SIZE,
  type NetworkPolicy,
} from '@/components/NetworkPolicy';
import { useNetworkPolicies } from '@/hooks/useNetworkPolicies';

const NetworkPolicyConfiguration: React.FC = () => {
  const {
    policies,
    loading,
    modalVisible,
    testModalVisible,
    editingPolicy,
    form,
    testForm,
    openModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleToggle,
    openTestModal,
    closeTestModal,
    handleTest,
  } = useNetworkPolicies();

  // 表格列定义
  const columns = useNetworkPolicyColumns({
    onEdit: useCallback((policy) => openModal(policy), [openModal]),
    onDelete: handleDelete,
    onToggle: handleToggle,
  });

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
              网络策略配置 ({policies?.length || 0} 条规则)
            </span>
          </Space>
          <Space>
            <Button icon={<ExperimentOutlined />} onClick={openTestModal}>
              连通性测试
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新建策略
            </Button>
          </Space>
        </div>

        <AccessibleTable<NetworkPolicy>
          ariaLabel="网络策略列表"
          loadingText="正在加载网络策略"
          emptyText="暂无网络策略，点击右上角新建策略"
          columns={columns}
          dataSource={policies}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: TABLE_PAGE_SIZE,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400, y: 600 }}
          virtual
        />
      </Card>

      <PolicyFormModal
        visible={modalVisible}
        editingPolicy={editingPolicy}
        form={form}
        onCancel={closeModal}
        onOk={handleSubmit}
      />

      <TestConnectivityModal
        visible={testModalVisible}
        form={testForm}
        onCancel={closeTestModal}
        onOk={handleTest}
      />
    </div>
  );
};

export default NetworkPolicyConfiguration;
