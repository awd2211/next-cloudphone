import request from '@/utils/request';
import type {
  Device,
  CreateDeviceDto,
  UpdateDeviceDto,
  DeviceStats,
  PaginationParams,
  PaginatedResponse,
  ShellCommandDto,
  ShellCommandResult,
  DevicePackage,
  DeviceProperties,
} from '@/types';

// 设备列表
export const getDevices = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Device>>('/devices', { params });
};

// 获取设备详情
export const getDevice = (id: string) => {
  return request.get<Device>(`/devices/${id}`);
};

// 创建设备
export const createDevice = (data: CreateDeviceDto) => {
  return request.post<Device>('/devices', data);
};

// 更新设备
export const updateDevice = (id: string, data: UpdateDeviceDto) => {
  return request.patch<Device>(`/devices/${id}`, data);
};

// 删除设备
export const deleteDevice = (id: string) => {
  return request.delete(`/devices/${id}`);
};

// 启动设备
export const startDevice = (id: string) => {
  return request.post(`/devices/${id}/start`);
};

// 停止设备
export const stopDevice = (id: string) => {
  return request.post(`/devices/${id}/stop`);
};

// 重启设备
export const rebootDevice = (id: string) => {
  return request.post(`/devices/${id}/reboot`);
};

// 获取可用设备
export const getAvailableDevices = () => {
  return request.get<Device[]>('/devices/available');
};

// 设备统计
export const getDeviceStats = () => {
  return request.get<DeviceStats>('/devices/stats');
};

// ADB 操作 - 执行 Shell 命令
export const executeShellCommand = (id: string, data: ShellCommandDto) => {
  return request.post<ShellCommandResult>(`/devices/${id}/shell`, data);
};

// ADB 操作 - 截图
export const takeScreenshot = (id: string) => {
  return request.post<Blob>(`/devices/${id}/screenshot`, null, {
    responseType: 'blob',
  });
};

// ADB 操作 - 推送文件
export const pushFile = (id: string, localPath: string, remotePath: string) => {
  return request.post(`/devices/${id}/push`, { localPath, remotePath });
};

// ADB 操作 - 拉取文件
export const pullFile = (id: string, remotePath: string, localPath: string) => {
  return request.post(`/devices/${id}/pull`, { remotePath, localPath });
};

// ADB 操作 - 安装应用
export const installApp = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return request.post(`/devices/${id}/install`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// ADB 操作 - 卸载应用
export const uninstallApp = (id: string, packageName: string) => {
  return request.post(`/devices/${id}/uninstall`, { packageName });
};

// ADB 操作 - 获取已安装应用
export const getInstalledPackages = (id: string) => {
  return request.get<DevicePackage[]>(`/devices/${id}/packages`);
};

// ADB 操作 - 获取日志
export const getLogcat = (id: string, lines?: number) => {
  return request.get<string>(`/devices/${id}/logcat`, { params: { lines } });
};

// ADB 操作 - 清空日志
export const clearLogcat = (id: string) => {
  return request.post(`/devices/${id}/logcat/clear`);
};

// ADB 操作 - 获取设备属性
export const getDeviceProperties = (id: string) => {
  return request.get<DeviceProperties>(`/devices/${id}/properties`);
};

// 批量操作 - 批量启动设备
export const batchStartDevices = (ids: string[]) => {
  return request.post('/devices/batch/start', { ids });
};

// 批量操作 - 批量停止设备
export const batchStopDevices = (ids: string[]) => {
  return request.post('/devices/batch/stop', { ids });
};

// 批量操作 - 批量重启设备
export const batchRebootDevices = (ids: string[]) => {
  return request.post('/devices/batch/reboot', { ids });
};

// 批量操作 - 批量删除设备
export const batchDeleteDevices = (ids: string[]) => {
  return request.post('/devices/batch/delete', { ids });
};
