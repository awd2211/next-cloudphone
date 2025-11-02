import { Card, Badge, Tabs, Alert } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons';
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

const { TabPane } = Tabs;

const AppReviewList = () => {
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

  return (
    <div style={{ padding: '24px' }}>
      <Alert
        message="应用审核说明"
        description="所有上传到应用市场的应用都需要经过审核才能发布。审核过程包括检查应用信息的完整性、权限的合理性以及是否符合平台规范。您可以批准、拒绝或请求开发者修改应用。"
        type="info"
        showIcon
        closable
        style={{ marginBottom: '16px' }}
      />

      <AppReviewStatsCard pending={stats.pending} approved={stats.approved} rejected={stats.rejected} />

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
                已批准
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
                已拒绝
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

export default AppReviewList;
