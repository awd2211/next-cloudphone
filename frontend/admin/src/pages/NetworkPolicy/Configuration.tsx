import React, { useCallback } from 'react';
import { Card, Table, Button, Space } from 'antd';
import { PlusOutlined, ExperimentOutlined } from '@ant-design/icons';
import {
  PolicyFormModal,
  TestConnectivityModal,
  useNetworkPolicyColumns,
  TABLE_PAGE_SIZE,
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
              网络策略配置 ({policies.length} 条规则)
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

        <Table
          columns={columns}
          dataSource={policies}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: TABLE_PAGE_SIZE }}
          scroll={{ x: 1400 }}
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
