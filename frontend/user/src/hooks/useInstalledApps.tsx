import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getInstalledApps,
  uninstallApp,
  batchUninstallApps,
  updateApp,
} from '@/services/app';

export interface InstalledApp {
  packageName: string;
  name: string;
  version: string;
  versionCode: number;
  icon?: string;
  size: number;
  installTime: string;
  updateTime: string;
  isSystemApp: boolean;
  hasUpdate: boolean;
  latestVersion?: string;
}

/**
 * 已安装应用管理 Hook
 *
 * 功能：
 * 1. 获取设备已安装应用列表
 * 2. 卸载单个应用
 * 3. 批量卸载应用
 * 4. 更新应用
 * 5. 应用统计
 * 6. 多选管理
 */
export const useInstalledApps = (deviceId: string | null) => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // 获取已安装应用列表
  const fetchApps = useCallback(async () => {
    if (!deviceId) {
      setApps([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getInstalledApps(deviceId);
      setApps(data);
    } catch (error: any) {
      console.error('Failed to fetch installed apps:', error);
      message.error(error.response?.data?.message || '获取已安装应用列表失败');
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // 设备ID变化时重新加载
  useEffect(() => {
    fetchApps();
    // 清除选择
    setSelectedAppIds([]);
  }, [fetchApps]);

  // 统计信息
  const stats = {
    total: apps.length,
    system: apps.filter((app) => app.isSystemApp).length,
    user: apps.filter((app) => !app.isSystemApp).length,
    updatable: apps.filter((app) => app.hasUpdate).length,
  };

  // 选择/取消选择应用
  const handleSelectApp = useCallback((packageName: string, checked: boolean) => {
    setSelectedAppIds((prev) =>
      checked
        ? [...prev, packageName]
        : prev.filter((id) => id !== packageName)
    );
  }, []);

  // 全选（只选择非系统应用）
  const handleSelectAll = useCallback(() => {
    const userApps = apps.filter((app) => !app.isSystemApp);
    setSelectedAppIds(userApps.map((app) => app.packageName));
  }, [apps]);

  // 清除选择
  const handleClearSelection = useCallback(() => {
    setSelectedAppIds([]);
  }, []);

  // 卸载单个应用
  const handleUninstall = useCallback(
    async (packageName: string) => {
      if (!deviceId) {
        message.error('请先选择设备');
        return;
      }

      try {
        await uninstallApp(deviceId, packageName);
        message.success('应用卸载成功');

        // 刷新列表
        await fetchApps();

        // 从选中列表中移除
        setSelectedAppIds((prev) => prev.filter((id) => id !== packageName));
      } catch (error: any) {
        message.error(
          error.response?.data?.message || '应用卸载失败'
        );
      }
    },
    [deviceId, fetchApps]
  );

  // 批量卸载应用
  const handleBatchUninstall = useCallback(async () => {
    if (!deviceId) {
      message.error('请先选择设备');
      return;
    }

    if (selectedAppIds.length === 0) {
      message.warning('请先选择要卸载的应用');
      return;
    }

    // 过滤掉系统应用
    const userAppsToUninstall = selectedAppIds.filter((packageName) => {
      const app = apps.find((a) => a.packageName === packageName);
      return app && !app.isSystemApp;
    });

    if (userAppsToUninstall.length === 0) {
      message.warning('系统应用无法卸载');
      return;
    }

    try {
      const result = await batchUninstallApps(deviceId, {
        packageNames: userAppsToUninstall,
      });

      const successCount = result.results.filter((r: any) => r.success).length;
      const failedCount = result.results.length - successCount;

      if (failedCount === 0) {
        message.success(`成功卸载 ${successCount} 个应用`);
      } else {
        message.warning(
          `卸载完成：${successCount} 个成功，${failedCount} 个失败`
        );
      }

      // 刷新列表
      await fetchApps();

      // 清除选择
      setSelectedAppIds([]);
    } catch (error: any) {
      message.error(
        error.response?.data?.message || '批量卸载失败'
      );
    }
  }, [deviceId, selectedAppIds, apps, fetchApps]);

  // 更新应用
  const handleUpdate = useCallback(
    async (packageName: string) => {
      if (!deviceId) {
        message.error('请先选择设备');
        return;
      }

      try {
        await updateApp(deviceId, packageName);
        message.success('应用更新成功');

        // 刷新列表
        await fetchApps();
      } catch (error: any) {
        message.error(
          error.response?.data?.message || '应用更新失败'
        );
      }
    },
    [deviceId, fetchApps]
  );

  // 刷新列表
  const handleRefresh = useCallback(() => {
    fetchApps();
    message.info('正在刷新应用列表...');
  }, [fetchApps]);

  return {
    apps,
    loading,
    stats,
    selectedAppIds,
    handleSelectApp,
    handleSelectAll,
    handleClearSelection,
    handleUninstall,
    handleBatchUninstall,
    handleUpdate,
    handleRefresh,
  };
};
