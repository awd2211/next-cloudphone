/**
 * 云手机播放器组件
 *
 * 支持多种云手机提供商：
 * 1. Redroid - 使用 WebRTC 协议
 * 2. 阿里云 ECP - 使用阿里云无影 SDK
 * 3. 华为云 CPH - 待实现
 *
 * 功能特性：
 * - 实时投屏显示
 * - 触摸输入控制
 * - 全屏模式
 * - 自动重连
 */

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  Modal,
  Button,
  Space,
  Spin,
  Alert,
  Tag,
  Tooltip,
  message,
  Typography,
  theme,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  MobileOutlined,
  WifiOutlined,
  SettingOutlined,
  SoundOutlined,
  KeyOutlined,
  CloseOutlined,
  LoadingOutlined,
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

// 重连配置
const MAX_RETRIES = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface CloudPhonePlayerProps {
  device: Device;
  visible: boolean;
  onClose: () => void;
}

const CloudPhonePlayer = memo(({ device, visible, onClose }: CloudPhonePlayerProps) => {
  const { token } = useToken();
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputEnabled, setInputEnabled] = useState(true);

  // 重连相关
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  // Modal container ref for fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取 WebRTC WebSocket URL
  const getWsUrl = useCallback(() => {
    const baseUrl = import.meta.env.VITE_WEBRTC_WS_URL || 'ws://localhost:30009';
    return `${baseUrl}/ws/device/${device.id}`;
  }, [device.id]);

  // 连接 WebRTC
  const connect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    if (retryCountRef.current >= MAX_RETRIES) {
      setError(`连接失败（已重试 ${MAX_RETRIES} 次），请稍后重试`);
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setError(null);

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
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
      setError('连接错误');
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }

      if (shouldReconnectRef.current && retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), MAX_DELAY);
        setError(`连接断开，${delay / 1000}秒后重连...`);

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
  }, [getWsUrl]);

  // 初始化 WebRTC
  const initWebRTC = useCallback(() => {
    const pc = new RTCPeerConnection(WEBRTC_CONFIGURATION);
    peerConnectionRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setStatus('connected');
        setError(null);
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
        setStatus('connected');
        setError(null);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('连接失败');
        setStatus('error');
      }
    };

    // 请求开始流
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start-stream',
        deviceId: device.id,
      }));
    }
  }, [device.id]);

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
      setError('协议协商失败');
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
    setStatus('disconnected');
  }, [cleanup]);

  // 重新连接
  const reconnect = useCallback(() => {
    cleanup();
    retryCountRef.current = 0;
    shouldReconnectRef.current = true;
    setTimeout(connect, 500);
  }, [cleanup, connect]);

  // 切换全屏
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

  // visible 变化时连接/断开
  useEffect(() => {
    if (visible && device.status === 'running') {
      shouldReconnectRef.current = true;
      retryCountRef.current = 0;
      connect();
    } else {
      cleanup();
      setStatus('disconnected');
      setError(null);
    }

    return () => {
      cleanup();
    };
  }, [visible, device.status, connect, cleanup]);

  // 获取状态颜色和文本
  const getStatusInfo = (s: ConnectionStatus) => {
    switch (s) {
      case 'connected':
        return { color: token.colorSuccess, text: '已连接', icon: <WifiOutlined /> };
      case 'connecting':
        return { color: token.colorWarning, text: '连接中...', icon: <LoadingOutlined /> };
      case 'error':
        return { color: token.colorError, text: '连接错误', icon: <CloseOutlined /> };
      default:
        return { color: token.colorTextSecondary, text: '未连接', icon: <MobileOutlined /> };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <Modal
      title={
        <Space>
          <MobileOutlined />
          <span>云手机投屏 - {device.name}</span>
          <Tag color={statusInfo.color} icon={statusInfo.icon}>
            {statusInfo.text}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={500}
      centered
      footer={null}
      destroyOnClose
      styles={{
        body: { padding: 0 },
      }}
    >
      <div ref={containerRef} style={{ background: '#000' }}>
        {/* 错误提示 */}
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ margin: '8px 16px' }}
          />
        )}

        {/* 设备未运行提示 */}
        {device.status !== 'running' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 400,
              color: '#fff',
            }}
          >
            <MobileOutlined style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} />
            <Text style={{ color: '#fff', fontSize: 16 }}>设备未运行</Text>
            <Text type="secondary" style={{ color: 'rgba(255,255,255,0.45)' }}>
              请先启动设备后再连接
            </Text>
          </div>
        ) : (
          <>
            {/* 视频容器 */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '177.78%', // 9:16 手机比例
                backgroundColor: '#000',
              }}
            >
              {/* 连接中遮罩 */}
              {status === 'connecting' && (
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
                  <Spin size="large" />
                  <Text style={{ color: '#fff', marginTop: 16 }}>正在连接云手机...</Text>
                </div>
              )}

              {/* 未连接占位 */}
              {status === 'disconnected' && (
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
                    color: '#fff',
                  }}
                >
                  <MobileOutlined style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} />
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={connect}>
                    连接云手机
                  </Button>
                </div>
              )}

              {/* 视频元素 */}
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
            </div>

            {/* 工具栏 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: '#1a1a1a',
                borderTop: '1px solid #333',
              }}
            >
              <Space>
                {status === 'connected' && (
                  <>
                    <Text style={{ color: '#52c41a', fontSize: 12 }}>
                      <WifiOutlined /> 实时投屏中
                    </Text>
                  </>
                )}
              </Space>

              <Space>
                {status === 'disconnected' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={connect}
                  >
                    连接
                  </Button>
                )}
                {status === 'connecting' && (
                  <Button size="small" disabled loading>
                    连接中
                  </Button>
                )}
                {status === 'connected' && (
                  <>
                    <Tooltip title={inputEnabled ? '禁用输入' : '启用输入'}>
                      <Button
                        size="small"
                        type={inputEnabled ? 'primary' : 'default'}
                        icon={<SettingOutlined />}
                        onClick={() => setInputEnabled(!inputEnabled)}
                      />
                    </Tooltip>
                    <Tooltip title="重新连接">
                      <Button size="small" icon={<ReloadOutlined />} onClick={reconnect} />
                    </Tooltip>
                    <Tooltip title="断开连接">
                      <Button size="small" icon={<PauseCircleOutlined />} onClick={disconnect} />
                    </Tooltip>
                    <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
                      <Button
                        size="small"
                        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        onClick={toggleFullscreen}
                      />
                    </Tooltip>
                  </>
                )}
                {status === 'error' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={reconnect}
                  >
                    重试
                  </Button>
                )}
              </Space>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
});

CloudPhonePlayer.displayName = 'CloudPhonePlayer';

export default CloudPhonePlayer;
