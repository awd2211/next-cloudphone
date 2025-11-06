import React from 'react';
import { Card, Table, Button, Space, Typography, Empty } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import {
  ExportStatsCards,
  ExportToolbar,
  ExportCreateModal,
} from '@/components/DataExport';
import { useExportCenter } from '@/hooks/useExportCenter';

const { Title, Paragraph } = Typography;

/**
 * 数据导出中心页面
 * 管理导出任务，支持多种数据类型和格式
 */
const ExportCenter: React.FC = () => {
  const {
    form,
    loading,
    tasks,
    stats,
    total,
    query,
    selectedRowKeys,
    createModalVisible,
    columns,
    setSelectedRowKeys,
    handleRefresh,
    handleCreateExport,
    handleBatchDelete,
    handleClearCompleted,
    handleClearFailed,
    handleStatusChange,
    handleDataTypeChange,
    handlePageChange,
    handleOpenCreateModal,
    handleCloseCreateModal,
  } = useExportCenter();

  return (
    <div>
      {/* 页头 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                <ExportOutlined /> 数据导出中心
              </Title>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                导出您的数据，支持多种格式
              </Paragraph>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<ExportOutlined />}
              onClick={handleOpenCreateModal}
            >
              创建导出任务
            </Button>
          </div>
        </Space>
      </Card>

      {/* 统计卡片 */}
      <ExportStatsCards stats={stats} />

      {/* 工具栏 */}
      <ExportToolbar
        selectedCount={selectedRowKeys.length}
        onRefresh={handleRefresh}
        onBatchDelete={handleBatchDelete}
        onClearCompleted={handleClearCompleted}
        onClearFailed={handleClearFailed}
        onStatusChange={handleStatusChange}
        onDataTypeChange={handleDataTypeChange}
      />

      {/* 任务列表 */}
      <Card>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys as string[]),
          }}
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个任务`,
            onChange: handlePageChange,
          }}
          locale={{
            emptyText: <Empty description="暂无导出任务" />,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建导出 Modal */}
      <ExportCreateModal
        visible={createModalVisible}
        form={form}
        onOk={handleCreateExport}
        onCancel={handleCloseCreateModal}
      />
    </div>
  );
};

export default ExportCenter;
