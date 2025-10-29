import request from '@/utils/request';
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
export const getTemplates = (params?: PaginationParams & { category?: string; isPublic?: boolean; search?: string }) => {
  return request.get<PaginatedResponse<DeviceTemplate>>('/templates', { params });
};

// 获取热门模板
export const getPopularTemplates = () => {
  return request.get<DeviceTemplate[]>('/templates/popular');
};

// 搜索模板
export const searchTemplates = (keyword: string, params?: PaginationParams) => {
  return request.get<PaginatedResponse<DeviceTemplate>>('/templates/search', {
    params: { keyword, ...params },
  });
};

// 获取模板详情
export const getTemplate = (id: string) => {
  return request.get<DeviceTemplate>(`/templates/${id}`);
};

// 创建模板
export const createTemplate = (data: CreateTemplateDto) => {
  return request.post<DeviceTemplate>('/templates', data);
};

// 从现有设备创建模板
export const createTemplateFromDevice = (deviceId: string, data: Omit<CreateTemplateDto, 'androidVersion' | 'cpuCores' | 'memoryMB' | 'storageMB'>) => {
  return request.post<DeviceTemplate>(`/templates/from-device/${deviceId}`, data);
};

// 更新模板
export const updateTemplate = (id: string, data: UpdateTemplateDto) => {
  return request.patch<DeviceTemplate>(`/templates/${id}`, data);
};

// 删除模板
export const deleteTemplate = (id: string) => {
  return request.delete(`/templates/${id}`);
};

// 从模板创建设备
export const createDeviceFromTemplate = (id: string, data: Omit<CreateDeviceFromTemplateDto, 'templateId'>) => {
  return request.post<Device>(`/templates/${id}/create-device`, data);
};

// 从模板批量创建设备
export const batchCreateDevicesFromTemplate = (id: string, data: Omit<CreateDeviceFromTemplateDto, 'templateId'> & { count: number }) => {
  return request.post<Device[]>(`/templates/${id}/batch-create`, data);
};

// 获取模板统计
export const getTemplateStats = () => {
  return request.get<{
    totalTemplates: number;
    publicTemplates: number;
    privateTemplates: number;
    totalUsage: number;
  }>('/templates/stats');
};
