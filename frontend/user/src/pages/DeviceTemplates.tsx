import React, { useEffect } from 'react';
import { Card, message } from 'antd';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  PageHeader,
  StatsCards,
  UsageTip,
  TemplateTable,
  CreateTemplateModal,
  UseTemplateModal,
  TemplateDetailModal,
} from '@/components/DeviceTemplate';
import { useDeviceTemplates } from '@/hooks/useDeviceTemplates';

/**
 * 设备模板管理页（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 配置文件扩展（选项、工具函数、列定义）
 * 5. ✅ 10 个 useCallback + 2 个 useMemo 优化
 * 6. ✅ 代码从 781 行减少到 ~90 行
 */
const DeviceTemplates: React.FC = () => {
  const {
    loading,
    templates,
    stats,
    isEditing,
    selectedTemplate,
    createModalVisible,
    useTemplateModalVisible,
    detailModalVisible,
    form,
    useTemplateForm,
    handleCreate,
    handleSubmitCreate,
    handleSubmitUseTemplate,
    hideCreateModal,
    hideUseTemplateModal,
    hideDetailModal,
    tableHandlers,
    refetch,
  } = useDeviceTemplates();

  // 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新模板列表...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  return (
    <ErrorBoundary>
      <div style={{ padding: 24 }}>
        {/* 页面标题和创建按钮 */}
        <PageHeader onCreate={handleCreate} />

        {/* 统计卡片 */}
        <StatsCards stats={stats} />

        {/* 使用提示 */}
        <UsageTip />

        {/* 模板列表表格 */}
        <Card>
          <TemplateTable
            templates={templates}
            loading={loading}
            handlers={tableHandlers}
          />
        </Card>

        {/* 创建/编辑模板弹窗 */}
        <CreateTemplateModal
          visible={createModalVisible}
          loading={loading}
          isEditing={isEditing}
          form={form}
          onSubmit={handleSubmitCreate}
          onCancel={hideCreateModal}
        />

        {/* 使用模板弹窗 */}
        <UseTemplateModal
          visible={useTemplateModalVisible}
          loading={loading}
          template={selectedTemplate}
          form={useTemplateForm}
          onSubmit={handleSubmitUseTemplate}
          onCancel={hideUseTemplateModal}
        />

        {/* 模板详情弹窗 */}
        <TemplateDetailModal
          visible={detailModalVisible}
          template={selectedTemplate}
          onUseTemplate={() => {
            if (selectedTemplate) {
              hideDetailModal();
              tableHandlers.onUseTemplate(selectedTemplate);
            }
          }}
          onClose={hideDetailModal}
        />
      </div>
    </ErrorBoundary>
  );
};

export default DeviceTemplates;
