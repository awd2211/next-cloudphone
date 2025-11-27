/**
 * Media 服务 API - WebRTC 和 TURN 凭证管理
 */
import { api } from '@/utils/api';

// Cloudflare TURN 凭证响应
export interface TurnCredentialsResponse {
  iceServers: RTCIceServer[];
}

// WebRTC 会话创建请求
export interface CreateSessionRequest {
  deviceId: string;
  userId?: string;
}

// WebRTC 会话响应
export interface CreateSessionResponse {
  sessionId: string;
  offer: RTCSessionDescriptionInit;
}

// ICE Candidate 请求
export interface IceCandidateRequest {
  sessionId: string;
  candidate: RTCIceCandidateInit;
}

// Answer 请求
export interface AnswerRequest {
  sessionId: string;
  answer: RTCSessionDescriptionInit;
}

// TURN 凭证缓存
let cachedTurnCredentials: TurnCredentialsResponse | null = null;
let cacheExpireTime: number = 0;

// 缓存有效期（23小时，因为 Cloudflare 默认 TTL 是 24 小时）
const CACHE_TTL_MS = 23 * 60 * 60 * 1000;

/**
 * 获取 Cloudflare TURN 凭证
 * 内置缓存机制，避免频繁调用 Cloudflare API
 */
export const getTurnCredentials = async (forceRefresh = false): Promise<TurnCredentialsResponse> => {
  const now = Date.now();

  // 如果缓存有效且不强制刷新，直接返回缓存
  if (!forceRefresh && cachedTurnCredentials && now < cacheExpireTime) {
    console.log('[Media] Using cached TURN credentials');
    return cachedTurnCredentials;
  }

  console.log('[Media] Fetching fresh TURN credentials from Cloudflare');

  try {
    const response = await api.get<TurnCredentialsResponse>('/api/media/turn-credentials');

    // 更新缓存
    cachedTurnCredentials = response;
    cacheExpireTime = now + CACHE_TTL_MS;

    return response;
  } catch (error) {
    console.error('[Media] Failed to get TURN credentials:', error);

    // 如果有缓存的凭证（即使过期），在出错时仍然使用
    if (cachedTurnCredentials) {
      console.warn('[Media] Using expired cached TURN credentials as fallback');
      return cachedTurnCredentials;
    }

    // 如果完全没有凭证，返回默认的 STUN 服务器
    return {
      iceServers: [
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };
  }
};

/**
 * 构建完整的 WebRTC 配置
 * 合并 TURN 凭证和默认 STUN 服务器
 */
export const buildWebRTCConfig = async (): Promise<RTCConfiguration> => {
  const turnCredentials = await getTurnCredentials();

  // 默认 STUN 服务器（作为备份）
  const defaultStunServers: RTCIceServer[] = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  // 合并 TURN 凭证和 STUN 服务器
  // Cloudflare 返回的 iceServers 已经包含 TURN 服务器
  const iceServers = turnCredentials.iceServers.length > 0
    ? [...turnCredentials.iceServers, ...defaultStunServers]
    : defaultStunServers;

  return {
    iceServers,
    // 强制使用 relay（TURN）可以确保穿透，但会增加延迟
    // 默认使用 'all' 让浏览器自动选择最优路径
    iceTransportPolicy: 'all',
  };
};

/**
 * 清除 TURN 凭证缓存
 * 用于在凭证失效时强制刷新
 */
export const clearTurnCredentialsCache = (): void => {
  cachedTurnCredentials = null;
  cacheExpireTime = 0;
  console.log('[Media] TURN credentials cache cleared');
};

/**
 * 创建 WebRTC 会话
 */
export const createMediaSession = (data: CreateSessionRequest): Promise<CreateSessionResponse> =>
  api.post<CreateSessionResponse>('/api/media/sessions', data);

/**
 * 发送 ICE candidate
 */
export const sendIceCandidate = (data: IceCandidateRequest): Promise<void> =>
  api.post<void>('/api/media/sessions/ice-candidate', data);

/**
 * 发送 Answer
 */
export const sendAnswer = (data: AnswerRequest): Promise<void> =>
  api.post<void>('/api/media/sessions/answer', data);

/**
 * 关闭会话
 */
export const closeMediaSession = (sessionId: string): Promise<void> =>
  api.delete<void>(`/api/media/sessions/${sessionId}`);
