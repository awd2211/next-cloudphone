/**
 * 设备模板管理 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type {
  DeviceTemplate,
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateDeviceFromTemplateDto,
  PaginationParams,
  PaginatedResponse,
  Device,
} from '@/types';

// 获取模板列表
export const getTemplates = (
  params?: PaginationParams & { category?: string; isPublic?: boolean; search?: string }
): Promise<PaginatedResponse<DeviceTemplate>> =>
  api.get<PaginatedResponse<DeviceTemplate>>('/templates', { params });

// 获取热门模板
export const getPopularTemplates = (): Promise<DeviceTemplate[]> =>
  api.get<DeviceTemplate[]>('/templates/popular');

// 搜索模板
export const searchTemplates = (
  keyword: string,
  params?: PaginationParams
): Promise<PaginatedResponse<DeviceTemplate>> =>
  api.get<PaginatedResponse<DeviceTemplate>>('/templates/search', {
    params: { keyword, ...params },
  });

// 获取模板详情
export const getTemplate = (id: string): Promise<DeviceTemplate> =>
  api.get<DeviceTemplate>(`/templates/${id}`);

// 创建模板
export const createTemplate = (data: CreateTemplateDto): Promise<DeviceTemplate> =>
  api.post<DeviceTemplate>('/templates', data);

// 从现有设备创建模板
export const createTemplateFromDevice = (
  deviceId: string,
  data: Omit<CreateTemplateDto, 'androidVersion' | 'cpuCores' | 'memoryMB' | 'storageMB'>
): Promise<DeviceTemplate> =>
  api.post<DeviceTemplate>(`/templates/from-device/${deviceId}`, data);

// 更新模板
export const updateTemplate = (id: string, data: UpdateTemplateDto): Promise<DeviceTemplate> =>
  api.patch<DeviceTemplate>(`/templates/${id}`, data);

// 删除模板
export const deleteTemplate = (id: string): Promise<void> =>
  api.delete(`/templates/${id}`);

// 从模板创建设备
export const createDeviceFromTemplate = (
  id: string,
  data: Omit<CreateDeviceFromTemplateDto, 'templateId'>
): Promise<Device> =>
  api.post<Device>(`/templates/${id}/create-device`, data);

// 从模板批量创建设备
export const batchCreateDevicesFromTemplate = (
  id: string,
  data: Omit<CreateDeviceFromTemplateDto, 'templateId'> & { count: number }
): Promise<Device[]> =>
  api.post<Device[]>(`/templates/${id}/batch-create`, data);

// 获取模板统计
export const getTemplateStats = (): Promise<{
  totalTemplates: number;
  publicTemplates: number;
  privateTemplates: number;
  totalUsage: number;
}> =>
  api.get<{
    totalTemplates: number;
    publicTemplates: number;
    privateTemplates: number;
    totalUsage: number;
  }>('/templates/stats');
