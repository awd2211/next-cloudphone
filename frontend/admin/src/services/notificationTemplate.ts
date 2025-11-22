/**
 * 通知模板管理 API
 * 使用 api 包装器自动解包响应
 *
 * 注意：使用 /notification-templates 路径以区分设备模板 (/templates)
 * API Gateway 路由：
 *   - /templates/* → device-service (设备模板)
 *   - /notification-templates/* → notification-service (通知模板)
 */
import { api } from '@/utils/api';
import type {
  NotificationTemplate,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  NotificationTemplateVersion,
  TemplateTestRequest,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// API 基础路径
const BASE_PATH = '/notification-templates';

// ========== 模板管理 ==========

// 获取模板列表
export const getNotificationTemplates = (
  params?: PaginationParams & {
    type?: string;
    language?: string;
    category?: string;
    isActive?: boolean;
  }
): Promise<PaginatedResponse<NotificationTemplate>> =>
  api.get<PaginatedResponse<NotificationTemplate>>(BASE_PATH, {
    params,
  });

// 获取模板详情
export const getNotificationTemplate = (id: string): Promise<NotificationTemplate> =>
  api.get<NotificationTemplate>(`${BASE_PATH}/${id}`);

// 创建模板
export const createNotificationTemplate = (
  data: CreateNotificationTemplateDto
): Promise<NotificationTemplate> =>
  api.post<NotificationTemplate>(BASE_PATH, data);

// 更新模板
export const updateNotificationTemplate = (
  id: string,
  data: UpdateNotificationTemplateDto
): Promise<NotificationTemplate> =>
  api.put<NotificationTemplate>(`${BASE_PATH}/${id}`, data);

// 删除模板
export const deleteNotificationTemplate = (id: string): Promise<void> =>
  api.delete(`${BASE_PATH}/${id}`);

// 激活/停用模板
export const toggleNotificationTemplate = (id: string, isActive: boolean): Promise<void> =>
  api.patch(`${BASE_PATH}/${id}/toggle`, { isActive });

// ========== 版本管理 ==========

// 获取模板版本历史
export const getTemplateVersions = (
  templateId: string
): Promise<NotificationTemplateVersion[]> =>
  api.get<NotificationTemplateVersion[]>(`${BASE_PATH}/${templateId}/versions`);

// 回滚到指定版本
export const revertTemplateVersion = (
  templateId: string,
  versionId: string
): Promise<void> =>
  api.post(`${BASE_PATH}/${templateId}/revert`, { versionId });

// ========== 测试发送 ==========

// 测试模板
export const testNotificationTemplate = (data: TemplateTestRequest): Promise<any> =>
  api.post(`${BASE_PATH}/test`, data);

// ========== 变量和预览 ==========

// 获取可用变量
export const getAvailableVariables = (type?: string): Promise<any> =>
  api.get(`${BASE_PATH}/variables`, { params: { type } });

// 预览模板渲染结果
export const previewTemplate = (
  templateId: string,
  variables: Record<string, any>
): Promise<any> =>
  api.post(`${BASE_PATH}/${templateId}/preview`, { variables });
