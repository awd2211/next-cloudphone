import React from 'react';
import { Space, Alert } from 'antd';
import {
  CacheStatsCards,
  CacheOperationToolbar,
  CacheInfoCard,
  DeleteKeyModal,
  DeletePatternModal,
  CheckKeyModal,
} from '@/components/CacheManagement';
import { useCacheManagement } from '@/hooks/useCacheManagement';

const CacheManagement: React.FC = () => {
  const {
    stats,
    loading,
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

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="缓存管理"
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

export default CacheManagement;
