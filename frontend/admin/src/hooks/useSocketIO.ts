import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { message } from 'antd';

/**
 * WebSocket 配置
 */
const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:30006';

/**
 * WebSocket 连接状态
 */
export enum WebSocketStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * WebSocket Hook 返回值
 */
interface UseSocketIOReturn {
  socket: Socket | null;
  status: WebSocketStatus;
  connected: boolean;
  error: Error | null;
  reconnect: () => void;
}

/**
 * 全局 WebSocket 单例
 */
let globalSocket: Socket | null = null;
let globalStatus: WebSocketStatus = WebSocketStatus.DISCONNECTED;
let globalError: Error | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // 1 秒

/**
 * 获取用户信息
 */
function getUserInfo(): { id?: string; role?: string } | null {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (_error) {
    console.error('Failed to parse user info:', error);
    return null;
  }
}

/**
 * 获取 JWT Token
 */
function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * 创建 WebSocket 连接
 */
function createWebSocketConnection(): Socket {
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  console.log(`🔌 Creating WebSocket connection to ${WEBSOCKET_URL}`);

  const socket = io(WEBSOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // 连接成功
  socket.on('connect', () => {
    console.log('✅ WebSocket connected:', socket.id);
    globalStatus = WebSocketStatus.CONNECTED;
    globalError = null;
    reconnectAttempts = 0;

    const user = getUserInfo();
    if (user?.id) {
      // 订阅用户通知
      socket.emit('subscribe', { userId: user.id });
      console.log(`📩 Subscribed to user:${user.id}`);

      // 如果是管理员，加入管理员房间
      if (user.role === 'admin' || user.role === 'superadmin') {
        socket.emit('join_room', { room: 'admin' });
        console.log('👑 Joined admin room');
      }
    }
  });

  // 连接断开
  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket disconnected:', reason);
    globalStatus = WebSocketStatus.DISCONNECTED;

    if (reason === 'io server disconnect') {
      // 服务器主动断开，需要手动重连
      socket.connect();
    }
  });

  // 连接错误
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error.message);
    globalStatus = WebSocketStatus.ERROR;
    globalError = error;
    reconnectAttempts++;

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      message.error('WebSocket 连接失败，请刷新页面重试');
    }
  });

  // 欢迎消息
  socket.on('welcome', (data) => {
    console.log('👋 Welcome:', data);
  });

  // 订阅成功
  socket.on('subscribed', (data) => {
    console.log('✅ Subscribed:', data);
  });

  // 房间加入成功
  socket.on('room_joined', (data) => {
    console.log('✅ Room joined:', data);
  });

  // 通知消息
  socket.on('notification', (data) => {
    console.log('📬 Notification received:', data);
  });

  // 通用消息
  socket.on('message', (data) => {
    console.log('💬 Message received:', data);
  });

  return socket;
}

/**
 * Socket.IO Hook
 *
 * 提供全局单例 WebSocket 连接，自动处理：
 * - 认证和连接管理
 * - 用户订阅和房间加入
 * - 断线重连
 * - 错误处理
 *
 * @example
 * ```tsx
 * const { socket, status, connected } = useSocketIO();
 *
 * useEffect(() => {
 *   if (!socket) return;
 *
 *   socket.on('custom_event', (data) => {
 *     console.log('Custom event:', data);
 *   });
 *
 *   return () => {
 *     socket.off('custom_event');
 *   };
 * }, [socket]);
 * ```
 */
export const useSocketIO = (): UseSocketIOReturn => {
  const [socket, setSocket] = useState<Socket | null>(globalSocket);
  const [status, setStatus] = useState<WebSocketStatus>(globalStatus);
  const [error, setError] = useState<Error | null>(globalError);
  const statusUpdateTimer = useRef<number | null>(null);

  // 初始化或复用现有连接
  useEffect(() => {
    // 如果已有连接且正常，直接复用
    if (globalSocket?.connected) {
      setSocket(globalSocket);
      setStatus(WebSocketStatus.CONNECTED);
      return;
    }

    // 创建新连接
    try {
      const newSocket = createWebSocketConnection();
      globalSocket = newSocket;
      setSocket(newSocket);

      // 轮询更新状态（因为事件监听器在全局，需要同步到本地状态）
      statusUpdateTimer.current = window.setInterval(() => {
        setStatus(globalStatus);
        setError(globalError);
      }, 500);
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError(err as Error);
      setStatus(WebSocketStatus.ERROR);
    }

    return () => {
      // 不关闭连接，保持全局单例
      if (statusUpdateTimer.current) {
        clearInterval(statusUpdateTimer.current);
      }
    };
  }, []);

  // 手动重连
  const reconnect = useCallback(() => {
    if (globalSocket) {
      console.log('🔄 Manual reconnect triggered');
      reconnectAttempts = 0;
      globalSocket.connect();
    }
  }, []);

  return {
    socket,
    status,
    connected: status === WebSocketStatus.CONNECTED,
    error,
    reconnect,
  };
};

/**
 * 清理全局 WebSocket 连接（用于退出登录等场景）
 */
export const cleanupSocketIO = () => {
  if (globalSocket) {
    console.log('🧹 Cleaning up WebSocket connection');
    globalSocket.disconnect();
    globalSocket = null;
    globalStatus = WebSocketStatus.DISCONNECTED;
    globalError = null;
    reconnectAttempts = 0;
  }
};
