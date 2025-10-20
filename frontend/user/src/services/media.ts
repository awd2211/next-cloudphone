import request from '@/utils/request';

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
export const createSession = (data: CreateSessionDto) => {
  return request.post<WebRTCSession>('/media/sessions', data);
};

// 设置 Answer
export const setAnswer = (data: SetAnswerDto) => {
  return request.post('/media/sessions/answer', data);
};

// 添加 ICE 候选
export const addICECandidate = (data: AddICECandidateDto) => {
  return request.post('/media/sessions/ice-candidate', data);
};

// 获取会话
export const getSession = (id: string) => {
  return request.get<WebRTCSession>(`/media/sessions/${id}`);
};

// 关闭会话
export const closeSession = (id: string) => {
  return request.delete(`/media/sessions/${id}`);
};

// 获取统计信息
export const getMediaStats = () => {
  return request.get('/media/stats');
};
