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
export const getApps = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Application>>('/apps', { params });
};

// 应用列表 (游标分页 - 高性能)
export const getAppsCursor = (params?: CursorPaginationParams & {
  tenantId?: string;
  category?: string;
}) => {
  return request.get<CursorPaginatedResponse<Application>>('/apps/cursor', { params });
};

// 获取应用详情
export const getApp = (id: string) => {
  return request.get<Application>(`/apps/${id}`);
};

// 上传应用
export const uploadApp = (file: File, onProgress?: (percent: number) => void) => {
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

// 删除应用
export const deleteApp = (id: string) => {
  return request.delete(`/apps/${id}`);
};

// 安装应用到设备
export const installAppToDevice = (data: InstallAppDto) => {
  return request.post<DeviceApplication>('/apps/install', data);
};

// 卸载设备应用
export const uninstallAppFromDevice = (deviceId: string, applicationId: string) => {
  return request.post(`/apps/uninstall`, { deviceId, applicationId });
};

// 获取设备已安装应用
export const getDeviceApps = (deviceId: string) => {
  return request.get<DeviceApplication[]>(`/apps/devices/${deviceId}/apps`);
};

// 应用统计
export const getAppStats = () => {
  return request.get<{
    total: number;
    categories: Record<string, number>;
  }>('/apps/stats');
};

// ========== 应用审核相关 API ==========

// 获取待审核应用列表
export const getPendingApps = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Application>>('/apps', {
    params: { ...params, reviewStatus: 'pending' },
  });
};

// 提交应用审核
export const submitAppForReview = (id: string) => {
  return request.post(`/apps/${id}/submit-review`);
};

// 批准应用
export const approveApp = (id: string, data?: ApproveAppDto) => {
  return request.post(`/apps/${id}/approve`, data);
};

// 拒绝应用
export const rejectApp = (id: string, data: RejectAppDto) => {
  return request.post(`/apps/${id}/reject`, data);
};

// 请求修改
export const requestAppChanges = (id: string, data: RequestChangesDto) => {
  return request.post(`/apps/${id}/request-changes`, data);
};

// 获取审核记录
export const getAppReviewRecords = (params?: PaginationParams & { applicationId?: string }) => {
  return request.get<PaginatedResponse<AppReviewRecord>>('/apps/audit-records', { params });
};

// 获取单个应用的审核记录
export const getAppReviewHistory = (applicationId: string) => {
  return request.get<AppReviewRecord[]>(`/apps/${applicationId}/reviews`);
};
