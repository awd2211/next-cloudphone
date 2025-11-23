import { useEffect } from 'react';
import { Card, Button, Space, Tag, Tooltip, message } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  CreateEditTemplateModal,
  TemplatePreviewModal,
  useTemplateColumns,
  type NotificationTemplate as ComponentNotificationTemplate,
} from '@/components/NotificationTemplates';
import { useNotificationTemplates } from '@/hooks/queries';

/**
 * 通知模板列表页面
 *
 * 优化策略:
 * 1. ErrorBoundary - 错误边界保护，组件错误不会导致整个页面崩溃
 * 2. LoadingState - 统一加载状态管理，骨架屏、错误提示、空状态、重试按钮
 * 3. 快捷键支持 - Ctrl+R 刷新, Ctrl+N 新建
 * 4. 页面标题优化 - 显示快捷键提示
 */
const NotificationTemplatesList = () => {
  // 一次性获取所有模板（pageSize=500 足够覆盖所有通知类型）
  // 前端分页提供更好的用户体验（无需等待网络请求）
  const {
    data,
    total,
    isLoading,
    error,
    refetch,
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

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N 新建模板
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreate();
      }
      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreate, refetch]);

  // ===== 渲染 =====
  return (
    <ErrorBoundary boundaryName="NotificationTemplatesListPage">
      <div>
        {/* 页面标题和快捷键提示 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>通知模板管理</h2>
          <Space>
            <Tooltip title="快捷键: Ctrl+N 新建, Ctrl+R 刷新">
              <Tag color="blue" style={{ cursor: 'help' }}>
                <SearchOutlined /> Ctrl+N 新建 | Ctrl+R 刷新
              </Tag>
            </Tooltip>
            <Tooltip title="刷新列表">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  refetch();
                  message.info('正在刷新...');
                }}
              />
            </Tooltip>
          </Space>
        </div>

        <LoadingState
          loading={isLoading}
          error={error}
          empty={(data || []).length === 0 && !isLoading}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          errorDescription="加载通知模板列表失败，请检查网络连接后重试"
          emptyDescription="暂无通知模板数据，点击右上角「新建模板」按钮添加新模板"
        >
          <Card
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
          </Card>
        </LoadingState>

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
      </div>
    </ErrorBoundary>
  );
};

export default NotificationTemplatesList;
