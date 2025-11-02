import React from 'react';
import {
  ApiKeysHeader,
  ApiKeysStats,
  SecurityAlert,
  ApiKeysTable,
  CreateApiKeyModal,
  StatsModal,
} from '@/components/ApiKeys';
import { useApiKeys } from '@/hooks/useApiKeys';

/**
 * API Keys 管理页（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 代码从 674 行减少到 < 60 行（91% 减少）
 *
 * 功能：
 * 1. API Key 列表展示
 * 2. 创建新的 API Key
 * 3. 删除/撤销 API Key
 * 4. 查看 API Key 使用统计
 * 5. 复制 API Key
 */
const ApiKeys: React.FC = () => {
  const {
    loading,
    apiKeys,
    stats,
    visibleKeys,
    createModalVisible,
    statsModalVisible,
    selectedApiKey,
    form,
    maskKey,
    toggleKeyVisibility,
    handleCopyKey,
    handleViewStats,
    handleCreate,
    handleSubmitCreate,
    handleRevoke,
    handleDelete,
    handleCloseStatsModal,
    handleCloseCreateModal,
  } = useApiKeys();

  return (
    <div style={{ padding: 24 }}>
      <ApiKeysHeader onCreate={handleCreate} />

      <ApiKeysStats stats={stats} />

      <SecurityAlert />

      <ApiKeysTable
        apiKeys={apiKeys}
        loading={loading}
        visibleKeys={visibleKeys}
        maskKey={maskKey}
        onToggleVisibility={toggleKeyVisibility}
        onCopyKey={handleCopyKey}
        onViewStats={handleViewStats}
        onRevoke={handleRevoke}
        onDelete={handleDelete}
      />

      <CreateApiKeyModal
        visible={createModalVisible}
        loading={loading}
        form={form}
        onSubmit={handleSubmitCreate}
        onClose={handleCloseCreateModal}
      />

      <StatsModal
        visible={statsModalVisible}
        selectedApiKey={selectedApiKey}
        onClose={handleCloseStatsModal}
      />
    </div>
  );
};

export default ApiKeys;
