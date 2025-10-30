import request from '@/utils/request';
import type {
  ApiKey,
  ApiKeyStatus,
  CreateApiKeyDto,
  UpdateApiKeyDto,
  ApiKeyStatistics,
} from '@/types';

/**
 * 创建 API 密钥
 */
export const createApiKey = (data: CreateApiKeyDto) => {
  return request.post<{
    success: boolean;
    message: string;
    data: ApiKey & { plainKey: string }; // 明文密钥仅在创建时返回一次
  }>('/api-keys', data);
};

/**
 * 获取用户的 API 密钥列表
 */
export const getUserApiKeys = (userId: string) => {
  return request.get<{
    success: boolean;
    data: ApiKey[];
    total: number;
  }>(`/api-keys/user/${userId}`);
};

/**
 * 获取 API 密钥详情
 */
export const getApiKeyById = (id: string) => {
  return request.get<{
    success: boolean;
    data: ApiKey;
  }>(`/api-keys/${id}`);
};

/**
 * 更新 API 密钥
 */
export const updateApiKey = (id: string, data: UpdateApiKeyDto) => {
  return request.put<{
    success: boolean;
    message: string;
    data: ApiKey;
  }>(`/api-keys/${id}`, data);
};

/**
 * 撤销 API 密钥
 */
export const revokeApiKey = (id: string) => {
  return request.post<{
    success: boolean;
    message: string;
    data: ApiKey;
  }>(`/api-keys/${id}/revoke`);
};

/**
 * 删除 API 密钥（管理员）
 */
export const deleteApiKey = (id: string) => {
  return request.delete<{
    success: boolean;
    message: string;
  }>(`/api-keys/${id}`);
};

/**
 * 获取 API 密钥统计
 */
export const getApiKeyStatistics = (userId: string) => {
  return request.get<{
    success: boolean;
    data: ApiKeyStatistics;
  }>(`/api-keys/statistics/${userId}`);
};

/**
 * 测试 API 密钥认证
 */
export const testApiKeyAuth = (apiKey: string) => {
  return request.get<{
    message: string;
    timestamp: string;
  }>('/api-keys/test/auth', {
    headers: {
      'X-API-Key': apiKey,
    },
  });
};
