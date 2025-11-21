import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { message as antMessage } from 'antd';
import { io, Socket } from 'socket.io-client';

interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

interface WebSocketContextValue {
  isConnected: boolean;
  sendMessage: (event: string, message: any) => void;
  notifications: NotificationMessage[];
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider = ({ children }: WebSocketProviderProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const connect = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // 构建 Socket.IO 连接 URL
    // 使用相对路径，让 Nginx 代理处理
    const wsBaseUrl = import.meta.env.VITE_WS_URL || '/ws';

    // 如果是相对路径，需要构建完整 URL
    let socketUrl: string;
    if (wsBaseUrl.startsWith('/')) {
      // 相对路径：使用当前域名 + 路径
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socketUrl = `${protocol}//${window.location.host}`;
    } else if (wsBaseUrl.startsWith('ws://') || wsBaseUrl.startsWith('wss://')) {
      // WebSocket URL：转换为 http/https
      socketUrl = wsBaseUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    } else {
      socketUrl = wsBaseUrl;
    }

    console.log('Socket.IO 连接到:', socketUrl);

    const socket = io(socketUrl, {
      path: wsBaseUrl.startsWith('/') ? wsBaseUrl : '/socket.io',
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO 连接已建立, ID:', socket.id);
      setIsConnected(true);
      antMessage.success('实时通知已连接');

      // 订阅用户通知
      const userId = getUserIdFromToken(token);
      if (userId) {
        socket.emit('subscribe', { userId });
      }
    });

    socket.on('welcome', (data) => {
      console.log('收到欢迎消息:', data);
    });

    socket.on('notification', (data) => {
      console.log('收到通知:', data);
      handleNotification(data);
    });

    socket.on('device-status-changed', (data) => {
      console.log('设备状态变更:', data);
      handleDeviceStatusChange(data);
    });

    socket.on('order-status-changed', (data) => {
      console.log('订单状态变更:', data);
      handleOrderStatusChange(data);
    });

    socket.on('payment-success', (data) => {
      console.log('支付成功:', data);
      handlePaymentSuccess(data);
    });

    socket.on('subscribed', (data) => {
      console.log('订阅成功:', data);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO 连接已关闭, 原因:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO 连接错误:', error.message);
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket.IO 错误:', error);
    });
  };

  // 从 JWT token 中提取用户 ID
  const getUserIdFromToken = (token: string): string | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload.sub || payload.userId || null;
    } catch {
      return null;
    }
  };

  const handleNotification = (data: any) => {
    const notification: NotificationMessage = {
      id: data.id || Date.now().toString(),
      type: data.type || 'info',
      title: data.title || '通知',
      message: data.message || data.content || '',
      timestamp: data.timestamp || new Date().toISOString(),
    };

    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // 最多保留50条

    // 显示 Ant Design 消息
    switch (notification.type) {
      case 'success':
        antMessage.success(notification.message);
        break;
      case 'error':
        antMessage.error(notification.message);
        break;
      case 'warning':
        antMessage.warning(notification.message);
        break;
      default:
        antMessage.info(notification.message);
    }
  };

  const handleDeviceStatusChange = (data: any) => {
    const statusMap: { [key: string]: string } = {
      running: '运行中',
      stopped: '已停止',
      idle: '空闲',
      error: '错误',
    };
    const statusText = statusMap[data.status] || data.status;

    handleNotification({
      type: 'info',
      title: '设备状态变更',
      message: `设备 ${data.deviceName || data.deviceId} 状态变更为：${statusText}`,
    });
  };

  const handleOrderStatusChange = (data: any) => {
    const statusMap: { [key: string]: string } = {
      pending: '待支付',
      paid: '已支付',
      cancelled: '已取消',
      refunded: '已退款',
      expired: '已过期',
    };
    const statusText = statusMap[data.status] || data.status;

    handleNotification({
      type: data.status === 'paid' ? 'success' : 'info',
      title: '订单状态变更',
      message: `订单 ${data.orderNo} 状态变更为：${statusText}`,
    });
  };

  const handlePaymentSuccess = (data: any) => {
    handleNotification({
      type: 'success',
      title: '支付成功',
      message: `支付 ¥${data.amount} 成功！`,
    });
  };

  const sendMessage = (event: string, message: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, message);
    } else {
      console.warn('Socket.IO 未连接，无法发送消息');
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        notifications,
        clearNotifications,
        removeNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
