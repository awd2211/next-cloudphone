import { useState, useEffect, useCallback } from 'react';
import { Space, Card, Tabs, Form, message } from 'antd';
import {
  getGPUDevices,
  getGPUStats,
  allocateGPU,
  deallocateGPU,
  getGPUAllocations,
  type GPUDevice,
  type GPUStats,
  type GPUAllocation,
} from '@/types';
import {
  GPUStatsCards,
  GPUDevicesTable,
  GPUAllocationsTable,
  AllocateGPUModal,
  GPUDetailModal,
} from '@/components/GPU';

const { TabPane } = Tabs;

/**
 * GPU 管理面板（优化版）
 *
 * 优化点：
 * 1. ✅ 组件拆分 - 提取 GPUStatsCards, GPUDevicesTable 等
 * 2. ✅ 工具函数提取 - utils.tsx
 * 3. ✅ 常量提取 - constants.ts
 * 4. ✅ 使用 useCallback 优化事件处理
 */
const GPUDashboard = () => {
  // ===== 状态管理 =====
  const [gpus, setGpus] = useState<GPUDevice[]>([]);
  const [allocations, setAllocations] = useState<GPUAllocation[]>([]);
  const [stats, setStats] = useState<GPUStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [allocateVisible, setAllocateVisible] = useState(false);
  const [selectedGPU, setSelectedGPU] = useState<GPUDevice | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('devices');

  const [form] = Form.useForm();

  // ===== 数据加载 =====
  const loadGPUs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGPUDevices({ page: 1, pageSize: 100 });
      setGpus(res.data);
    } catch (error) {
      message.error('加载 GPU 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await getGPUStats();
      setStats(statsData);
    } catch (error) {
      message.error('加载统计失败');
    }
  }, []);

  const loadAllocations = useCallback(async () => {
    try {
      const res = await getGPUAllocations({ page: 1, pageSize: 50, status: 'active' });
      setAllocations(res.data);
    } catch (error) {
      message.error('加载分配记录失败');
    }
  }, []);

  useEffect(() => {
    loadGPUs();
    loadStats();
  }, [loadGPUs, loadStats]);

  useEffect(() => {
    if (activeTab === 'allocations') {
      loadAllocations();
    }
  }, [activeTab, loadAllocations]);

  // ===== 事件处理 =====
  const openAllocateModal = useCallback(
    (gpu: GPUDevice) => {
      if (gpu.allocatedTo) {
        message.warning('该 GPU 已被分配');
        return;
      }
      setSelectedGPU(gpu);
      setAllocateVisible(true);
      form.resetFields();
    },
    [form],
  );

  const handleAllocate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      await allocateGPU(selectedGPU!.id, values.deviceId, values.mode);
      message.success('GPU 分配成功');
      setAllocateVisible(false);
      loadGPUs();
      loadStats();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('分配失败');
    }
  }, [form, selectedGPU, loadGPUs, loadStats]);

  const handleDeallocate = useCallback(
    async (gpuId: string, deviceId?: string) => {
      try {
        await deallocateGPU(gpuId, deviceId);
        message.success('GPU 已释放');
        loadGPUs();
        loadStats();
        loadAllocations();
      } catch (error) {
        message.error('释放失败');
      }
    },
    [loadGPUs, loadStats, loadAllocations],
  );

  const viewDetail = useCallback((gpu: GPUDevice) => {
    setSelectedGPU(gpu);
    setDetailVisible(true);
  }, []);

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
