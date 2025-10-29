export interface WebRTCServerConfig {
  iceServers: RTCIceServer[];
}

// 生产环境配置
export const productionWebRTCConfig: WebRTCServerConfig = {
  iceServers: [
    // Google STUN 服务器
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },
    // 自建 TURN 服务器 (需要配置)
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'your-username',
    //   credential: 'your-password',
    // },
  ],
};

// 开发环境配置
export const developmentWebRTCConfig: WebRTCServerConfig = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
  ],
};

export const getWebRTCConfig = (): WebRTCServerConfig => {
  return import.meta.env.PROD ? productionWebRTCConfig : developmentWebRTCConfig;
};
