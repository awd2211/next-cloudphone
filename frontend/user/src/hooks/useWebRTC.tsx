import { useState, useEffect, useRef, useCallback } from 'react';

export enum WebRTCConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  FAILED = 'failed',
  RECONNECTING = 'reconnecting',
}

export enum WebRTCQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  BAD = 'bad',
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  maxRetries?: number;
  retryDelay?: number;
  reconnectOnFailure?: boolean;
  enableStats?: boolean;
}

export interface WebRTCStats {
  rtt: number;
  jitter: number;
  packetLoss: number;
  bitrate: number;
  framesPerSecond: number;
  quality: WebRTCQuality;
}

interface UseWebRTCReturn {
  connectionState: WebRTCConnectionState;
  peerConnection: RTCPeerConnection | null;
  remoteStream: MediaStream | null;
  stats: WebRTCStats | null;
  error: Error | null;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  sendData: (data: any) => void;
}

export const useWebRTC = (config: WebRTCConfig): UseWebRTCReturn => {
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>(
    WebRTCConnectionState.IDLE
  );
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [stats, setStats] = useState<WebRTCStats | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const retryCountRef = useRef(0);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  // 创建 PeerConnection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: config.iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // 监听 ICE 候选
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] ICE Candidate:', event.candidate.type);
        sendIceCandidate(event.candidate);
      }
    };

    // 监听 ICE 连接状态
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE State:', pc.iceConnectionState);

      switch (pc.iceConnectionState) {
        case 'connected':
        case 'completed':
          setConnectionState(WebRTCConnectionState.CONNECTED);
          retryCountRef.current = 0;
          if (config.enableStats) {
            startStatsCollection();
          }
          break;
        case 'disconnected':
          setConnectionState(WebRTCConnectionState.DISCONNECTED);
          handleDisconnect();
          break;
        case 'failed':
          setConnectionState(WebRTCConnectionState.FAILED);
          handleFailure();
          break;
      }
    };

    // 监听远程流
    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote Track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // 创建数据通道
    const dataChannel = pc.createDataChannel('control', { ordered: true });
    dataChannel.onopen = () => console.log('[WebRTC] Data Channel Opened');
    dataChannel.onmessage = (event) => console.log('[WebRTC] Message:', event.data);

    dataChannelRef.current = dataChannel;
    peerConnectionRef.current = pc;

    return pc;
  }, [config.iceServers, config.enableStats]);

  // 连接到设备
  const connect = useCallback(
    async (deviceId: string) => {
      try {
        setConnectionState(WebRTCConnectionState.CONNECTING);
        setError(null);
        deviceIdRef.current = deviceId;

        const pc = createPeerConnection();

        // 创建 Offer
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        await pc.setLocalDescription(offer);

        // 发送 Offer 到后端
        const answer = await sendOffer(deviceId, offer);

        // 设置远程描述
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        console.log('[WebRTC] Connection initiated');
      } catch (err) {
        const error = err as Error;
        setError(error);
        setConnectionState(WebRTCConnectionState.FAILED);
        console.error('[WebRTC] Connection failed:', error);
      }
    },
    [createPeerConnection]
  );

  // 断开连接
  const disconnect = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setConnectionState(WebRTCConnectionState.IDLE);
    setRemoteStream(null);
    setStats(null);
    deviceIdRef.current = null;
  }, []);

  // 处理断线
  const handleDisconnect = useCallback(() => {
    if (config.reconnectOnFailure !== false) {
      setTimeout(() => {
        if (retryCountRef.current < (config.maxRetries || 3)) {
          reconnect();
        }
      }, 2000);
    }
  }, [config.reconnectOnFailure, config.maxRetries]);

  // 处理连接失败
  const handleFailure = useCallback(() => {
    if (config.reconnectOnFailure !== false && retryCountRef.current < (config.maxRetries || 3)) {
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
      retryCountRef.current++;

      setConnectionState(WebRTCConnectionState.RECONNECTING);

      setTimeout(() => {
        reconnect();
      }, delay);
    }
  }, [config.reconnectOnFailure, config.maxRetries]);

  // 重连
  const reconnect = useCallback(async () => {
    if (!deviceIdRef.current) return;

    console.log(`[WebRTC] Reconnecting (attempt ${retryCountRef.current + 1})...`);
    disconnect();
    await connect(deviceIdRef.current);
  }, [connect, disconnect]);

  // 发送数据
  const sendData = useCallback((data: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebRTC] Data channel not open');
    }
  }, []);

  // 收集统计信息
  const startStatsCollection = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current) return;

      try {
        const statsReport = await peerConnectionRef.current.getStats();
        const parsedStats = parseStats(statsReport);
        setStats(parsedStats);
      } catch (err) {
        console.error('[WebRTC] Failed to get stats:', err);
      }
    }, 1000);
  }, []);

  // 解析统计信息
  const parseStats = (statsReport: RTCStatsReport): WebRTCStats => {
    let rtt = 0;
    let jitter = 0;
    let packetLoss = 0;
    let bitrate = 0;
    let framesPerSecond = 0;

    statsReport.forEach((stat) => {
      if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        rtt = (stat.currentRoundTripTime || 0) * 1000;
      }

      if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
        jitter = (stat.jitter || 0) * 1000;
        packetLoss = ((stat.packetsLost || 0) / (stat.packetsReceived || 1)) * 100;
        bitrate = ((stat.bytesReceived || 0) * 8) / 1000;
        framesPerSecond = stat.framesPerSecond || 0;
      }
    });

    // 计算质量等级
    let quality: WebRTCQuality;
    if (rtt < 50 && packetLoss < 1) {
      quality = WebRTCQuality.EXCELLENT;
    } else if (rtt < 100 && packetLoss < 3) {
      quality = WebRTCQuality.GOOD;
    } else if (rtt < 200 && packetLoss < 5) {
      quality = WebRTCQuality.FAIR;
    } else if (rtt < 500 && packetLoss < 10) {
      quality = WebRTCQuality.POOR;
    } else {
      quality = WebRTCQuality.BAD;
    }

    return { rtt, jitter, packetLoss, bitrate, framesPerSecond, quality };
  };

  // 信令服务器通信
  const sendOffer = async (
    deviceId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> => {
    try {
      const response = await fetch(`/api/webrtc/${deviceId}/offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.answer;
    } catch (err) {
      console.error('[WebRTC] Failed to send offer:', err);
      throw err;
    }
  };

  const sendIceCandidate = async (candidate: RTCIceCandidate) => {
    if (!deviceIdRef.current) return;

    try {
      await fetch(`/api/webrtc/${deviceIdRef.current}/candidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate }),
      });
    } catch (err) {
      console.error('[WebRTC] Failed to send ICE candidate:', err);
    }
  };

  // 清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    peerConnection: peerConnectionRef.current,
    remoteStream,
    stats,
    error,
    connect,
    disconnect,
    reconnect,
    sendData,
  };
};
