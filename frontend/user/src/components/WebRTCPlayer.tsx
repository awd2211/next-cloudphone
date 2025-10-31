import { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, message, Spin, Alert, Statistic, Row, Col, Tag, Badge } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  DashboardOutlined,
  SignalFilled,
} from '@ant-design/icons';
import { createSession, closeSession } from '@/services/media';

interface WebRTCPlayerProps {
  deviceId: string;
  showStats?: boolean; // 是否显示统计信息
}

interface ConnectionStats {
  bytesReceived: number;
  packetsReceived: number;
  packetsLost: number;
  jitter: number;
  rtt: number;
  bitrate: number;
  fps: number;
  resolution: string;
  codec: string;
}

type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor';

const WebRTCPlayer = ({ deviceId, showStats = true }: WebRTCPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const statsIntervalRef = useRef<number | null>(null);
  const lastBytesRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('good');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const maxReconnectAttempts = 5;

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
        } else if (pc.connectionState === 'failed') {
          setIsConnected(false);
          setIsConnecting(false);
          setError('连接失败');
          message.error('WebRTC 连接失败');
          autoReconnect();
        } else if (pc.connectionState === 'disconnected') {
          setIsConnected(false);
          setIsConnecting(false);
          message.warning('连接已断开');
          autoReconnect();
        } else if (pc.connectionState === 'closed') {
          setIsConnected(false);
          setIsConnecting(false);
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

  // 收集统计信息
  const collectStats = async () => {
    if (!pcRef.current || !isConnected) return;

    try {
      const stats = await pcRef.current.getStats();
      let bytesReceived = 0;
      let packetsReceived = 0;
      let packetsLost = 0;
      let jitter = 0;
      let rtt = 0;
      let resolution = '';
      let codec = '';
      let fps = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          bytesReceived = report.bytesReceived || 0;
          packetsReceived = report.packetsReceived || 0;
          packetsLost = report.packetsLost || 0;
          jitter = report.jitter || 0;
          codec = report.mimeType || '';
          fps = report.framesPerSecond || 0;

          // 计算分辨率
          if (report.frameWidth && report.frameHeight) {
            resolution = `${report.frameWidth}x${report.frameHeight}`;
          }
        }

        // 获取 RTT
        if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
          rtt = report.roundTripTime || 0;
        }
      });

      // 计算比特率 (bps)
      const bytesDiff = bytesReceived - lastBytesRef.current;
      const bitrate = Math.round((bytesDiff * 8) / 1); // 每秒比特率
      lastBytesRef.current = bytesReceived;

      // 计算网络质量
      let quality: NetworkQuality = 'excellent';
      const packetLossRate =
        packetsReceived > 0 ? packetsLost / (packetsReceived + packetsLost) : 0;

      if (rtt > 200 || packetLossRate > 0.05 || bitrate < 500000) {
        quality = 'poor';
      } else if (rtt > 100 || packetLossRate > 0.02 || bitrate < 1000000) {
        quality = 'fair';
      } else if (rtt > 50 || packetLossRate > 0.01 || bitrate < 2000000) {
        quality = 'good';
      }

      setNetworkQuality(quality);
      setStats({
        bytesReceived,
        packetsReceived,
        packetsLost,
        jitter,
        rtt: Math.round(rtt * 1000), // 转换为毫秒
        bitrate,
        fps,
        resolution,
        codec,
      });
    } catch (err) {
      console.error('收集统计信息失败:', err);
    }
  };

  // 自动重连
  const autoReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      message.error(`重连失败 ${maxReconnectAttempts} 次，请手动重试`);
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // 指数退避，最大 30 秒
    message.info(
      `${delay / 1000} 秒后自动重连... (${reconnectAttempts + 1}/${maxReconnectAttempts})`
    );

    reconnectTimeoutRef.current = window.setTimeout(() => {
      setReconnectAttempts((prev) => prev + 1);
      createPeerConnection();
    }, delay);
  };

  // 启动统计收集
  useEffect(() => {
    if (isConnected) {
      statsIntervalRef.current = window.setInterval(collectStats, 1000);
      setReconnectAttempts(0); // 连接成功后重置重连计数
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [isConnected]);

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // 获取网络质量颜色和文字
  const getQualityConfig = (quality: NetworkQuality) => {
    switch (quality) {
      case 'excellent':
        return { color: '#52c41a', text: '优秀', icon: 4 };
      case 'good':
        return { color: '#1890ff', text: '良好', icon: 3 };
      case 'fair':
        return { color: '#faad14', text: '一般', icon: 2 };
      case 'poor':
        return { color: '#ff4d4f', text: '较差', icon: 1 };
    }
  };

  const qualityConfig = getQualityConfig(networkQuality);

  return (
    <Card
      title="设备画面"
      extra={
        <Space>
          {!isConnected && !isConnecting && (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={createPeerConnection}>
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
        <div style={{ marginTop: 16 }}>
          <Space split="|">
            <Badge status="success" text="已连接 - 实时画面传输中" />
            <Space>
              <SignalFilled style={{ color: qualityConfig.color }} />
              <span style={{ color: qualityConfig.color }}>网络质量: {qualityConfig.text}</span>
            </Space>
            {showStats && (
              <Button
                size="small"
                icon={<DashboardOutlined />}
                onClick={() => setShowStatsPanel(!showStatsPanel)}
              >
                {showStatsPanel ? '隐藏' : '显示'}统计
              </Button>
            )}
          </Space>
        </div>
      )}

      {/* 统计信息面板 */}
      {isConnected && showStatsPanel && stats && (
        <Card size="small" title="连接统计" style={{ marginTop: 16 }} bodyStyle={{ padding: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="比特率"
                value={(stats.bitrate / 1000000).toFixed(2)}
                suffix="Mbps"
                precision={2}
              />
            </Col>
            <Col span={6}>
              <Statistic title="帧率" value={stats.fps} suffix="FPS" />
            </Col>
            <Col span={6}>
              <Statistic title="延迟 (RTT)" value={stats.rtt} suffix="ms" />
            </Col>
            <Col span={6}>
              <Statistic
                title="抖动"
                value={(stats.jitter * 1000).toFixed(1)}
                suffix="ms"
                precision={1}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="丢包率"
                value={
                  stats.packetsReceived > 0
                    ? (
                        (stats.packetsLost / (stats.packetsReceived + stats.packetsLost)) *
                        100
                      ).toFixed(2)
                    : '0.00'
                }
                suffix="%"
              />
            </Col>
            <Col span={6}>
              <Statistic title="分辨率" value={stats.resolution || 'N/A'} />
            </Col>
            <Col span={6}>
              <Statistic
                title="接收数据"
                value={(stats.bytesReceived / 1024 / 1024).toFixed(2)}
                suffix="MB"
                precision={2}
              />
            </Col>
            <Col span={6}>
              <Statistic title="编解码器" value={stats.codec.split('/')[1] || 'N/A'} />
            </Col>
          </Row>
        </Card>
      )}
    </Card>
  );
};

export default WebRTCPlayer;
