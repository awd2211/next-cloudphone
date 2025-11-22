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
