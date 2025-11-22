/**
 * 应用管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import request from '@/utils/request';
import type {
  Application,
  DeviceApplication,
  InstallAppDto,
  PaginationParams,
  PaginatedResponse,
  CursorPaginationParams,
  CursorPaginatedResponse,
  AppReviewRecord,
  ApproveAppDto,
  RejectAppDto,
  RequestChangesDto,
} from '@/types';

// 应用列表 (传统偏移分页)
export const getApps = (params?: PaginationParams): Promise<PaginatedResponse<Application>> =>
  api.get<PaginatedResponse<Application>>('/apps', { params });

// 应用列表 (游标分页 - 高性能)
export const getAppsCursor = (
  params?: CursorPaginationParams & {
    tenantId?: string;
    category?: string;
  }
): Promise<CursorPaginatedResponse<Application>> =>
  api.get<CursorPaginatedResponse<Application>>('/apps/cursor', { params });

// 获取应用详情
export const getApp = (id: string): Promise<Application> =>
  api.get<Application>(`/apps/${id}`);

// 上传应用 (使用 raw request 因为需要 FormData)
export const uploadApp = (file: File, onProgress?: (percent: number) => void): Promise<Application> => {
  const formData = new FormData();
  formData.append('file', file);

  return request.post<Application>('/apps/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
};

// 更新应用
export const updateApp = (id: string, data: Partial<Application>): Promise<Application> =>
  api.patch<Application>(`/apps/${id}`, data);

// 删除应用
export const deleteApp = (id: string): Promise<void> =>
  api.delete<void>(`/apps/${id}`);

// 发布应用
export const publishApp = (id: string): Promise<void> =>
  api.post<void>(`/apps/${id}/publish`);

// 取消发布应用
export const unpublishApp = (id: string): Promise<void> =>
  api.post<void>(`/apps/${id}/unpublish`);

// 安装应用到设备
export const installAppToDevice = (data: InstallAppDto): Promise<DeviceApplication> =>
  api.post<DeviceApplication>('/apps/install', data);

// 卸载设备应用
export const uninstallAppFromDevice = (deviceId: string, applicationId: string): Promise<void> =>
  api.post<void>(`/apps/uninstall`, { deviceId, applicationId });

// 获取设备已安装应用
export const getDeviceApps = (deviceId: string): Promise<DeviceApplication[]> =>
  api.get<DeviceApplication[]>(`/apps/devices/${deviceId}/apps`);

// 应用统计
export const getAppStats = (): Promise<{
  total: number;
  categories: Record<string, number>;
}> =>
  api.get<{
    total: number;
    categories: Record<string, number>;
  }>('/apps/stats');

// ========== 应用审核相关 API ==========

// 获取待审核应用列表
export const getPendingApps = (params?: PaginationParams): Promise<PaginatedResponse<Application>> =>
  api.get<PaginatedResponse<Application>>('/apps', {
    params: { ...params, reviewStatus: 'pending' },
  });

// 提交应用审核
export const submitAppForReview = (id: string): Promise<void> =>
  api.post<void>(`/apps/${id}/submit-review`);

// 批准应用
export const approveApp = (id: string, data?: ApproveAppDto): Promise<void> =>
  api.post<void>(`/apps/${id}/approve`, data);

// 拒绝应用
export const rejectApp = (id: string, data: RejectAppDto): Promise<void> =>
  api.post<void>(`/apps/${id}/reject`, data);

// 请求修改
export const requestAppChanges = (id: string, data: RequestChangesDto): Promise<void> =>
  api.post<void>(`/apps/${id}/request-changes`, data);

// 获取审核记录
export const getAppReviewRecords = (
  params?: PaginationParams & { applicationId?: string }
): Promise<PaginatedResponse<AppReviewRecord>> =>
  api.get<PaginatedResponse<AppReviewRecord>>('/apps/audit-records', { params });

// 获取单个应用的审核记录
export const getAppReviewHistory = (applicationId: string): Promise<AppReviewRecord[]> =>
  api.get<AppReviewRecord[]>(`/apps/${applicationId}/reviews`);
