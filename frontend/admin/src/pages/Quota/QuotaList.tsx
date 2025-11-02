import React, { useMemo } from 'react';
import { Card, Table, Button, Space, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  QuotaAlertPanel,
  QuotaStatisticsRow,
  CreateQuotaModal,
  EditQuotaModal,
  QuotaDetailDrawer,
} from '@/components/Quota';
import { useQuotaList } from '@/hooks/useQuotaList';
import { useQuotaDetail } from '@/hooks/useQuotaDetail';
import { createQuotaColumns } from './columns';

const QuotaList: React.FC = () => {
  // 配额列表管理
  const {
    quotas,
    loading,
    alerts,
    createModalVisible,
    editModalVisible,
    form,
    editForm,
    loadQuotas,
    handleCreateQuota,
    handleUpdateQuota,
    handleEdit,
    setCreateModalVisible,
    setEditModalVisible,
  } = useQuotaList();

  // 配额详情查看
  const {
    detailDrawerVisible,
    selectedQuota,
    statistics,
    handleViewDetail,
    handleCloseDetail,
  } = useQuotaDetail();

  // 表格列配置
  const columns = useMemo(
    () => createQuotaColumns(handleEdit, handleViewDetail),
    [handleEdit, handleViewDetail]
  );

  return (
    <div>
      {/* 配额告警面板 */}
      <QuotaAlertPanel alerts={alerts} />

      {/* 统计卡片 */}
      <QuotaStatisticsRow quotas={quotas} alerts={alerts} />

      {/* 配额列表 */}
      <Card
        title="配额管理"
        extra={
          <Space>
            <Tooltip title="刷新">
              <Button icon={<ReloadOutlined />} onClick={loadQuotas} />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建配额
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={quotas}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
          }}
        />
      </Card>

      {/* 创建配额模态框 */}
      <CreateQuotaModal
        visible={createModalVisible}
        form={form}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onFinish={handleCreateQuota}
      />

      {/* 编辑配额模态框 */}
      <EditQuotaModal
        visible={editModalVisible}
        form={editForm}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onFinish={handleUpdateQuota}
      />

      {/* 配额详情抽屉 */}
      <QuotaDetailDrawer
        visible={detailDrawerVisible}
        quota={selectedQuota}
        statistics={statistics}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default React.memo(QuotaList);
