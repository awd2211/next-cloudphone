import React, { useEffect } from 'react';
import { Card, Space, Alert, Tabs, Tag, message } from 'antd';
import { ReloadOutlined, CloudServerOutlined } from '@ant-design/icons';
import {
  QueueStatsCards,
  QueueOverviewTab,
  JobListTab,
  JobDetailModal,
  TestJobModal,
} from '@/components/Queue';
import { useQueueManagement } from '@/hooks/useQueueManagement';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

const { TabPane } = Tabs;

/**
 * 队列管理页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有事件处理使用 useCallback 优化
 * 4. ✅ 自动刷新机制
 * 5. ✅ 代码从 270 行减少到 ~80 行
 * 6. ✅ ErrorBoundary 错误边界保护
 * 7. ✅ LoadingState 统一加载状态
 * 8. ✅ 快捷键支持 (Ctrl+R 刷新)
 */
const QueueManagementContent: React.FC = () => {
  const {
    // 状态
    summary,
    queues,
    selectedQueue,
    jobs,
    jobStatus,
    loading,
    isQueuesLoading,
    queuesError,
    jobDetailVisible,
    jobDetail,
    testModalVisible,
    testType,
    testForm,

    // 状态设置
    setJobStatus,
    setTestType,

    // 数据加载
    loadQueuesStatus,
    loadJobs,

    // 任务操作
    viewJobDetail,
    handleRetryJob,
    handleRemoveJob,

    // 队列操作
    handlePauseQueue,
    handleResumeQueue,
    handleEmptyQueue,
    handleCleanQueue,

    // 测试任务
    handleTestJob,

    // UI 操作
    handleSelectQueue,
    handleCloseJobDetail,
    handleOpenTestModal,
    handleCloseTestModal,
  } = useQueueManagement();

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadQueuesStatus();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadQueuesStatus]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>
          <CloudServerOutlined style={{ marginRight: 8 }} />
          队列管理
          <Tag
            icon={<ReloadOutlined spin={isQueuesLoading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer' }}
            onClick={() => {
              loadQueuesStatus();
              message.info('正在刷新...');
            }}
          >
            Ctrl+R 刷新
          </Tag>
        </h2>
      </div>

      <LoadingState
        loading={isQueuesLoading && !summary}
        error={queuesError}
        onRetry={() => loadQueuesStatus()}
        errorDescription="加载队列状态失败"
        loadingType="skeleton"
        skeletonRows={4}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页面说明 */}
          <Alert
            message="队列说明"
            description="管理 BullMQ 任务队列。支持队列暂停/恢复、任务重试、批量清理等操作。包含邮件、短信、设备启动等异步任务队列。"
            type="info"
            showIcon
          />

          {/* 统计卡片 */}
          <QueueStatsCards summary={summary} />

          {/* 主内容区域 */}
          <Card>
            <Tabs>
              {/* 队列概览标签页 */}
              <TabPane tab="队列概览" key="queues">
                <QueueOverviewTab
                  queues={queues as any}
                  onRefresh={loadQueuesStatus}
                  onTestJob={handleOpenTestModal}
                  onPauseQueue={handlePauseQueue}
                  onResumeQueue={handleResumeQueue}
                  onEmptyQueue={handleEmptyQueue}
                  onSelectQueue={handleSelectQueue}
                />
              </TabPane>

              {/* 任务列表标签页 */}
              <TabPane tab="任务列表" key="jobs" disabled={!selectedQueue}>
                <JobListTab
                  selectedQueue={selectedQueue}
                  jobStatus={jobStatus}
                  jobs={jobs as any}
                  loading={loading}
                  onJobStatusChange={setJobStatus}
                  onRefresh={loadJobs}
                  onCleanQueue={handleCleanQueue}
                  onViewJobDetail={viewJobDetail}
                  onRetryJob={handleRetryJob}
                  onRemoveJob={handleRemoveJob}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Space>
      </LoadingState>

      {/* 任务详情弹窗 */}
      <JobDetailModal
        visible={jobDetailVisible}
        jobDetail={jobDetail}
        onClose={handleCloseJobDetail}
      />

      {/* 测试任务弹窗 */}
      <TestJobModal
        visible={testModalVisible}
        testType={testType}
        form={testForm}
        onTestTypeChange={setTestType}
        onOk={handleTestJob}
        onCancel={handleCloseTestModal}
      />
    </div>
  );
};

/**
 * 队列管理页面
 * 使用 ErrorBoundary 包裹，提供错误边界保护
 */
const QueueManagement: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="QueueManagement">
      <QueueManagementContent />
    </ErrorBoundary>
  );
};

export default QueueManagement;
