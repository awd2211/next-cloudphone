import request from '@/utils/request';

// 获取设备的所有快照
export const getDeviceSnapshots = (deviceId: string) => {
  return request.get(`/snapshots/device/${deviceId}`);
};

// 创建快照
export const createSnapshot = (deviceId: string, data: { name: string; description?: string }) => {
  return request.post(`/snapshots/device/${deviceId}`, data);
};

// 恢复快照
export const restoreSnapshot = (snapshotId: string) => {
  return request.post(`/snapshots/${snapshotId}/restore`, {});
};

// 删除快照
export const deleteSnapshot = (snapshotId: string) => {
  return request.delete(`/snapshots/${snapshotId}`);
};

// 获取快照详情
export const getSnapshot = (snapshotId: string) => {
  return request.get(`/snapshots/${snapshotId}`);
};

// 获取用户的所有快照
export const getUserSnapshots = () => {
  return request.get('/snapshots');
};
