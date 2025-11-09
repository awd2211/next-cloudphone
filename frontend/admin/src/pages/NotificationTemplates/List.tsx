import { Card, Button } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined } from '@ant-design/icons';
import {
  CreateEditTemplateModal,
  TemplatePreviewModal,
  useTemplateColumns,
  type NotificationTemplate,
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
      <AccessibleTable<NotificationTemplate>
        ariaLabel="通知模板列表"
        loadingText="正在加载通知模板"
        emptyText="暂无通知模板数据，点击右上角新建模板"
        columns={columns}
        dataSource={data || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1400, y: 600 }}
        virtual
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100', '200'],
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
