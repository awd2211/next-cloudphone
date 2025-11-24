import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from 'antd';
import { getDeviceStats, getDevice } from '@/services/device';
import type { Device } from '@/types';
import { AUTO_REFRESH_INTERVAL, MAX_HISTORY_DATA } from '@/utils/monitorConfig';

const { useToken } = theme;

interface DeviceStats {
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  storageUsed: number;
  storageTotal: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
}

interface HistoryData {
  time: string;
  cpuUsage: number;
  memoryUsage: number;
}

/**
 * 设备监控 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 使用 useRef 管理定时器
 * 4. ✅ 自动刷新逻辑封装
 * 5. ✅ 统一错误处理
 * 6. ✅ 集中管理所有状态
 */
export function useDeviceMonitor(id: string | undefined) {
  const { token } = useToken();
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [device, setDevice] = useState<Device | null>(null);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);

  // ===== 定时器引用 =====
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      console.error('加载设备信息失败', error);
    }
  }, [id]);

  /**
   * 加载统计数据
   */
  const loadStats = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // api 包装器已自动解包，直接使用返回数据
      const newStats = await getDeviceStats(id);
      setStats({
        cpuUsage: newStats.cpu,
        memoryUsed: newStats.memory,
        memoryTotal: 100, // 百分比形式，总量设为100
        storageUsed: newStats.storage,
        storageTotal: 100, // 百分比形式，总量设为100
        networkIn: 0,
        networkOut: 0,
        uptime: 0,
      });

      // 添加到历史数据（最多保留 MAX_HISTORY_DATA 条）
      setHistoryData((prev) => {
        const now = new Date().toLocaleTimeString();
        const newData = [
          ...prev,
          {
            time: now,
            cpuUsage: newStats.cpu,
            memoryUsage: newStats.memory,
          },
        ];
        return newData.slice(-MAX_HISTORY_DATA);
      });
    } catch (error) {
      console.error('加载设备统计信息失败', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ===== 自动刷新控制 =====
  /**
   * 切换自动刷新
   */
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  // ===== 导航 =====
  /**
   * 返回设备详情
   */
  const goBack = useCallback(() => {
    navigate(`/devices/${id}`);
  }, [navigate, id]);

  // ===== 图表配置（使用 useMemo 缓存） =====
  /**
   * CPU 图表配置
   */
  const cpuChartConfig = useMemo(() => {
    return {
      data: historyData,
      xField: 'time',
      yField: 'cpuUsage',
      height: 200,
      smooth: true,
      color: token.colorPrimary,
      yAxis: {
        min: 0,
        max: 100,
        label: {
          formatter: (v: string) => `${v}%`,
        },
      },
      xAxis: {
        label: {
          autoRotate: true,
          autoHide: true,
        },
      },
      point: {
        size: 3,
      },
      tooltip: {
        formatter: (datum: HistoryData) => ({
          name: 'CPU使用率',
          value: `${datum.cpuUsage.toFixed(1)}%`,
        }),
      },
    };
  }, [historyData, token.colorPrimary]);

  /**
   * 内存图表配置
   */
  const memoryChartConfig = useMemo(() => {
    return {
      data: historyData,
      xField: 'time',
      yField: 'memoryUsage',
      height: 200,
      smooth: true,
      color: token.colorSuccess,
      yAxis: {
        min: 0,
        max: 100,
        label: {
          formatter: (v: string) => `${v}%`,
        },
      },
      xAxis: {
        label: {
          autoRotate: true,
          autoHide: true,
        },
      },
      point: {
        size: 3,
      },
      tooltip: {
        formatter: (datum: HistoryData) => ({
          name: '内存使用率',
          value: `${datum.memoryUsage.toFixed(1)}%`,
        }),
      },
    };
  }, [historyData, token.colorSuccess]);

  // ===== 副作用：初始加载和自动刷新 =====
  useEffect(() => {
    loadDevice();
    loadStats();

    // 设置自动刷新定时器
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadStats();
      }, AUTO_REFRESH_INTERVAL);
    }

    // 清理定时器
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadDevice, loadStats, autoRefresh]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    device,
    stats,
    loading,
    autoRefresh,
    historyData,

    // 图表配置
    cpuChartConfig,
    memoryChartConfig,

    // 数据操作
    loadStats,

    // 自动刷新控制
    toggleAutoRefresh,

    // 导航
    goBack,
  };
}
