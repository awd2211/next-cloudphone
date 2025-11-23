import React, { useEffect } from 'react';
import { Space, Alert, Tag, message } from 'antd';
import { ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import {
  CacheStatsCards,
  CacheOperationToolbar,
  CacheInfoCard,
  DeleteKeyModal,
  DeletePatternModal,
  CheckKeyModal,
} from '@/components/CacheManagement';
import { useCacheManagement } from '@/hooks/useCacheManagement';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

const CacheManagementContent: React.FC = () => {
  const {
    stats,
    loading,
    isStatsLoading,
    statsError,
    deleteKeyModalVisible,
    deletePatternModalVisible,
    checkKeyModalVisible,
    checkResult,
    deleteForm,
    patternForm,
    checkForm,
    loadStats,
    handleResetStats,
    handleFlushCache,
    handleDeleteKey,
    handleDeletePattern,
    handleCheckKey,
    showDeleteKeyModal,
    hideDeleteKeyModal,
    showDeletePatternModal,
    hideDeletePatternModal,
    showCheckKeyModal,
    hideCheckKeyModal,
  } = useCacheManagement();

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadStats();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadStats]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>
          <DatabaseOutlined style={{ marginRight: 8 }} />
          缓存管理
          <Tag
            icon={<ReloadOutlined spin={isStatsLoading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer' }}
            onClick={() => {
              loadStats();
              message.info('正在刷新...');
            }}
          >
            Ctrl+R 刷新
          </Tag>
        </h2>
      </div>

      <LoadingState
        loading={isStatsLoading && !stats}
        error={statsError}
        onRetry={() => loadStats()}
        errorDescription="加载缓存统计失败"
        loadingType="skeleton"
        skeletonRows={4}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="缓存说明"
            description="管理系统的两层缓存（L1: NodeCache 内存, L2: Redis）。可以查看统计信息、清空缓存、删除指定键等。"
            type="info"
            showIcon
          />

          <CacheStatsCards stats={stats} />

          <CacheOperationToolbar
            loading={loading}
            onRefresh={loadStats}
            onResetStats={handleResetStats}
            onDeleteKey={showDeleteKeyModal}
            onDeletePattern={showDeletePatternModal}
            onCheckKey={showCheckKeyModal}
            onFlushCache={handleFlushCache}
          />

          <CacheInfoCard />
        </Space>
      </LoadingState>

      <DeleteKeyModal
        visible={deleteKeyModalVisible}
        form={deleteForm}
        onOk={handleDeleteKey}
        onCancel={hideDeleteKeyModal}
      />

      <DeletePatternModal
        visible={deletePatternModalVisible}
        form={patternForm}
        onOk={handleDeletePattern}
        onCancel={hideDeletePatternModal}
      />

      <CheckKeyModal
        visible={checkKeyModalVisible}
        form={checkForm}
        checkResult={checkResult}
        onOk={handleCheckKey}
        onCancel={hideCheckKeyModal}
      />
    </div>
  );
};

const CacheManagement: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="CacheManagement">
      <CacheManagementContent />
    </ErrorBoundary>
  );
};

export default CacheManagement;
