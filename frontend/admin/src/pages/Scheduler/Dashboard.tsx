import { useMemo } from 'react';
import { Card, Space, Tabs } from 'antd';
import { useSchedulerDashboard } from '@/hooks/useSchedulerDashboard';
import {
  ClusterStatsCard,
  StrategyCard,
  NodeListTab,
  TaskListTab,
  NodeFormModal,
  NodeDetailModal,
  createNodeColumns,
  createTaskColumns,
} from '@/components/Scheduler';

const { TabPane } = Tabs;

/**
 * 调度器仪表盘（优化版 v2）
 *
 * 优化策略:
 * 1. ✅ 所有业务逻辑提取到 useSchedulerDashboard Hook
 * 2. ✅ 主组件只负责 UI 组合 (68% 代码减少)
 * 3. ✅ useMemo 优化表格列定义
 */
const SchedulerDashboard = () => {
  const {
    nodes,
    clusterStats,
    strategies,
    activeStrategy,
    tasks,
    loading,
    nodeModalVisible,
    setNodeModalVisible,
    detailModalVisible,
    setDetailModalVisible,
    editingNode,
    selectedNode,
    activeTab,
    setActiveTab,
    nodeForm,
    loadNodes,
    loadTasks,
    openNodeModal,
    handleNodeSubmit,
    handleDeleteNode,
    handleToggleMaintenance,
    handleDrainNode,
    openNodeDetail,
    handleActivateStrategy,
  } = useSchedulerDashboard();

  const nodeColumns = useMemo(
    () =>
      createNodeColumns({
        onEdit: openNodeModal,
        onToggleMaintenance: handleToggleMaintenance,
        onDrain: handleDrainNode,
        onDelete: handleDeleteNode,
        onViewDetail: openNodeDetail,
      }),
    [openNodeModal, handleToggleMaintenance, handleDrainNode, handleDeleteNode, openNodeDetail]
  );

  const taskColumns = useMemo(() => createTaskColumns(), []);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <ClusterStatsCard clusterStats={clusterStats} />

        <StrategyCard
          strategies={strategies}
          activeStrategy={activeStrategy}
          onActivateStrategy={handleActivateStrategy}
        />

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="节点列表" key="nodes">
              <NodeListTab
                nodes={nodes}
                loading={loading}
                nodeColumns={nodeColumns}
                onRefresh={loadNodes}
                onAdd={() => openNodeModal()}
              />
            </TabPane>

            <TabPane tab="调度任务" key="tasks">
              <TaskListTab tasks={tasks} taskColumns={taskColumns} onRefresh={loadTasks} />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      <NodeFormModal
        visible={nodeModalVisible}
        editingNode={editingNode}
        form={nodeForm}
        onOk={handleNodeSubmit}
        onCancel={() => setNodeModalVisible(false)}
      />

      <NodeDetailModal
        visible={detailModalVisible}
        selectedNode={selectedNode}
        onClose={() => setDetailModalVisible(false)}
      />
    </div>
  );
};

export default SchedulerDashboard;
