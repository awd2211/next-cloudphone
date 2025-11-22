import { Card, Button } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined } from '@ant-design/icons';
import {
  CreateEditTemplateModal,
  TemplatePreviewModal,
  useTemplateColumns,
  type NotificationTemplate as ComponentNotificationTemplate,
} from '@/components/NotificationTemplates';
import { useNotificationTemplates } from '@/hooks/queries';

const NotificationTemplatesList = () => {
  // 一次性获取所有模板（pageSize=500 足够覆盖所有通知类型）
  // 前端分页提供更好的用户体验（无需等待网络请求）
  const {
    data,
    total,
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
  } = useNotificationTemplates({ pageSize: 500 });

  const columns = useTemplateColumns({
    onEdit: handleEdit as unknown as (record: ComponentNotificationTemplate) => void,
    onPreview: handlePreview as unknown as (record: ComponentNotificationTemplate) => void,
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
      <AccessibleTable<ComponentNotificationTemplate>
        ariaLabel="通知模板列表"
        loadingText="正在加载通知模板"
        emptyText="暂无通知模板数据，点击右上角新建模板"
        columns={columns}
        dataSource={(data || []) as unknown as readonly ComponentNotificationTemplate[]}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1900, y: 600 }}
        virtual
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (dataTotal) => `共 ${dataTotal} 条模板`,
          pageSizeOptions: ['10', '20', '50', '100', '200'],
          defaultPageSize: 20,
        }}
      />

      <CreateEditTemplateModal
        visible={isModalVisible}
        editingTemplate={editingTemplate as unknown as ComponentNotificationTemplate | null}
        form={form}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onOk={handleSubmit}
        onCancel={handleCancel}
      />

      <TemplatePreviewModal
        visible={previewModalVisible}
        template={previewTemplate as unknown as ComponentNotificationTemplate | null}
        onClose={handlePreviewCancel}
      />
    </Card>
  );
};

export default NotificationTemplatesList;
