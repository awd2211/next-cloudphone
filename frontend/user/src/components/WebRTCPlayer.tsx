import { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, message, Spin, Alert } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { createSession, closeSession } from '@/services/media';

interface WebRTCPlayerProps {
  deviceId: string;
}

const WebRTCPlayer = ({ deviceId }: WebRTCPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ICE 服务器配置
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // 创建 WebRTC 连接
  const createPeerConnection = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // 创建 PeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // 设置视频元素
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // 连接状态变化
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
          message.success('设备画面连接成功');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setIsConnected(false);
          setError('连接失败，请重试');
        }
      };

      // ICE 候选
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'ice-candidate',
              sessionId: sessionIdRef.current,
              candidate: event.candidate.toJSON(),
            })
          );
        }
      };

      // 创建 Offer
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      // 发送 Offer 到服务器
      const session = await createSession({
        deviceId,
        offer: offer.sdp || '',
      });

      sessionIdRef.current = session.id;

      // 建立 WebSocket 连接以接收 Answer 和 ICE 候选
      connectWebSocket(session.id);
    } catch (err) {
      console.error('创建 WebRTC 连接失败:', err);
      setError('创建连接失败，请检查设备是否在线');
      setIsConnecting(false);
      message.error('连接失败');
    }
  };

  // 建立 WebSocket 连接
  const connectWebSocket = (sessionId: string) => {
    const wsUrl = `${import.meta.env.VITE_WS_URL}/api/media/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket 连接已建立');
      // 发送会话 ID
      ws.send(JSON.stringify({ type: 'join', sessionId }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'answer' && pcRef.current) {
        // 接收 SDP Answer
        await pcRef.current.setRemoteDescription({
          type: 'answer',
          sdp: data.answer,
        });
      } else if (data.type === 'ice-candidate' && pcRef.current) {
        // 接收 ICE 候选
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setError('WebSocket 连接失败');
    };

    ws.onclose = () => {
      console.log('WebSocket 连接已关闭');
    };
  };

  // 断开连接
  const disconnect = async () => {
    try {
      // 关闭 WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // 关闭 PeerConnection
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      // 停止视频流
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      // 关闭服务器会话
      if (sessionIdRef.current) {
        await closeSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }

      setIsConnected(false);
      setIsConnecting(false);
      message.info('已断开连接');
    } catch (err) {
      console.error('断开连接失败:', err);
    }
  };

  // 重新连接
  const reconnect = async () => {
    await disconnect();
    setTimeout(() => {
      createPeerConnection();
    }, 500);
  };

  // 全屏
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <Card
      title="设备画面"
      extra={
        <Space>
          {!isConnected && !isConnecting && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={createPeerConnection}
            >
              连接
            </Button>
          )}
          {isConnected && (
            <>
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
        </Space>
      }
    >
      <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: 8 }}>
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

        {isConnecting && (
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
              <span style={{ color: '#fff' }}>正在连接设备...</span>
            </Space>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            height: 'auto',
            minHeight: 400,
            backgroundColor: '#000',
            borderRadius: 8,
          }}
        />

        {!isConnected && !isConnecting && (
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
            <PlayCircleOutlined style={{ fontSize: 64, marginBottom: 16 }} />
            <div>点击"连接"按钮查看设备画面</div>
          </div>
        )}
      </div>

      {isConnected && (
        <div style={{ marginTop: 16, color: '#52c41a' }}>
          ● 已连接 - 实时画面传输中
        </div>
      )}
    </Card>
  );
};

export default WebRTCPlayer;
