import { Card, Table, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  CreateEditTemplateModal,
  TemplatePreviewModal,
  useTemplateColumns,
} from '@/components/NotificationTemplates';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';

const NotificationTemplatesList = () => {
  const {
    data,
    isLoading,
    isModalVisible,
    previewModalVisible,
    editingTemplate,
    previewTemplate,
    form,
    createMutation,
    updateMutation,
    handleCreate,
    handleEdit,
    handlePreview,
    handleDelete,
    handleToggle,
    handleSubmit,
    handleCancel,
    handlePreviewCancel,
  } = useNotificationTemplates();

  const columns = useTemplateColumns({
    onEdit: handleEdit,
    onPreview: handlePreview,
    onToggle: handleToggle,
    onDelete: handleDelete,
  });

  return (
    <Card
      title="通知模板管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建模板
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={data || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <CreateEditTemplateModal
        visible={isModalVisible}
        editingTemplate={editingTemplate}
        form={form}
        loading={createMutation.isPending || updateMutation.isPending}
        onOk={handleSubmit}
        onCancel={handleCancel}
      />

      <TemplatePreviewModal
        visible={previewModalVisible}
        template={previewTemplate}
        onCancel={handlePreviewCancel}
      />
    </Card>
  );
};

export default NotificationTemplatesList;
