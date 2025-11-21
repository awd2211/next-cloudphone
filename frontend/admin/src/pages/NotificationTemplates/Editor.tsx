import { Card } from 'antd';
import {
  TemplateFilterBar,
  TemplateTable,
  TemplateFormModal,
  TemplatePreviewModal,
  TemplateTestModal,
  TemplateVersionDrawer,
} from '@/components/NotificationTemplate';
import { useNotificationTemplateEditor } from '@/hooks/useNotificationTemplateEditor';

const NotificationTemplateEditor = () => {
  const {
    templates,
    loading,
    total,
    page,
    pageSize,
    modalVisible,
    previewVisible,
    testVisible,
    versionDrawerVisible,
    editingTemplate,
    selectedTemplate,
    versions,
    availableVariables,
    previewContent,
    filterType,
    filterActive,
    form,
    testForm,
    previewForm,
    columns,
    openModal,
    handleSubmit,
    handleTest,
    handlePreview,
    handleRevert,
    loadVariables,
    handlePageChange,
    setModalVisible,
    setPreviewVisible,
    setTestVisible,
    setVersionDrawerVisible,
    setFilterType,
    setFilterActive,
  } = useNotificationTemplateEditor();

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <TemplateFilterBar
          filterType={filterType}
          filterActive={filterActive}
          onTypeChange={setFilterType}
          onActiveChange={setFilterActive}
          onCreate={() => openModal()}
        />

        <TemplateTable
          columns={columns}
          templates={templates}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
        />
      </Card>

      <TemplateFormModal
        visible={modalVisible}
        editingTemplate={editingTemplate}
        form={form}
        availableVariables={availableVariables}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        onTypeChange={(_type: string) => {
          loadVariables();
        }}
      />

      <TemplatePreviewModal
        visible={previewVisible}
        template={selectedTemplate}
        previewContent={previewContent}
        form={previewForm}
        onCancel={() => setPreviewVisible(false)}
        onPreview={handlePreview}
      />

      <TemplateTestModal
        visible={testVisible}
        template={selectedTemplate}
        form={testForm}
        onOk={handleTest}
        onCancel={() => setTestVisible(false)}
      />

      <TemplateVersionDrawer
        visible={versionDrawerVisible}
        template={selectedTemplate}
        versions={versions}
        onClose={() => setVersionDrawerVisible(false)}
        onRevert={handleRevert}
      />
    </div>
  );
};

export default NotificationTemplateEditor;
