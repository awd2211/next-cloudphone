import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import type { CacheStats } from '@/components/CacheManagement';
import {
  getCacheStats,
  resetCacheStats,
  flushCache,
  deleteCache,
  deleteCachePattern,
  checkCacheExists,
} from '@/services/cache';

export const useCacheManagement = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteKeyModalVisible, setDeleteKeyModalVisible] = useState(false);
  const [deletePatternModalVisible, setDeletePatternModalVisible] = useState(false);
  const [checkKeyModalVisible, setCheckKeyModalVisible] = useState(false);
  const [checkResult, setCheckResult] = useState<{ key: string; exists: boolean } | null>(null);

  const [deleteForm] = Form.useForm();
  const [patternForm] = Form.useForm();
  const [checkForm] = Form.useForm();

  // 加载缓存统计
  const loadStats = useCallback(async () => {
    try {
      const res = await getCacheStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      message.error('加载缓存统计失败');
    }
  }, []);

  // 自动刷新统计（每10秒）
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // 重置统计
  const handleResetStats = useCallback(async () => {
    try {
      await resetCacheStats();
      message.success('统计已重置');
      await loadStats();
    } catch (error) {
      message.error('重置统计失败');
    }
  }, [loadStats]);

  // 清空所有缓存
  const handleFlushCache = useCallback(async () => {
    setLoading(true);
    try {
      await flushCache();
      message.success('所有缓存已清空');
      await loadStats();
    } catch (error) {
      message.error('清空缓存失败');
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  // 删除指定键
  const handleDeleteKey = useCallback(async () => {
    try {
      const values = await deleteForm.validateFields();
      await deleteCache(values.key);
      message.success('缓存键已删除');
      deleteForm.resetFields();
      setDeleteKeyModalVisible(false);
      await loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  }, [deleteForm, loadStats]);

  // 按模式删除
  const handleDeletePattern = useCallback(async () => {
    try {
      const values = await patternForm.validateFields();
      const res = await deleteCachePattern(values.pattern);
      if (res.success) {
        message.success(`已删除 ${res.data.deletedCount} 个缓存键`);
        patternForm.resetFields();
        setDeletePatternModalVisible(false);
        await loadStats();
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  }, [patternForm, loadStats]);

  // 检查键是否存在
  const handleCheckKey = useCallback(async () => {
    try {
      const values = await checkForm.validateFields();
      const res = await checkCacheExists(values.key);
      if (res.success) {
        setCheckResult(res.data);
      }
    } catch (error) {
      message.error('检查失败');
    }
  }, [checkForm]);

  // Modal 控制函数
  const showDeleteKeyModal = useCallback(() => {
    setDeleteKeyModalVisible(true);
  }, []);

  const hideDeleteKeyModal = useCallback(() => {
    setDeleteKeyModalVisible(false);
    deleteForm.resetFields();
  }, [deleteForm]);

  const showDeletePatternModal = useCallback(() => {
    setDeletePatternModalVisible(true);
  }, []);

  const hideDeletePatternModal = useCallback(() => {
    setDeletePatternModalVisible(false);
    patternForm.resetFields();
  }, [patternForm]);

  const showCheckKeyModal = useCallback(() => {
    setCheckKeyModalVisible(true);
  }, []);

  const hideCheckKeyModal = useCallback(() => {
    setCheckKeyModalVisible(false);
    checkForm.resetFields();
    setCheckResult(null);
  }, [checkForm]);

  return {
    // 状态
    stats,
    loading,
    deleteKeyModalVisible,
    deletePatternModalVisible,
    checkKeyModalVisible,
    checkResult,

    // Form 实例
    deleteForm,
    patternForm,
    checkForm,

    // 操作函数
    loadStats,
    handleResetStats,
    handleFlushCache,
    handleDeleteKey,
    handleDeletePattern,
    handleCheckKey,

    // Modal 控制
    showDeleteKeyModal,
    hideDeleteKeyModal,
    showDeletePatternModal,
    hideDeletePatternModal,
    showCheckKeyModal,
    hideCheckKeyModal,
  };
};
