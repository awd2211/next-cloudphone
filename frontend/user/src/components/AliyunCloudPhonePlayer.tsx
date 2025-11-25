/**
 * AliyunCloudPhonePlayer - 阿里云云手机投屏组件
 *
 * 使用阿里云无影 Web SDK 连接云手机实例
 *
 * Web SDK文档：
 * - https://help.aliyun.com/zh/ecp/web-sdk-of-cloudphone
 *
 * 使用方式：
 * 1. 后端调用 BatchGetAcpConnectionTicket 获取 ticket
 * 2. 前端使用 ticket 初始化 Web SDK 连接
 * 3. SDK自动处理 WebRTC 连接和视频渲染
 *
 * 注意：
 * - 需要在页面中引入阿里云 Web SDK: https://g.alicdn.com/aliyun-ecp/websdk/1.4.1/aliyun-ecp-websdk.js
 * - 连接需要 HTTPS 环境
 * - ticket 有效期 30 秒，需要及时使用
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Button, Space, message, Spin, Alert, Tag, Tooltip, theme } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  SettingOutlined,
  MobileOutlined,
  WifiOutlined,
  SoundOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { getAliyunConnectionTicket } from '@/services/device';

const { useToken } = theme;

// 阿里云 Web SDK 类型声明
declare global {
  interface Window {
    Wuying?: {
      WebSDK: {
        createSession: (type: string, params: AliyunSessionParams) => AliyunSession;
      };
    };
  }
}

interface AliyunSessionParams {
  openType: 'inline' | 'newTab';
  iframeId?: string;
  connectType: 'app' | 'desktop';
  resourceType: 'local' | 'cloud';
  userInfo: {
    ticket?: string;
    authCode?: string;
    loginToken?: string;
  };
  appInfo?: {
    osType: string;
    appId: string;
    regionId: string;
  };
}

interface AliyunSession {
  start: () => void;
  stop: () => void;
  setInputEnabled: (enabled: boolean) => void;
  enableKeyBoard: (enabled: boolean) => void;
  setClipboardEnabled: (enabled: boolean) => void;
  setMicrophoneEnabled: (enabled: boolean) => void;
  setTouchEnabled: (enabled: boolean) => void;
  setUiParams: (config: UiConfig) => void;
  addHandle: (event: string, callback: (data: unknown) => void) => void;
  sendDataChannelMessage: (channel: string, data: unknown) => void;
  addDataChannelListener: (channel: string, type: string, callback: (data: unknown) => void) => void;
  sendLyncMessage: (type: string, data: string) => void;
}

interface UiConfig {
  toolbar?: { visible: boolean };
  rotateDegree?: number;
  language?: string;
  reconnectType?: string;
}

interface AliyunCloudPhonePlayerProps {
  deviceId: string;
  instanceId: string;
  regionId?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const AliyunCloudPhonePlayer = ({
  deviceId,
  instanceId,
  regionId = 'cn-hangzhou',
  onConnected,
  onDisconnected,
  onError,
}: AliyunCloudPhonePlayerProps) => {
  const { token: antToken } = useToken();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sessionRef = useRef<AliyunSession | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState(true);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // 加载阿里云 Web SDK
  useEffect(() => {
    const loadScript = () => {
      if (window.Wuying) {
        setSdkLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://g.alicdn.com/aliyun-ecp/websdk/1.4.1/aliyun-ecp-websdk.js';
      script.async = true;
      script.onload = () => {
        console.log('Aliyun Web SDK loaded');
        setSdkLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Aliyun Web SDK');
        setError('加载阿里云SDK失败，请检查网络连接');
      };
      document.head.appendChild(script);
    };

    loadScript();
  }, []);

  // 连接云手机
  const connect = useCallback(async () => {
    if (!sdkLoaded || !window.Wuying) {
      message.error('SDK未加载完成，请稍后重试');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);

      // 获取连接凭证 (ticket)
      const ticketResponse = await getAliyunConnectionTicket(deviceId);

      if (!ticketResponse.success || !ticketResponse.data?.ticket) {
        throw new Error(ticketResponse.message || '获取连接凭证失败');
      }

      const { ticket } = ticketResponse.data;

      // 创建会话
      const session = window.Wuying.WebSDK.createSession('appstream', {
        openType: 'inline',
        iframeId: `aliyun-phone-${instanceId}`,
        connectType: 'app',
        resourceType: 'local',
        userInfo: {
          ticket,
        },
        appInfo: {
          osType: 'android',
          appId: instanceId,
          regionId,
        },
      });

      sessionRef.current = session;

      // 注册事件处理
      session.addHandle('getConnectionTicketInfo', (data) => {
        console.log('Connection ticket info:', data);
      });

      session.addHandle('onConnected', () => {
        console.log('Connected to Aliyun cloud phone');
        setStatus('connected');
        message.success('云手机连接成功');
        onConnected?.();
      });

      session.addHandle('onDisConnected', (data) => {
        console.log('Disconnected from cloud phone:', data);
        setStatus('disconnected');
        message.warning('云手机连接已断开');
        onDisconnected?.();
      });

      session.addHandle('onError', (data: unknown) => {
        const errorMsg = typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: string }).message)
          : '连接发生错误';
        console.error('Connection error:', data);
        setError(errorMsg);
        setStatus('error');
        message.error(errorMsg);
        onError?.(errorMsg);
      });

      session.addHandle('onRuntimeMsg', (data) => {
        console.log('Runtime message:', data);
      });

      // 配置UI
      session.setUiParams({
        toolbar: { visible: false }, // 隐藏默认工具栏
        rotateDegree: 0,
        language: 'zh-CN',
        reconnectType: 'normal',
      });

      // 启动连接
      session.start();

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '连接失败';
      console.error('Failed to connect:', err);
      setError(errorMsg);
      setStatus('error');
      message.error(errorMsg);
      onError?.(errorMsg);
    }
  }, [sdkLoaded, deviceId, instanceId, regionId, onConnected, onDisconnected, onError]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setStatus('disconnected');
    message.info('已断开连接');
  }, []);

  // 重新连接
  const reconnect = useCallback(async () => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 500);
  }, [disconnect, connect]);

  // 切换输入控制
  const toggleInput = useCallback((enabled: boolean) => {
    if (sessionRef.current) {
      sessionRef.current.setInputEnabled(enabled);
      setInputEnabled(enabled);
      message.info(enabled ? '已启用输入' : '已禁用输入');
    }
  }, []);

  // 切换键盘
  const toggleKeyboard = useCallback((enabled: boolean) => {
    if (sessionRef.current) {
      sessionRef.current.enableKeyBoard(enabled);
      setKeyboardEnabled(enabled);
      message.info(enabled ? '已启用键盘' : '已禁用键盘');
    }
  }, []);

  // 切换麦克风
  const toggleMicrophone = useCallback((enabled: boolean) => {
    if (sessionRef.current) {
      sessionRef.current.setMicrophoneEnabled(enabled);
      setMicrophoneEnabled(enabled);
      message.info(enabled ? '已启用麦克风' : '已禁用麦克风');
    }
  }, []);

  // 切换触摸 (预留功能)
  const toggleTouch = useCallback((enabled: boolean) => {
    if (sessionRef.current) {
      sessionRef.current.setTouchEnabled(enabled);
      setTouchEnabled(enabled);
      message.info(enabled ? '已启用触摸' : '已禁用触摸');
    }
  }, []);

  // 执行ADB命令 (预留功能)
  const sendAdbCommand = useCallback((command: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendLyncMessage('lync_adb_shell', JSON.stringify({
        id: Date.now(),
        cmd: command,
      }));
      console.log('ADB command sent:', command);
    }
  }, []);

  // 全屏
  const toggleFullscreen = useCallback(() => {
    const iframe = document.getElementById(`aliyun-phone-${instanceId}`);
    if (iframe) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        iframe.requestFullscreen();
      }
    }
  }, [instanceId]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop();
      }
    };
  }, []);

  // 获取状态颜色
  const getStatusColor = (s: ConnectionStatus) => {
    switch (s) {
      case 'connected':
        return antToken.colorSuccess;
      case 'connecting':
        return antToken.colorWarning;
      case 'error':
        return antToken.colorError;
      default:
        return antToken.colorTextSecondary;
    }
  };

  // 获取状态文本
  const getStatusText = (s: ConnectionStatus) => {
    switch (s) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      case 'error':
        return '连接错误';
      default:
        return '未连接';
    }
  };

  // 预留功能，供未来 UI 扩展使用
  void touchEnabled; void toggleTouch; void sendAdbCommand;

  return (
    <Card
      title={
        <Space>
          <MobileOutlined />
          阿里云云手机
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
        </Space>
      }
      extra={
        <Space>
          {status === 'disconnected' && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={connect}
              loading={!sdkLoaded}
            >
              连接
            </Button>
          )}
          {status === 'connecting' && (
            <Button loading disabled>
              连接中
            </Button>
          )}
          {status === 'connected' && (
            <>
              <Tooltip title={inputEnabled ? '禁用输入' : '启用输入'}>
                <Button
                  type={inputEnabled ? 'primary' : 'default'}
                  icon={<SettingOutlined />}
                  onClick={() => toggleInput(!inputEnabled)}
                />
              </Tooltip>
              <Tooltip title={keyboardEnabled ? '禁用键盘' : '启用键盘'}>
                <Button
                  type={keyboardEnabled ? 'primary' : 'default'}
                  icon={<KeyOutlined />}
                  onClick={() => toggleKeyboard(!keyboardEnabled)}
                />
              </Tooltip>
              <Tooltip title={microphoneEnabled ? '禁用麦克风' : '启用麦克风'}>
                <Button
                  type={microphoneEnabled ? 'primary' : 'default'}
                  icon={<SoundOutlined />}
                  onClick={() => toggleMicrophone(!microphoneEnabled)}
                />
              </Tooltip>
              <Button icon={<ReloadOutlined />} onClick={reconnect}>
                重连
              </Button>
              <Button icon={<PauseCircleOutlined />} onClick={disconnect}>
                断开
              </Button>
              <Button icon={<FullscreenOutlined />} onClick={toggleFullscreen}>
                全屏
              </Button>
            </>
          )}
          {status === 'error' && (
            <Button type="primary" icon={<ReloadOutlined />} onClick={reconnect}>
              重试
            </Button>
          )}
        </Space>
      }
    >
      {error && (
        <Alert
          message="连接错误"
          description={error}
          type="error"
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '177.78%', // 9:16 比例 (手机屏幕)
          backgroundColor: '#000',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* 阿里云 SDK iframe 容器 */}
        <iframe
          id={`aliyun-phone-${instanceId}`}
          ref={iframeRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Aliyun Cloud Phone"
          allow="microphone; camera; clipboard-read; clipboard-write"
        />

        {/* 连接中的遮罩 */}
        {status === 'connecting' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 10,
            }}
          >
            <Space direction="vertical" align="center">
              <Spin size="large" />
              <span style={{ color: '#fff' }}>正在连接云手机...</span>
            </Space>
          </div>
        )}

        {/* 未连接时的占位 */}
        {status === 'disconnected' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <MobileOutlined style={{ fontSize: 64, marginBottom: 16 }} />
            <div>点击"连接"按钮查看云手机画面</div>
          </div>
        )}
      </div>

      {/* 连接信息 */}
      {status === 'connected' && (
        <div style={{ marginTop: 16 }}>
          <Space split="|">
            <Space>
              <WifiOutlined style={{ color: antToken.colorSuccess }} />
              <span>实时投屏中</span>
            </Space>
            <span>实例ID: {instanceId}</span>
            <span>地域: {regionId}</span>
          </Space>
        </div>
      )}

      {/* SDK 加载状态 */}
      {!sdkLoaded && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Spin size="small" /> 正在加载阿里云 SDK...
        </div>
      )}
    </Card>
  );
};

export default AliyunCloudPhonePlayer;
