import { useEffect, useRef, useState } from 'react';
import { message, Spin } from 'antd';

interface WebRTCPlayerProps {
  deviceId: string;
}

const WebRTCPlayer = ({ deviceId }: WebRTCPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:30006';
    const mediaServiceUrl = wsUrl.replace('ws://', '').replace('wss://', '');

    // 创建 WebSocket 连接到 Media Service
    const ws = new WebSocket(`${wsUrl}/ws/device/${deviceId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      initWebRTC();
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'offer') {
        // 收到 SDP offer
        await handleOffer(data.sdp);
      } else if (data.type === 'ice-candidate') {
        // 收到 ICE candidate
        if (peerConnectionRef.current && data.candidate) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket 连接失败');
      setLoading(false);
      message.error('无法连接到流媒体服务');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      cleanup();
    };

    return () => {
      cleanup();
    };
  }, [deviceId]);

  const initWebRTC = () => {
    // 创建 RTCPeerConnection
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // 处理接收到的流
    pc.ontrack = (event) => {
      console.log('Received track:', event.track.kind);
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        setLoading(false);
      }
    };

    // 处理 ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
          })
        );
      }
    };

    // 处理连接状态变化
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setLoading(false);
        setError(null);
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('连接失败');
        message.error('WebRTC 连接失败');
      }
    };

    // 请求开始流媒体传输
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'start-stream',
          deviceId,
        })
      );
    }
  };

  const handleOffer = async (sdp: string) => {
    if (!peerConnectionRef.current) return;

    try {
      // 设置远程描述（offer）
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription({
          type: 'offer',
          sdp,
        })
      );

      // 创建 answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // 发送 answer 到服务器
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'answer',
            sdp: answer.sdp,
          })
        );
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      setError('处理 SDP offer 失败');
      message.error('WebRTC 协商失败');
    }
  };

  const cleanup = () => {
    // 关闭 WebRTC 连接
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // 关闭 WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 停止视频流
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%', // 16:9 比例
        backgroundColor: '#000',
        borderRadius: 4,
        overflow: 'hidden',
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
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <Spin size="large" tip="正在连接设备屏幕..." />
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
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          {error}
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
      />
    </div>
  );
};

export default WebRTCPlayer;
