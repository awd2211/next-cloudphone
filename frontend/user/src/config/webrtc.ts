import { buildWebRTCConfig as buildDynamicConfig } from '@/services/media';

export interface WebRTCServerConfig {
  iceServers: RTCIceServer[];
}

// 默认 STUN 服务器（用于静态配置或 TURN 获取失败时的降级）
export const defaultStunServers: RTCIceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// 静态配置（用于无法异步获取 TURN 凭证的场景）
export const staticWebRTCConfig: WebRTCServerConfig = {
  iceServers: defaultStunServers,
};

/**
 * 获取 WebRTC 配置
 * 推荐使用 getWebRTCConfigAsync() 以获取 TURN 凭证
 * @deprecated 使用 getWebRTCConfigAsync() 代替
 */
export const getWebRTCConfig = (): WebRTCServerConfig => {
  console.warn('[WebRTC] Using static config. Consider using getWebRTCConfigAsync() for TURN support.');
  return staticWebRTCConfig;
};

/**
 * 异步获取完整的 WebRTC 配置（包含 Cloudflare TURN 凭证）
 * 这是推荐的方式，支持 NAT 穿透
 */
export const getWebRTCConfigAsync = async (): Promise<RTCConfiguration> => {
  try {
    return await buildDynamicConfig();
  } catch (error) {
    console.error('[WebRTC] Failed to get dynamic config, using static:', error);
    return staticWebRTCConfig;
  }
};
