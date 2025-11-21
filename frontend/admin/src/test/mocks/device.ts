import type { DeviceStatus } from '@/types';

/**
 * Mock 设备数据 - 仅包含 DeviceSchema 定义的字段
 */
export const mockDevice = {
  id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
  name: 'Test Device',
  userId: '1',
  status: 'running' as DeviceStatus,
  template: 'default-template',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

export const mockDevice2 = {
  id: '550e8400-e29b-41d4-a716-446655440002', // Valid UUID
  name: 'Test Device 2',
  userId: '1',
  status: 'stopped' as DeviceStatus,
  template: 'default-template',
  createdAt: '2025-01-02T00:00:00Z',
  updatedAt: '2025-01-02T12:00:00Z',
};

export const mockDevices = [mockDevice, mockDevice2];

/**
 * Mock 分页响应
 */
export const mockDevicesPage = {
  items: mockDevices,
  total: 2,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};
