/**
 * 设备管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import request from '@/utils/request';

// 长时间运行的操作超时设置（3 分钟）
const LONG_RUNNING_TIMEOUT = 180000;
import type {
  Device,
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceStats,
  PaginationParams,
  PaginatedResponse,
  CursorPaginationParams,
  CursorPaginatedResponse,
  ShellCommandDto,
  ShellCommandResult,
  DevicePackage,
  DeviceProperties,
} from '@/types';

// 设备列表 (传统偏移分页)
export const getDevices = (params?: PaginationParams): Promise<PaginatedResponse<Device>> =>
  api.get<PaginatedResponse<Device>>('/devices', { params });

// 设备列表 (游标分页 - 高性能)
export const getDevicesCursor = (
  params?: CursorPaginationParams & {
    userId?: string;
    tenantId?: string;
    status?: string;
  }
): Promise<CursorPaginatedResponse<Device>> =>
  api.get<CursorPaginatedResponse<Device>>('/devices/cursor', { params });

// 获取设备详情
export const getDevice = (id: string): Promise<Device> =>
  api.get<Device>(`/devices/${id}`);

// 创建设备
export const createDevice = (data: CreateDeviceDto): Promise<Device> =>
  api.post<Device>('/devices', data);

// 更新设备
export const updateDevice = (id: string, data: UpdateDeviceDto): Promise<Device> =>
  api.patch<Device>(`/devices/${id}`, data);

// 删除设备
export const deleteDevice = (id: string): Promise<void> =>
  api.delete<void>(`/devices/${id}`);

// 启动设备
export const startDevice = (id: string): Promise<void> =>
  api.post<void>(`/devices/${id}/start`);

// 停止设备
export const stopDevice = (id: string): Promise<void> =>
  api.post<void>(`/devices/${id}/stop`);

// 重启设备
export const rebootDevice = (id: string): Promise<void> =>
  api.post<void>(`/devices/${id}/reboot`);

// 获取可用设备
export const getAvailableDevices = (): Promise<Device[]> =>
  api.get<Device[]>('/devices/available');

// 设备统计
export const getDeviceStats = (): Promise<DeviceStats> =>
  api.get<DeviceStats>('/devices/stats');

// ADB 操作 - 执行 Shell 命令
export const executeShellCommand = (id: string, data: ShellCommandDto): Promise<ShellCommandResult> =>
  api.post<ShellCommandResult>(`/devices/${id}/shell`, data);

// ADB 操作 - 截图 (使用 raw request 因为需要 blob 响应)
export const takeScreenshot = (id: string): Promise<Blob> =>
  request.post<Blob>(`/devices/${id}/screenshot`, null, {
    responseType: 'blob',
  });

// ADB 操作 - 推送文件
export const pushFile = (id: string, localPath: string, remotePath: string): Promise<void> =>
  api.post<void>(`/devices/${id}/push`, { localPath, remotePath });

// ADB 操作 - 拉取文件
export const pullFile = (id: string, remotePath: string, localPath: string): Promise<void> =>
  api.post<void>(`/devices/${id}/pull`, { remotePath, localPath });

// ADB 操作 - 安装应用 (使用 raw request 因为需要 FormData)
export const installApp = (id: string, file: File): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post(`/devices/${id}/install`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// ADB 操作 - 卸载应用
export const uninstallApp = (id: string, packageName: string): Promise<void> =>
  api.post<void>(`/devices/${id}/uninstall`, { packageName });

// ADB 操作 - 获取已安装应用
export const getInstalledPackages = (id: string): Promise<DevicePackage[]> =>
  api.get<DevicePackage[]>(`/devices/${id}/packages`);

// ADB 操作 - 获取日志
export const getLogcat = (id: string, lines?: number): Promise<string> =>
  api.get<string>(`/devices/${id}/logcat`, { params: { lines } });

// ADB 操作 - 清空日志
export const clearLogcat = (id: string): Promise<void> =>
  api.post<void>(`/devices/${id}/logcat/clear`);

// ADB 操作 - 获取设备属性
export const getDeviceProperties = (id: string): Promise<DeviceProperties> =>
  api.get<DeviceProperties>(`/devices/${id}/properties`);

// 批量操作 - 批量启动设备
export const batchStartDevices = (ids: string[]): Promise<void> =>
  api.post<void>('/devices/batch/start', { ids });

// 批量操作 - 批量停止设备
export const batchStopDevices = (ids: string[]): Promise<void> =>
  api.post<void>('/devices/batch/stop', { ids });

// 批量操作 - 批量重启设备
export const batchRebootDevices = (ids: string[]): Promise<void> =>
  api.post<void>('/devices/batch/reboot', { ids });

// 批量操作 - 批量删除设备
export const batchDeleteDevices = (ids: string[]): Promise<void> =>
  api.post<void>('/devices/batch/delete', { ids });

// ========== 多提供商相关 API ==========

// 获取设备连接信息
export const getDeviceConnectionInfo = (id: string) =>
  api.get<any>(`/devices/${id}/connection`);

// 获取 WebRTC 连接令牌
export const getWebRTCToken = (id: string): Promise<{ token: string; connectionInfo: any }> =>
  api.post<{ token: string; connectionInfo: any }>(`/devices/${id}/webrtc/token`);

// 刷新云设备状态
export const refreshCloudDevice = (id: string): Promise<void> =>
  api.post<void>(`/devices/${id}/cloud/refresh`);

// 物理设备相关 - 路径与后端 @Controller('admin/physical-devices') 匹配
export const getPhysicalDevices = (params?: { page?: number; pageSize?: number }) =>
  api.get('/admin/physical-devices', { params });

/**
 * 扫描网络设备 - 使用长超时时间
 * 扫描大网段可能需要数分钟，使用 3 分钟超时
 */
