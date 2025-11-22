import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, message } from 'antd';
import { getDevice } from '@/services/device';
import {
  getDeviceSnapshots,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
} from '@/services/snapshot';
import type { Device } from '@/types';
import type { Snapshot } from '@/utils/snapshotConfig';

/**
 * 设备快照 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 */
export function useDeviceSnapshots() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // ===== 状态管理 =====
  const [device, setDevice] = useState<Device | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  // ===== 数据加载 =====
  /**
   * 加载设备信息
   */
  const loadDevice = useCallback(async () => {
    if (!id) return;
    try {
      const res = await getDevice(id);
      setDevice(res);
    } catch (error) {
      message.error('加载设备信息失败');
    }
  }, [id]);

  /**
   * 加载快照列表
   */
  const loadSnapshots = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // api 包装器已自动解包，直接使用返回数据
      const res = await getDeviceSnapshots(id);
      setSnapshots(res || []);
    } catch (error) {
      message.error('加载快照列表失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ===== 快照操作 =====
  /**
   * 创建快照
   */
  const handleCreateSnapshot = useCallback(
    async (values: { name: string; description?: string }) => {
      if (!id) return;
      try {
        await createSnapshot(id, values);
        message.success('快照创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        loadSnapshots();
      } catch (error: any) {
        message.error(error.message || '快照创建失败');
      }
    },
    [id, form, loadSnapshots]
  );

  /**
   * 恢复快照
   */
  const handleRestoreSnapshot = useCallback(async () => {
    if (!selectedSnapshot) return;
    try {
      await restoreSnapshot(selectedSnapshot.id);
      message.success('快照恢复成功，设备正在重启...');
      setRestoreModalVisible(false);
      setSelectedSnapshot(null);
      setTimeout(() => {
        loadDevice();
      }, 2000);
    } catch (error: any) {
      message.error(error.message || '快照恢复失败');
    }
  }, [selectedSnapshot, loadDevice]);

  /**
   * 删除快照
   */
  const handleDeleteSnapshot = useCallback(
    async (snapshotId: string) => {
      try {
        await deleteSnapshot(snapshotId);
        message.success('快照删除成功');
        loadSnapshots();
      } catch (error: any) {
        message.error(error.message || '快照删除失败');
      }
    },
    [loadSnapshots]
  );

  // ===== Modal 控制 =====
  /**
   * 打开创建快照 Modal
   */
  const openCreateModal = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  /**
   * 关闭创建快照 Modal
   */
  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false);
  }, []);

  /**
   * 打开恢复快照 Modal
   */
  const openRestoreModal = useCallback((snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setRestoreModalVisible(true);
  }, []);

  /**
   * 关闭恢复快照 Modal
   */
  const closeRestoreModal = useCallback(() => {
    setRestoreModalVisible(false);
    setSelectedSnapshot(null);
  }, []);

  // ===== 导航 =====
  /**
   * 返回设备详情
   */
  const goBackToDeviceDetail = useCallback(() => {
    navigate(`/devices/${id}`);
  }, [navigate, id]);

  // ===== 副作用 =====
  useEffect(() => {
    loadDevice();
    loadSnapshots();
  }, [loadDevice, loadSnapshots]);

  // ===== 返回所有状态和方法 =====
  return {
    // 基础数据
    device,
    snapshots,
    loading,
    deviceId: id,

    // Modal 状态
    createModalVisible,
    restoreModalVisible,
    selectedSnapshot,

    // 表单
    form,

    // 数据操作
    loadSnapshots,
    handleCreateSnapshot,
    handleRestoreSnapshot,
    handleDeleteSnapshot,

    // Modal 控制
    openCreateModal,
    closeCreateModal,
    openRestoreModal,
    closeRestoreModal,

    // 导航
    goBackToDeviceDetail,
  };
}
