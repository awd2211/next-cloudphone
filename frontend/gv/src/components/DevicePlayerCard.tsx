/**
 * 设备播放器卡片组件
 *
 * 用于群控页面中展示单个设备的投屏画面
 * 支持：
 * - WebRTC 实时投屏
 * - 设备状态显示
 * - 快捷操作按钮
 * - 全屏模式
 */

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  Card,
  Button,
  Space,
  Spin,
  Tag,
  Tooltip,
  Dropdown,
  Badge,
  Typography,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  MobileOutlined,
  WifiOutlined,
  MoreOutlined,
  StopOutlined,
  DeleteOutlined,
  GlobalOutlined,
  SettingOutlined,
  LoadingOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import type { Device } from '@/types';

const { Text } = Typography;
const { useToken } = theme;

// WebRTC 配置
const WEBRTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface DevicePlayerCardProps {
  device: Device;
  autoConnect?: boolean;
  onStatusChange?: (status: ConnectionStatus) => void;
  onAction?: (action: 'start' | 'stop' | 'delete' | 'proxy', device: Device) => void;
}

const DevicePlayerCard = memo(({
  device,
  autoConnect = true,
  onStatusChange,
  onAction,
}: DevicePlayerCardProps) => {
  const { token } = useToken();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 重连相关
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const MAX_RETRIES = 3;
  const BASE_DELAY = 2000;

  // 获取 WebSocket URL
  const getWsUrl = useCallback(() => {
    const baseUrl = import.meta.env.VITE_WEBRTC_WS_URL || 'ws://localhost:30009';
    return `${baseUrl}/ws/device/${device.id}`;
  }, [device.id]);

  // 更新状态
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // 连接 WebRTC
  const connect = useCallback(() => {
    if (!shouldReconnectRef.current || device.status !== 'running') return;

    if (retryCountRef.current >= MAX_RETRIES) {
      updateStatus('error');
      return;
    }

    updateStatus('connecting');

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      retryCountRef.current = 0;
      initWebRTC();
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'offer') {
          await handleOffer(data.sdp);
        } else if (data.type === 'ice-candidate' && data.candidate) {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    ws.onerror = () => {
      updateStatus('error');
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      if (shouldReconnectRef.current && retryCountRef.current < MAX_RETRIES && device.status === 'running') {
        const delay = BASE_DELAY * Math.pow(1.5, retryCountRef.current);

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }

        retryTimeoutRef.current = setTimeout(() => {
          retryCountRef.current++;
          cleanup(false);
          connect();
        }, delay);
      }
    };
  }, [getWsUrl, device.status, updateStatus]);

  // 初始化 WebRTC
  const initWebRTC = useCallback(() => {
    const pc = new RTCPeerConnection(WEBRTC_CONFIGURATION);
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        updateStatus('connected');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        updateStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        updateStatus('error');
      }
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start-stream',
        deviceId: device.id,
      }));
    }
  }, [device.id, updateStatus]);

  // 处理 SDP Offer
  const handleOffer = async (sdp: string) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp })
      );

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'answer',
          sdp: answer.sdp,
        }));
      }
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  // 清理连接
  const cleanup = useCallback((stopReconnect = true) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (stopReconnect) {
      shouldReconnectRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }
  }, []);

  // 断开连接
  const disconnect = useCallback(() => {
    cleanup();
    updateStatus('disconnected');
  }, [cleanup, updateStatus]);

  // 重新连接
  const reconnect = useCallback(() => {
    cleanup();
    retryCountRef.current = 0;
    shouldReconnectRef.current = true;
    setTimeout(connect, 300);
  }, [cleanup, connect]);

  // 全屏
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect && device.status === 'running') {
      shouldReconnectRef.current = true;
      retryCountRef.current = 0;
      connect();
    } else {
      cleanup();
      updateStatus('disconnected');
    }

    return () => {
      cleanup();
    };
  }, [autoConnect, device.status, connect, cleanup, updateStatus]);

  // 获取状态配置
  const getStatusConfig = (s: ConnectionStatus) => {
    switch (s) {
      case 'connected':
        return { color: token.colorSuccess, text: '已连接', icon: <WifiOutlined /> };
      case 'connecting':
        return { color: token.colorWarning, text: '连接中', icon: <LoadingOutlined /> };
      case 'error':
        return { color: token.colorError, text: '连接失败', icon: <DisconnectOutlined /> };
      default:
        return { color: token.colorTextSecondary, text: '未连接', icon: <MobileOutlined /> };
    }
  };

  // 设备状态配置
  const getDeviceStatusConfig = () => {
    switch (device.status) {
      case 'running':
        return { color: 'success', text: '运行中' };
      case 'stopped':
        return { color: 'default', text: '已停止' };
      case 'error':
        return { color: 'error', text: '异常' };
      default:
        return { color: 'default', text: device.status };
    }
  };

  const statusConfig = getStatusConfig(status);
  const deviceStatusConfig = getDeviceStatusConfig();

  // 更多操作菜单
  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'proxy',
      icon: <GlobalOutlined />,
      label: '配置代理',
      onClick: () => onAction?.('proxy', device),
    },
    { type: 'divider' },
    {
      key: 'stop',
      icon: <StopOutlined />,
      label: '停止设备',
      disabled: device.status !== 'running',
      onClick: () => onAction?.('stop', device),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除设备',
      danger: true,
      onClick: () => onAction?.('delete', device),
    },
  ];

  return (
    <Card
      ref={containerRef}
      size="small"
      title={
        <Space size={4}>
          <MobileOutlined />
          <Text ellipsis style={{ maxWidth: 100 }} title={device.name}>
            {device.name}
          </Text>
        </Space>
      }
      extra={
        <Space size={4}>
          <Tag color={deviceStatusConfig.color} style={{ margin: 0, fontSize: 10, padding: '0 4px' }}>
            {deviceStatusConfig.text}
          </Tag>
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      }
      styles={{
        body: { padding: 0 },
      }}
      style={{
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* 视频容器 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '177.78%', // 9:16
          backgroundColor: '#000',
        }}
      >
        {/* 设备未运行 */}
        {device.status !== 'running' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            <MobileOutlined style={{ fontSize: 32, marginBottom: 8 }} />
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
              设备未运行
            </Text>
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => onAction?.('start', device)}
              style={{ marginTop: 8 }}
            >
              启动
            </Button>
          </div>
        )}

        {/* 连接中 */}
        {device.status === 'running' && status === 'connecting' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 10,
            }}
          >
            <Spin size="default" />
            <Text style={{ color: '#fff', marginTop: 8, fontSize: 12 }}>连接中...</Text>
          </div>
        )}

        {/* 未连接/错误 */}
        {device.status === 'running' && (status === 'disconnected' || status === 'error') && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            <DisconnectOutlined style={{ fontSize: 32, marginBottom: 8 }} />
            <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
              {status === 'error' ? '连接失败' : '点击连接'}
            </Text>
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={reconnect}
              style={{ marginTop: 8 }}
            >
              {status === 'error' ? '重试' : '连接'}
            </Button>
          </div>
        )}

        {/* 视频 */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />

        {/* 连接状态指示器 */}
        {status === 'connected' && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Badge status="success" />
            <Text style={{ color: '#52c41a', fontSize: 10 }}>LIVE</Text>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 8px',
          backgroundColor: '#1a1a1a',
          gap: 4,
        }}
      >
        {device.status === 'running' && (
          <>
            {status === 'connected' ? (
              <>
                <Tooltip title="重连">
                  <Button size="small" type="text" icon={<ReloadOutlined style={{ color: '#fff' }} />} onClick={reconnect} />
                </Tooltip>
                <Tooltip title="断开">
                  <Button size="small" type="text" icon={<PauseCircleOutlined style={{ color: '#fff' }} />} onClick={disconnect} />
                </Tooltip>
                <Tooltip title="全屏">
                  <Button size="small" type="text" icon={<FullscreenOutlined style={{ color: '#fff' }} />} onClick={toggleFullscreen} />
                </Tooltip>
              </>
            ) : status === 'disconnected' ? (
              <Tooltip title="连接">
                <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={reconnect}>
                  连接
                </Button>
              </Tooltip>
            ) : status === 'error' ? (
              <Tooltip title="重试">
                <Button size="small" type="primary" danger icon={<ReloadOutlined />} onClick={reconnect}>
                  重试
                </Button>
              </Tooltip>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
});

DevicePlayerCard.displayName = 'DevicePlayerCard';

export default DevicePlayerCard;
