import request from '@/utils/request';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  NotificationTemplateVersion,
  TemplateTestRequest,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// ========== 模板管理 ==========

// 获取模板列表
export const getNotificationTemplates = (
  params?: PaginationParams & {
    type?: string;
    language?: string;
    category?: string;
    isActive?: boolean;
  }
) => {
  return request.get<PaginatedResponse<NotificationTemplate>>('/templates', {
    params,
  });
};

// 获取模板详情
export const getNotificationTemplate = (id: string) => {
  return request.get<NotificationTemplate>(`/templates/${id}`);
};

// 创建模板
export const createNotificationTemplate = (data: CreateNotificationTemplateDto) => {
  return request.post<NotificationTemplate>('/templates', data);
};

// 更新模板
export const updateNotificationTemplate = (id: string, data: UpdateNotificationTemplateDto) => {
  return request.put<NotificationTemplate>(`/templates/${id}`, data);
};

// 删除模板
export const deleteNotificationTemplate = (id: string) => {
  return request.delete(`/templates/${id}`);
};

// 激活/停用模板
export const toggleNotificationTemplate = (id: string, isActive: boolean) => {
  return request.patch(`/templates/${id}/toggle`, { isActive });
};

// ========== 版本管理 ==========

// 获取模板版本历史
export const getTemplateVersions = (templateId: string) => {
  return request.get<NotificationTemplateVersion[]>(`/templates/${templateId}/versions`);
};

// 回滚到指定版本
export const revertTemplateVersion = (templateId: string, versionId: string) => {
  return request.post(`/templates/${templateId}/revert`, { versionId });
};

// ========== 测试发送 ==========

// 测试模板
export const testNotificationTemplate = (data: TemplateTestRequest) => {
  return request.post('/templates/test', data);
};

// ========== 变量和预览 ==========

// 获取可用变量
export const getAvailableVariables = (type?: string) => {
  return request.get('/templates/variables', { params: { type } });
};

// 预览模板渲染结果
export const previewTemplate = (templateId: string, variables: Record<string, any>) => {
  return request.post(`/templates/${templateId}/preview`, { variables });
};
