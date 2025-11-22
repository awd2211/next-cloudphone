import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getApps, installAppToDevice } from '@/services/app';
import { getMyDevices } from '@/services/device';
import type { Application, Device } from '@/types';

/**
 * 应用市场业务逻辑 Hook
 * 封装应用加载、搜索、安装等功能
 */
export function useAppMarket() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [form] = Form.useForm();

  // 分类选项
  const categories = useMemo(
    () => [
      { label: '全部', value: '' },
      { label: '社交', value: 'social' },
      { label: '娱乐', value: 'entertainment' },
      { label: '工具', value: 'tools' },
      { label: '游戏', value: 'games' },
      { label: '办公', value: 'productivity' },
      { label: '其他', value: 'others' },
    ],
    []
  );

  // 加载应用列表
  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApps({ page, pageSize, category, search });
      setApps(res.data ?? []);
      setTotal(res.total);
    } catch (error) {
      message.error('加载应用列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, category, search]);

  // 加载设备列表
  const loadDevices = useCallback(async () => {
    try {
      const res = await getMyDevices({ page: 1, pageSize: 100 });
      setDevices((res.data ?? []).filter((d) => d.status === 'running'));
    } catch (error) {
      console.error('加载设备列表失败', error);
    }
  }, []);

  // 页面加载时获取应用和设备
  useEffect(() => {
    loadApps();
  }, [loadApps]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 处理搜索
  const handleSearch = useCallback(() => {
    setPage(1);
    loadApps();
  }, [loadApps]);

  // 查看应用详情
  const handleView = useCallback(
    (app: Application) => {
      navigate(`/apps/${app.id}`);
    },
    [navigate]
  );

  // 打开安装弹窗
  const handleInstall = useCallback((app: Application) => {
    if (devices.length === 0) {
      message.warning('没有运行中的设备，请先启动设备');
      return;
    }
    setSelectedApp(app);
    setInstallModalVisible(true);
  }, [devices.length]);

  // 确认安装
  const handleInstallConfirm = useCallback(
    async (values: { deviceId: string }) => {
      if (!selectedApp) return;
      try {
        await installAppToDevice(values.deviceId, selectedApp.id);
        message.success('应用安装成功');
        setInstallModalVisible(false);
        form.resetFields();
      } catch (error) {
        message.error('应用安装失败');
      }
    },
    [selectedApp, form]
  );

  // 取消安装
  const handleInstallCancel = useCallback(() => {
    setInstallModalVisible(false);
    form.resetFields();
  }, [form]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    setPage(page + 1);
  }, [page]);

  return {
    // 数据
    apps,
    devices,
    loading,
    total,
    page,
    pageSize,
    search,
    category,
    categories,
    installModalVisible,
    selectedApp,
    form,

    // 操作方法
    setSearch,
    setCategory,
    handleSearch,
    handleView,
    handleInstall,
    handleInstallConfirm,
    handleInstallCancel,
    handleLoadMore,
  };
}