export const scanNetworkDevices = (params: {
  networkCidr: string;
  portStart?: number;
  portEnd?: number;
  concurrency?: number;
  timeoutMs?: number;
}) =>
  request.post('/admin/physical-devices/scan', params, {
    timeout: LONG_RUNNING_TIMEOUT,
  }).then((response: any) => {
    // 解包后端响应
    if (response?.success && response?.data) {
      return response.data;
    }
    return response;
  });

/**
 * 扫描网络设备 - 支持实时进度更新 (SSE)
 *
 * 返回一个 EventSource 用于接收实时扫描进度
 *
 * 安全说明：
 * - EventSource API 不支持自定义 HTTP 头
 * - 因此 JWT Token 需要通过 URL 查询参数传递
 * - 后端会验证 token 参数，无效则返回认证错误事件
 *
 * @param params 扫描参数
 * @param token JWT 认证 Token（从 localStorage 获取）
 * @returns EventSource 实例
 */
export const scanNetworkDevicesStream = (
  params: {
    networkCidr: string;
    portStart?: number;
    portEnd?: number;
    concurrency?: number;
    timeoutMs?: number;
  },
  token?: string
): EventSource => {
  // 获取 Token：优先使用传入的，否则从 localStorage 读取
  const authToken = token || localStorage.getItem('token') || '';

  const queryParams: Record<string, string> = {
    networkCidr: params.networkCidr,
    portStart: String(params.portStart || 5555),
    portEnd: String(params.portEnd || 5565),
    concurrency: String(params.concurrency || 50),
    timeoutMs: String(params.timeoutMs || 5000),
  };

  // 添加 Token（SSE 端点需要通过查询参数认证）
  if (authToken) {
    queryParams.token = authToken;
  }

  const queryString = new URLSearchParams(queryParams).toString();

  // SSE 通过 Vite 代理转发到 device-service
  // /device-sse 路径会被 Vite 代理到 localhost:30002
  return new EventSource(`/device-sse/admin/physical-devices/scan/stream?${queryString}`);
};

export const registerPhysicalDevice = (data: { serialNumber: string; name?: string }) =>
  api.post('/admin/physical-devices/register', data);

// ========== 阿里云云手机 ECP 相关 API ==========

export interface AliyunConnectionTicketResponse {
  success: boolean;
  message?: string;
  data?: {
    instanceId: string;
    ticket: string;
    taskId: string;
    taskStatus: string;
    expiresAt: string;
  };
}

export interface AliyunAdbInfo {
  adbServletAddress: string;
  adbEnabled: boolean;
}

/**
 * 获取阿里云云手机连接凭证
 * 凭证有效期 30 秒，需要及时使用
 */
export const getAliyunConnectionTicket = (deviceId: string) =>
  api.get<AliyunConnectionTicketResponse>(`/devices/${deviceId}/connection-ticket`);

/**
 * 开启阿里云云手机 ADB 连接
 */
export const enableAliyunAdb = (deviceId: string) =>
  api.post<void>(`/devices/${deviceId}/adb/enable`);

/**
 * 关闭阿里云云手机 ADB 连接
 */
export const disableAliyunAdb = (deviceId: string) =>
  api.post<void>(`/devices/${deviceId}/adb/disable`);

/**
 * 获取阿里云云手机 ADB 连接信息
 */
export const getAliyunAdbInfo = (deviceId: string) =>
  api.get<AliyunAdbInfo>(`/devices/${deviceId}/adb/info`);

/**
 * 测试获取阿里云云手机连接凭证
 * 直接使用阿里云实例 ID 获取连接凭证（无需在系统中创建设备）
 */
export const testAliyunConnectionTicket = (instanceId: string) =>
  api.post<AliyunConnectionTicketResponse>('/devices/test-aliyun-connection-ticket', {
    instanceId,
  });
