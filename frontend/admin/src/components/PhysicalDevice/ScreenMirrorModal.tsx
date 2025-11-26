import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Spin,
  Button,
  Space,
  Tooltip,
  message,
  Typography,
  Divider,
} from 'antd';
import {
  HomeOutlined,
  ArrowLeftOutlined,
  PoweroffOutlined,
  SoundOutlined,
  MenuOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { NEUTRAL_LIGHT } from '@/theme';

const { Text } = Typography;

// Android Key Codes
const KEYCODE = {
  HOME: 3,
  BACK: 4,
  POWER: 26,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  MENU: 82,
} as const;

// WebRTC 配置
const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// 控制消息类型
interface ControlMessage {
  type: 'touch' | 'key' | 'text';
  deviceId: string;
  action: string;
  x?: number;
  y?: number;
  keyCode?: number;
  text?: string;
  timestamp: number;
}

interface ScreenMirrorModalProps {
  visible: boolean;
  deviceSerial: string; // IP:PORT 格式，如 "192.168.102.117:5555"
  deviceName?: string;
  onClose: () => void;
}

/** 扫描设备屏幕映射模态框 */
export const ScreenMirrorModal = memo<ScreenMirrorModalProps>(
  ({ visible, deviceSerial, deviceName, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [connectionState, setConnectionState] = useState<string>('connecting');

    // 视频尺寸状态（用于坐标转换）
    const [videoSize, setVideoSize] = useState({ width: 1080, height: 1920 });

    // 媒体服务地址 - 通过 API Gateway 代理，使用相对路径
    // 这样无论前端部署在哪里，都会请求同源的 API Gateway
    const mediaServiceUrl = '';

    /** 发送控制消息 */
    const sendControlMessage = useCallback(
      (msg: Omit<ControlMessage, 'deviceId' | 'timestamp'>) => {
        if (dcRef.current?.readyState === 'open') {
          const fullMsg: ControlMessage = {
            ...msg,
            deviceId: deviceSerial,
            timestamp: Date.now(),
          };
          dcRef.current.send(JSON.stringify(fullMsg));
        } else {
          console.warn('DataChannel not ready, state:', dcRef.current?.readyState);
        }
      },
      [deviceSerial]
    );

    /** 处理触摸事件 */
    const handleTouchEvent = useCallback(
      (
        action: 'down' | 'move' | 'up' | 'tap',
        clientX: number,
        clientY: number
      ) => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const rect = video.getBoundingClientRect();

        // 计算视频实际显示区域（考虑 object-fit: contain）
        const videoAspect = videoSize.width / videoSize.height;
        const containerAspect = rect.width / rect.height;

        let displayWidth: number, displayHeight: number;
        let offsetX = 0,
          offsetY = 0;

        if (videoAspect > containerAspect) {
          // 视频更宽，左右有黑边
          displayWidth = rect.width;
          displayHeight = rect.width / videoAspect;
          offsetY = (rect.height - displayHeight) / 2;
        } else {
          // 视频更高，上下有黑边
          displayHeight = rect.height;
          displayWidth = rect.height * videoAspect;
          offsetX = (rect.width - displayWidth) / 2;
        }

        // 计算相对于视频显示区域的坐标
        const relX = clientX - rect.left - offsetX;
        const relY = clientY - rect.top - offsetY;

        // 转换为设备坐标
        const x = (relX / displayWidth) * videoSize.width;
        const y = (relY / displayHeight) * videoSize.height;

        // 检查是否在有效范围内
        if (x < 0 || x > videoSize.width || y < 0 || y > videoSize.height) {
          return;
        }

        sendControlMessage({
          type: 'touch',
          action,
          x: Math.round(x),
          y: Math.round(y),
        });
      },
      [videoSize, sendControlMessage]
    );

    /** 发送按键事件 */
    const sendKeyEvent = useCallback(
      (keyCode: number, longPress = false) => {
        sendControlMessage({
          type: 'key',
          action: longPress ? 'longpress' : 'press',
          keyCode,
        });
      },
      [sendControlMessage]
    );

    /** 建立 WebRTC 连接 */
    const connect = useCallback(async () => {
      if (!deviceSerial) return;

      setLoading(true);
      setError(null);
      setConnectionState('connecting');

      try {
        // 1. 创建 WebRTC session
        const token = localStorage.getItem('token');
        const createRes = await fetch(`${mediaServiceUrl}/api/media/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceId: deviceSerial,
            userId: 'scan-user', // 临时用户 ID
          }),
        });

        if (!createRes.ok) {
          throw new Error(`Failed to create session: ${createRes.status}`);
        }

        const { sessionId: sid, offer } = await createRes.json();
        setSessionId(sid);

        // 2. 创建 RTCPeerConnection
        const pc = new RTCPeerConnection(WEBRTC_CONFIG);
        pcRef.current = pc;

        // 处理视频轨道
        pc.ontrack = (event) => {
          console.log('Received track:', event.track.kind);
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            setLoading(false);
          }
        };

        // 处理 DataChannel
        pc.ondatachannel = (event) => {
          console.log('DataChannel received:', event.channel.label);
          dcRef.current = event.channel;

          event.channel.onopen = () => {
            console.log('DataChannel opened');
          };

          event.channel.onclose = () => {
            console.log('DataChannel closed');
          };

          event.channel.onerror = (err) => {
            console.error('DataChannel error:', err);
          };
        };

        // 处理 ICE candidates
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await fetch(`${mediaServiceUrl}/api/media/sessions/ice-candidate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  sessionId: sid,
                  candidate: event.candidate,
                }),
              });
            } catch (err) {
              console.warn('Failed to send ICE candidate:', err);
            }
          }
        };

        // 处理连接状态
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          console.log('Connection state:', state);
          setConnectionState(state);

          if (state === 'connected') {
            setLoading(false);
            setError(null);
          } else if (state === 'failed' || state === 'disconnected') {
            setError('连接断开');
          }
        };

        // 3. 设置远程 offer
        await pc.setRemoteDescription(offer);

        // 4. 创建并发送 answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await fetch(`${mediaServiceUrl}/api/media/sessions/answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: sid,
            answer: answer,
          }),
        });
      } catch (err) {
        console.error('Connection error:', err);
        setError(err instanceof Error ? err.message : '连接失败');
        setLoading(false);
      }
    }, [deviceSerial, mediaServiceUrl]);

    /** 断开连接 */
    const disconnect = useCallback(async () => {
      // 关闭 DataChannel
      if (dcRef.current) {
        dcRef.current.close();
        dcRef.current = null;
      }

      // 关闭 PeerConnection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      // 关闭会话
      if (sessionId) {
        const token = localStorage.getItem('token');
        try {
          await fetch(`${mediaServiceUrl}/api/media/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (err) {
          console.warn('Failed to close session:', err);
        }
      }

      // 停止视频流
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      setSessionId(null);
      setConnectionState('disconnected');
    }, [sessionId, mediaServiceUrl]);

    /** 重新连接 */
    const reconnect = useCallback(async () => {
      await disconnect();
      setTimeout(connect, 500);
    }, [disconnect, connect]);

    /** 切换全屏 */
    const toggleFullscreen = useCallback(() => {
      if (!containerRef.current) return;

      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }, []);

    // 监听视频元数据获取原始尺寸
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleLoadedMetadata = () => {
        setVideoSize({
          width: video.videoWidth || 1080,
          height: video.videoHeight || 1920,
        });
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }, []);

    // 打开时连接
    useEffect(() => {
      if (visible && deviceSerial) {
        connect();
      }
      return () => {
        if (!visible) {
          disconnect();
        }
      };
    }, [visible, deviceSerial]);

    // 关闭时清理
    const handleClose = useCallback(() => {
      disconnect();
      onClose();
    }, [disconnect, onClose]);

    // 鼠标事件处理
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        handleTouchEvent('down', e.clientX, e.clientY);
      },
      [handleTouchEvent]
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (isDragging) {
          handleTouchEvent('move', e.clientX, e.clientY);
        }
      },
      [isDragging, handleTouchEvent]
    );

    const handleMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (isDragging) {
          setIsDragging(false);
          handleTouchEvent('up', e.clientX, e.clientY);
        }
      },
      [isDragging, handleTouchEvent]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        // 只有非拖动时才触发 tap
        if (!isDragging) {
          handleTouchEvent('tap', e.clientX, e.clientY);
        }
      },
      [isDragging, handleTouchEvent]
    );

    return (
      <Modal
        title={
          <Space>
            <span>屏幕映射</span>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {deviceName || deviceSerial}
            </Text>
          </Space>
        }
        open={visible}
        onCancel={handleClose}
        footer={null}
        width={500}
        centered
        destroyOnClose
      >
        <div ref={containerRef}>
          {/* 视频区域 */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: '177.78%', // 9:16 比例（竖屏）
              backgroundColor: '#000',
              borderRadius: 8,
              overflow: 'hidden',
              cursor: connectionState === 'connected' ? 'crosshair' : 'default',
            }}
          >
            {loading && (
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
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: '#fff',
                }}
              >
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>正在连接 {deviceSerial}...</div>
              </div>
            )}

            {error && (
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
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  color: '#ff4d4f',
                }}
              >
                <DisconnectOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>{error}</div>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={reconnect}
                  style={{ marginTop: 16 }}
                >
                  重新连接
                </Button>
              </div>
            )}

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
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleClick}
            />
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* 控制按钮 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Tooltip title="返回">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => sendKeyEvent(KEYCODE.BACK)}
                disabled={connectionState !== 'connected'}
              />
            </Tooltip>

            <Tooltip title="主页">
              <Button
                icon={<HomeOutlined />}
                onClick={() => sendKeyEvent(KEYCODE.HOME)}
                disabled={connectionState !== 'connected'}
              />
            </Tooltip>

            <Tooltip title="菜单">
              <Button
                icon={<MenuOutlined />}
                onClick={() => sendKeyEvent(KEYCODE.MENU)}
                disabled={connectionState !== 'connected'}
              />
            </Tooltip>

            <Tooltip title="电源（长按）">
              <Button
                icon={<PoweroffOutlined />}
                onClick={() => sendKeyEvent(KEYCODE.POWER, true)}
                disabled={connectionState !== 'connected'}
              />
            </Tooltip>

            <Tooltip title="音量+">
              <Button
                icon={<SoundOutlined />}
                onClick={() => sendKeyEvent(KEYCODE.VOLUME_UP)}
                disabled={connectionState !== 'connected'}
              >
                +
              </Button>
            </Tooltip>

            <Tooltip title="音量-">
              <Button
                icon={<SoundOutlined />}
                onClick={() => sendKeyEvent(KEYCODE.VOLUME_DOWN)}
                disabled={connectionState !== 'connected'}
              >
                -
              </Button>
            </Tooltip>

            <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
              <Button
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                onClick={toggleFullscreen}
              />
            </Tooltip>

            <Tooltip title="重新连接">
              <Button
                icon={<ReloadOutlined />}
                onClick={reconnect}
                loading={loading}
              />
            </Tooltip>
          </div>

          {/* 状态提示 */}
          <div
            style={{
              marginTop: 12,
              textAlign: 'center',
              color: NEUTRAL_LIGHT.text.tertiary,
              fontSize: 12,
            }}
          >
            {connectionState === 'connected' && '点击或拖动屏幕进行操作'}
            {connectionState === 'connecting' && '正在建立连接...'}
            {connectionState === 'failed' && '连接失败，请点击重新连接'}
          </div>
        </div>
      </Modal>
    );
  }
);

ScreenMirrorModal.displayName = 'ScreenMirrorModal';
