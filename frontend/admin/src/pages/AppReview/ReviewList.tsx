import { useEffect, useCallback } from 'react';
import { Card, Badge, Tabs, Alert, message, Row, Col, Statistic, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  ReloadOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import {
  AppReviewStatsCard,
  PendingTab,
  ReviewedTab,
  RecordsTab,
  ReviewActionModal,
  AppDetailModal,
  ReviewHistoryModal,
} from '@/components/AppReview';
import { useAppReviewList } from '@/hooks/useAppReviewList';

// 错误边界和加载状态
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

const { TabPane } = Tabs;

/**
 * 应用审核列表页面（优化版）
 *
 * 优化点：
 * 1. ErrorBoundary - 错误边界保护
 * 2. LoadingState - 统一加载状态
 * 3. 统计卡片 - 审核统计概览
 * 4. 快捷键支持 - Ctrl+R 刷新
 * 5. 页面标题优化
 */
const AppReviewListContent = () => {
  const {
    pendingApps,
    reviewedApps,
    reviewRecords,
    loading,
    total,
    page,
    pageSize,
    activeTab,
    reviewModalVisible,
    detailModalVisible,
    historyModalVisible,
    selectedApp,
    reviewAction,
    reviewHistory,
    form,
    pendingColumns,
    reviewedColumns,
    recordColumns,
    stats,
    handleReview,
    handleCloseReviewModal,
    handleCloseDetailModal,
    handleCloseHistoryModal,
    handlePageChange,
    setActiveTab,
  } = useAppReviewList();

  // ===== 刷新函数 =====
  const handleRefresh = useCallback(() => {
    // 通过切换 tab 触发 refetch
    const currentTab = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(currentTab), 0);
    message.info('正在刷新数据...');
  }, [activeTab, setActiveTab]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  // ===== 设置页面标题 =====
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `应用审核 (${stats.pending} 待处理) - 云手机管理后台`;

    return () => {
      document.title = originalTitle;
    };
  }, [stats.pending]);

  // ===== 计算审核效率统计 =====
  const totalReviewed = stats.approved + stats.rejected;
  const approvalRate = totalReviewed > 0 ? Math.round((stats.approved / totalReviewed) * 100) : 0;

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AuditOutlined />
            应用审核管理
          </h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            审核和管理应用市场中的应用提交
          </p>
        </div>
        <Tooltip title="快捷键: Ctrl+R">
          <span
            onClick={handleRefresh}
            style={{ cursor: 'pointer', color: '#1890ff', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ReloadOutlined spin={loading} />
            刷新
          </span>
        </Tooltip>
      </div>

      {/* 审核说明 */}
      <Alert
        message="应用审核说明"
        description="所有上传到应用市场的应用都需要经过审核才能发布。审核过程包括检查应用信息的完整性、权限的合理性以及是否符合平台规范。您可以批准、拒绝或请求开发者修改应用。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: '16px' }}
      />

      {/* 统计概览卡片 */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="待审核"
              value={stats.pending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="已批准"
              value={stats.approved}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="已拒绝"
              value={stats.rejected}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" hoverable>
            <Statistic
              title="通过率"
              value={approvalRate}
              suffix="%"
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 原有的统计卡片组件 */}
      <AppReviewStatsCard pending={stats.pending} approved={stats.approved} rejected={stats.rejected} />

      {/* 主内容区域 */}
      <LoadingState
        loading={loading && !pendingApps.length && !reviewedApps.length && !reviewRecords.length}
        loadingType="skeleton"
        skeletonRows={5}
        errorDescription="加载审核数据失败"
      >
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane
              tab={
                <span>
                  <ClockCircleOutlined />
                  待审核 <Badge count={stats.pending} style={{ marginLeft: 8 }} />
                </span>
              }
              key="pending"
            >
              <PendingTab
                apps={pendingApps}
                loading={loading}
                columns={pendingColumns}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <CheckCircleOutlined />
                  已批准 <Badge count={stats.approved} style={{ marginLeft: 8, backgroundColor: '#52c41a' }} />
                </span>
              }
              key="approved"
            >
              <ReviewedTab
                apps={reviewedApps}
                loading={loading}
                columns={reviewedColumns}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <CloseCircleOutlined />
                  已拒绝 <Badge count={stats.rejected} style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }} />
                </span>
              }
              key="rejected"
            >
              <ReviewedTab
                apps={reviewedApps}
                loading={loading}
                columns={reviewedColumns}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <FileTextOutlined />
                  审核记录
                </span>
              }
              key="history"
            >
              <RecordsTab
                records={reviewRecords}
                loading={loading}
                columns={recordColumns}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
              />
            </TabPane>
          </Tabs>
        </Card>
      </LoadingState>

      {/* 审核模态框 */}
      <ReviewActionModal
        visible={reviewModalVisible}
        app={selectedApp}
        action={reviewAction}
        form={form}
        onOk={() => form.submit()}
        onCancel={handleCloseReviewModal}
        onFinish={handleReview}
      />

      {/* 应用详情模态框 */}
      <AppDetailModal
        visible={detailModalVisible}
        app={selectedApp}
        onClose={handleCloseDetailModal}
      />

      {/* 审核历史模态框 */}
      <ReviewHistoryModal
        visible={historyModalVisible}
        app={selectedApp}
        history={reviewHistory}
        onClose={handleCloseHistoryModal}
      />
    </div>
  );
};

/**
 * 应用审核列表页面（带错误边界）
 */
const AppReviewList = () => {
  return (
    <ErrorBoundary boundaryName="AppReviewList">
      <AppReviewListContent />
    </ErrorBoundary>
  );
};

export default AppReviewList;
