import { Space, Card, Tabs } from 'antd';
import {
  GPUStatsCards,
  GPUDevicesTable,
  GPUAllocationsTable,
  AllocateGPUModal,
  GPUDetailModal,
} from '@/components/GPU';
import { useGPUDashboard } from '@/hooks/useGPUDashboard';

const { TabPane } = Tabs;

/**
 * GPU 管理面板（优化版）
 *
 * 优化点：
 * 1. ✅ 组件拆分 - 提取 GPUStatsCards, GPUDevicesTable 等
 * 2. ✅ 工具函数提取 - utils.tsx
 * 3. ✅ 常量提取 - constants.ts
 * 4. ✅ 使用 useCallback 优化事件处理
 * 5. ✅ 使用 useSafeApi + Zod 验证 API 响应
 */
const GPUDashboard = () => {
  // ✅ 使用重构后的 hook
  const {
    gpus,
    stats,
    allocations,
    loading,
    allocateVisible,
    setAllocateVisible,
    selectedGPU,
    detailVisible,
    setDetailVisible,
    activeTab,
    setActiveTab,
    form,
    openAllocateModal,
    handleAllocate,
    handleDeallocate,
    viewDetail,
  } = useGPUDashboard();

  // ===== 渲染 =====
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <GPUStatsCards stats={stats} />

        {/* GPU 设备与分配记录 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="GPU 设备" key="devices">
              <GPUDevicesTable
                gpus={gpus}
                loading={loading}
                onAllocate={openAllocateModal}
                onDeallocate={handleDeallocate}
                onViewDetail={viewDetail}
              />
            </TabPane>

            <TabPane tab="分配记录" key="allocations">
              <GPUAllocationsTable allocations={allocations} onDeallocate={handleDeallocate} />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* GPU 分配模态框 */}
      <AllocateGPUModal
        visible={allocateVisible}
        gpu={selectedGPU}
        form={form}
        onCancel={() => setAllocateVisible(false)}
        onOk={handleAllocate}
      />

      {/* GPU 详情模态框 */}
      <GPUDetailModal
        visible={detailVisible}
        gpu={selectedGPU}
        onCancel={() => setDetailVisible(false)}
      />
    </div>
  );
};

export default GPUDashboard;
