import { Card, Space, Tabs } from 'antd';
import {
  StatisticsRow,
  QuickTemplatesCard,
  RuleFilterBar,
  RuleFormModal,
  HistoryDetailModal,
  RuleTableCard,
  HistoryTableCard,
} from '@/components/DeviceLifecycle';
import { useLifecycleDashboard } from '@/hooks/useLifecycleDashboard';

const { TabPane } = Tabs;

/**
 * 设备生命周期管理仪表板
 * 用于管理生命周期规则及查看执行历史
 */
const LifecycleDashboard = () => {
  const {
    rules,
    history,
    stats,
    templates,
    loading,
    historyLoading,
    total,
    historyTotal,
    page,
    pageSize,
    historyPage,
    historyPageSize,
    modalVisible,
    historyDetailVisible,
    editingRule,
    selectedHistory,
    activeTab,
    filterType,
    filterEnabled,
    form,
    configForm,
    openModal,
    handleSubmit,
    handleDelete,
    handleToggle,
    handleExecute,
    handleTest,
    handleCreateFromTemplate,
    viewHistoryDetail,
    handlePageChange,
    handleHistoryPageChange,
    setModalVisible,
    setHistoryDetailVisible,
    setActiveTab,
    setFilterType,
    setFilterEnabled,
  } = useLifecycleDashboard();

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <StatisticsRow stats={stats} />

        {/* 快速模板 */}
        <QuickTemplatesCard templates={templates} onCreateFromTemplate={handleCreateFromTemplate} />

        {/* 主内容 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="规则管理" key="rules">
              <RuleFilterBar
                filterType={filterType}
                filterEnabled={filterEnabled}
                onFilterTypeChange={setFilterType}
                onFilterEnabledChange={setFilterEnabled}
                onCreateRule={() => openModal()}
              />

              <RuleTableCard
                rules={rules}
                loading={loading}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
                onToggle={handleToggle}
                onExecute={handleExecute}
                onTest={handleTest}
                onEdit={openModal}
                onDelete={handleDelete}
              />
            </TabPane>

            <TabPane tab="执行历史" key="history">
              <HistoryTableCard
                history={history}
                loading={historyLoading}
                page={historyPage}
                pageSize={historyPageSize}
                total={historyTotal}
                onPageChange={handleHistoryPageChange}
                onViewDetail={viewHistoryDetail}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 创建/编辑模态框 */}
      <RuleFormModal
        visible={modalVisible}
        editingRule={editingRule}
        form={form}
        configForm={configForm}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      />

      {/* 历史详情模态框 */}
      <HistoryDetailModal
        visible={historyDetailVisible}
        selectedHistory={selectedHistory}
        onClose={() => setHistoryDetailVisible(false)}
      />
    </div>
  );
};

export default LifecycleDashboard;
