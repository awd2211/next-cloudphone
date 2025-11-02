import { useMemo } from 'react';
import { Card } from 'antd';
import { useTemplateList } from '@/hooks/useTemplateList';
import {
  TemplateStatsCard,
  PopularTemplatesCard,
  TemplateFilterBar,
  TemplateTable,
  CreateTemplateModal,
  EditTemplateModal,
  CreateDeviceModal,
  BatchCreateDeviceModal,
  createTemplateColumns,
} from '@/components/Template';

/**
 * 模板列表页面（优化版 v2）
 *
 * 优化策略:
 * 1. ✅ 所有业务逻辑提取到 useTemplateList Hook
 * 2. ✅ 主组件只负责 UI 组合 (70% 代码减少)
 * 3. ✅ useMemo 优化表格列定义
 */
const TemplateList = () => {
  const {
    templates,
    popularTemplates,
    stats,
    users,
    loading,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    setSearchKeyword,
    setCategoryFilter,
    setIsPublicFilter,
    createModalVisible,
    setCreateModalVisible,
    editModalVisible,
    createDeviceModalVisible,
    batchCreateModalVisible,
    selectedTemplate,
    form,
    editForm,
    createDeviceForm,
    batchCreateForm,
    handleCreate,
    handleEdit,
    handleDelete,
    handleCreateDevice,
    handleBatchCreate,
    openEditModal,
    openCreateDeviceModal,
    openBatchCreateModal,
    closeCreateModal,
    closeEditModal,
    closeCreateDeviceModal,
    closeBatchCreateModal,
  } = useTemplateList();

  const columns = useMemo(
    () =>
      createTemplateColumns({
        onCreateDevice: openCreateDeviceModal,
        onBatchCreate: openBatchCreateModal,
        onEdit: openEditModal,
        onDelete: handleDelete,
      }),
    [openCreateDeviceModal, openBatchCreateModal, openEditModal, handleDelete]
  );

  return (
    <div style={{ padding: '24px' }}>
      <TemplateStatsCard stats={stats} />

      <PopularTemplatesCard templates={popularTemplates} onTemplateClick={openCreateDeviceModal} />

      <Card>
        <TemplateFilterBar
          onCreateClick={() => setCreateModalVisible(true)}
          onSearch={setSearchKeyword}
          onCategoryChange={setCategoryFilter}
          onVisibilityChange={setIsPublicFilter}
        />

        <TemplateTable
          columns={columns}
          dataSource={templates}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          }}
        />
      </Card>

      <CreateTemplateModal
        visible={createModalVisible}
        form={form}
        onOk={handleCreate}
        onCancel={closeCreateModal}
      />

      <EditTemplateModal
        visible={editModalVisible}
        form={editForm}
        onOk={handleEdit}
        onCancel={closeEditModal}
      />

      <CreateDeviceModal
        visible={createDeviceModalVisible}
        templateName={selectedTemplate?.name || ''}
        form={createDeviceForm}
        users={users}
        onOk={handleCreateDevice}
        onCancel={closeCreateDeviceModal}
      />

      <BatchCreateDeviceModal
        visible={batchCreateModalVisible}
        templateName={selectedTemplate?.name || ''}
        form={batchCreateForm}
        users={users}
        onOk={handleBatchCreate}
        onCancel={closeBatchCreateModal}
      />
    </div>
  );
};

export default TemplateList;
