/**
 * 媒体服务 API (Go/Gin 服务)
 * 使用 api 包装器自动解包响应
 *
 * 注意：baseURL 已包含 /api，路径不需要再加 /api 前缀
 */
import { api } from '@/utils/api';

export interface WebRTCSession {
  id: string;
  deviceId: string;
  userId: string;
  offer: string;
  answer?: string;
  status: 'pending' | 'connected' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  deviceId: string;
  offer: string;
}

export interface SetAnswerDto {
  sessionId: string;
  answer: string;
}

export interface AddICECandidateDto {
  sessionId: string;
  candidate: RTCIceCandidateInit;
}

// Cloudflare TURN 凭证响应
export interface TurnCredentialsResponse {
  iceServers: RTCIceServer[];
}

// TURN 凭证缓存
let cachedTurnCredentials: TurnCredentialsResponse | null = null;
let cacheExpireTime = 0;
const CACHE_TTL_MS = 23 * 60 * 60 * 1000; // 23小时

/**
 * 获取 Cloudflare TURN 凭证（带缓存）
 */
export const getTurnCredentials = async (forceRefresh = false): Promise<TurnCredentialsResponse> => {
  const now = Date.now();

  if (!forceRefresh && cachedTurnCredentials && now < cacheExpireTime) {
    console.log('[Media] Using cached TURN credentials');
    return cachedTurnCredentials;
  }

  console.log('[Media] Fetching fresh TURN credentials from Cloudflare');

  try {
    const response = await api.get<TurnCredentialsResponse>('/media/turn-credentials');
    cachedTurnCredentials = response;
    cacheExpireTime = now + CACHE_TTL_MS;
    return response;
  } catch (error) {
    console.error('[Media] Failed to get TURN credentials:', error);

    if (cachedTurnCredentials) {
      console.warn('[Media] Using expired cached TURN credentials as fallback');
      return cachedTurnCredentials;
    }

    return {
      iceServers: [
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };
  }
};

/**
 * 构建完整的 WebRTC 配置（包含 TURN 凭证）
 */
export const buildWebRTCConfig = async (): Promise<RTCConfiguration> => {
  const turnCredentials = await getTurnCredentials();

  const defaultStunServers: RTCIceServer[] = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  const iceServers = turnCredentials.iceServers.length > 0
    ? [...turnCredentials.iceServers, ...defaultStunServers]
    : defaultStunServers;

  return {
    iceServers,
    iceTransportPolicy: 'all',
  };
};

/**
 * 清除 TURN 凭证缓存
 */
export const clearTurnCredentialsCache = (): void => {
  cachedTurnCredentials = null;
  cacheExpireTime = 0;
};

// 创建 WebRTC 会话
export const createSession = (data: CreateSessionDto) =>
  api.post<WebRTCSession>('/media/sessions', data);

// 设置 Answer
export const setAnswer = (data: SetAnswerDto) =>
  api.post('/media/sessions/answer', data);

// 添加 ICE 候选
export const addICECandidate = (data: AddICECandidateDto) =>
  api.post('/media/sessions/ice-candidate', data);

// 获取会话
export const getSession = (id: string) =>
  api.get<WebRTCSession>(`/media/sessions/${id}`);

// 关闭会话
export const closeSession = (id: string) =>
  api.delete(`/media/sessions/${id}`);

// 获取统计信息
export const getMediaStats = () =>
  api.get('/media/stats');

// 获取 WebSocket URL (用于实时通信)
export const getWebSocketUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl.replace(/^http/, 'ws')}/api/media/ws`;
};
