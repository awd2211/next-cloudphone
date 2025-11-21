import request from '@/utils/request';

/**
 * 媒体服务 API (Go/Gin 服务)
 *
 * ⚠️ 注意：后端使用 /api/media/... 路径
 */

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
// 后端路径: /api/media/sessions
export const createSession = (data: CreateSessionDto) => {
  return request.post<WebRTCSession>('/api/media/sessions', data);
};

// 设置 Answer
// 后端路径: /api/media/sessions/answer
export const setAnswer = (data: SetAnswerDto) => {
  return request.post('/api/media/sessions/answer', data);
};

// 添加 ICE 候选
// 后端路径: /api/media/sessions/ice-candidate
export const addICECandidate = (data: AddICECandidateDto) => {
  return request.post('/api/media/sessions/ice-candidate', data);
};

// 获取会话
// 后端路径: /api/media/sessions/:id
export const getSession = (id: string) => {
  return request.get<WebRTCSession>(`/api/media/sessions/${id}`);
};

// 关闭会话
// 后端路径: /api/media/sessions/:id
export const closeSession = (id: string) => {
  return request.delete(`/api/media/sessions/${id}`);
};

// 获取统计信息
// 后端路径: /api/media/stats
export const getMediaStats = () => {
  return request.get('/api/media/stats');
};

// 获取 WebSocket URL (用于实时通信)
export const getWebSocketUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl.replace(/^http/, 'ws')}/api/media/ws`;
};
