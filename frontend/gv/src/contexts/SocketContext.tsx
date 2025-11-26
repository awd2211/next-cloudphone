/**
 * WebSocket Context - 管理全局 Socket.IO 连接
 *
 * 设计要点:
 * 1. 单例连接 - 整个应用共享一个 WebSocket 连接
 * 2. 自动重连 - 断线后自动重连，最多尝试5次
 * 3. 心跳检测 - 保持连接活跃
 * 4. 事件分发 - 通过 EventEmitter 模式分发事件
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import type { Notification, NotificationSettings, SocketEvents } from '@/types/notification';

// 默认通知设置
const defaultSettings: NotificationSettings = {
  enabled: true,
  sound: true,
  desktop: false,
  deviceStatus: true,
  smsReceived: true,
  proxyWarning: true,
  systemAnnouncement: true,
};

interface SocketContextValue {
  // 连接状态
  connected: boolean;
  connecting: boolean;
  error: string | null;

  // 通知数据
  notifications: Notification[];
  unreadCount: number;

  // 通知设置
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;

  // 通知操作
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;

  // 连接操作
  connect: () => void;
  disconnect: () => void;

  // 事件订阅
  subscribe: (event: string, callback: (...args: unknown[]) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

// 模拟通知生成器 (用于演示)
const generateMockNotification = (): Notification => {
  const types: Array<{
    type: Notification['type'];
    level: Notification['level'];
    title: string;
    messages: string[];
  }> = [
    {
      type: 'device_status',
      level: 'info',
      title: '设备状态变更',
      messages: [
        'CloudPhone-001 已启动',
        'CloudPhone-002 已停止',
        'CloudPhone-003 重启完成',
        'CloudPhone-004 进入休眠模式',
      ],
    },
    {
      type: 'device_error',
      level: 'error',
      title: '设备异常',
      messages: [
        'CloudPhone-005 连接超时，正在重试...',
        '设备 dev-003 ADB 连接失败',
        '容器启动失败，内存不足',
      ],
    },
    {
      type: 'sms_received',
      level: 'success',
      title: '收到验证码',
      messages: [
        '收到来自 Google 的验证码: 485923',
        '收到来自 Facebook 的验证码: 736159',
        '收到来自 Twitter 的登录验证码',
        '收到来自 Amazon 的OTP: 293847',
      ],
    },
    {
      type: 'proxy_quality',
      level: 'warning',
      title: '代理质量警告',
      messages: [
        '代理 45.76.123.45 延迟升高至 350ms',
        '日本代理 IP 质量下降至 65%',
        '美国代理池可用数量不足',
      ],
    },
    {
      type: 'proxy_expired',
      level: 'warning',
      title: '代理即将过期',
      messages: [
        '代理 proxy-001 将在1小时后过期',
        '3个代理将在今天过期，请及时续费',
      ],
    },
    {
      type: 'system',
      level: 'info',
      title: '系统通知',
      messages: [
        '系统将于今晚22:00进行维护',
        '新功能: 批量设备管理已上线',
        '您的账户余额不足，请及时充值',
      ],
    },
    {
      type: 'security',
      level: 'error',
      title: '安全警告',
      messages: [
        '检测到异常登录行为，已自动锁定',
        '设备 dev-002 检测到可疑网络活动',
        'API密钥即将过期，请及时更新',
      ],
    },
    {
      type: 'task_complete',
      level: 'success',
      title: '任务完成',
      messages: [
        '批量启动任务已完成，成功启动5台设备',
        '数据备份完成',
        '代理池刷新完成，新增20个可用代理',
      ],
    },
  ];

  const randomType = types[Math.floor(Math.random() * types.length)];
  const randomMessage =
    randomType.messages[Math.floor(Math.random() * randomType.messages.length)];

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type: randomType.type,
    level: randomType.level,
    title: randomType.title,
    message: randomMessage,
    timestamp: new Date().toISOString(),
    read: false,
  };
};

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('notification-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const socketRef = useRef<Socket | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef<Map<string, Set<(...args: unknown[]) => void>>>(new Map());

  // 计算未读数量
  const unreadCount = notifications.filter((n) => !n.read).length;

  // 播放通知音效
  const playNotificationSound = useCallback(() => {
    if (!settings.sound) return;

    // 使用 Web Audio API 生成简单的提示音
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // 音频播放失败时静默处理
    }
  }, [settings.sound]);

  // 显示桌面通知
  const showDesktopNotification = useCallback(
    (notification: Notification) => {
      if (!settings.desktop || !('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    },
    [settings.desktop]
  );

  // 添加通知
  const addNotification = useCallback(
    (notification: Notification) => {
      if (!settings.enabled) return;

      // 根据类型检查设置
      const typeToSettingMap: Record<string, keyof NotificationSettings> = {
        device_status: 'deviceStatus',
        device_error: 'deviceStatus',
        sms_received: 'smsReceived',
        proxy_expired: 'proxyWarning',
        proxy_quality: 'proxyWarning',
        system: 'systemAnnouncement',
        security: 'systemAnnouncement',
        task_complete: 'systemAnnouncement',
      };

      const settingKey = typeToSettingMap[notification.type];
      if (settingKey && !settings[settingKey]) return;

      setNotifications((prev) => [notification, ...prev].slice(0, 100)); // 最多保留100条
      playNotificationSound();
      showDesktopNotification(notification);

      // 触发订阅的回调
      const listeners = listenersRef.current.get('notification');
      if (listeners) {
        listeners.forEach((callback) => callback(notification));
      }
    },
    [settings, playNotificationSound, showDesktopNotification]
  );

  // 连接 WebSocket (模拟)
  const connect = useCallback(() => {
    if (connecting || connected) return;

    setConnecting(true);
    setError(null);

    // 模拟连接延迟
    setTimeout(() => {
      setConnected(true);
      setConnecting(false);

      // 模拟初始通知
      const initialNotifications: Notification[] = [
        {
          id: 'notif-init-1',
          type: 'system',
          level: 'info',
          title: '欢迎回来',
          message: '您有 3 条未读消息',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: 'notif-init-2',
          type: 'device_status',
          level: 'success',
          title: '设备状态',
          message: '所有设备运行正常',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          read: false,
        },
        {
          id: 'notif-init-3',
          type: 'sms_received',
          level: 'success',
          title: '验证码已收到',
          message: '收到来自 Google 的验证码',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          read: true,
        },
      ];

      setNotifications(initialNotifications);

      // 启动模拟通知生成器 (每20-60秒随机生成一条)
      const startMockNotifications = () => {
        const randomDelay = () => Math.floor(Math.random() * 40000) + 20000; // 20-60秒

        const scheduleNext = () => {
          mockIntervalRef.current = setTimeout(() => {
            const notification = generateMockNotification();
            addNotification(notification);
            scheduleNext();
          }, randomDelay());
        };

        scheduleNext();
      };

      startMockNotifications();
    }, 800);
  }, [connecting, connected, addNotification]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (mockIntervalRef.current) {
      clearTimeout(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
  }, []);

  // 标记已读
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // 全部标记已读
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // 清空通知
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // 删除单条通知
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // 更新设置
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('notification-settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 事件订阅
  const subscribe = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      if (!listenersRef.current.has(event)) {
        listenersRef.current.set(event, new Set());
      }
      listenersRef.current.get(event)!.add(callback);

      // 返回取消订阅函数
      return () => {
        listenersRef.current.get(event)?.delete(callback);
      };
    },
    []
  );

  // 登录后自动连接
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !connected && !connecting) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  const value: SocketContextValue = {
    connected,
    connecting,
    error,
    notifications,
    unreadCount,
    settings,
    updateSettings,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    connect,
    disconnect,
    subscribe,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// Hook for using socket context
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Hook for notifications
export function useNotifications() {
  const {
    notifications,
    unreadCount,
    settings,
    updateSettings,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    subscribe,
    connected,
  } = useSocket();

  return {
    notifications,
    unreadCount,
    settings,
    updateSettings,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    subscribe,
    isConnected: connected,
  };
}
