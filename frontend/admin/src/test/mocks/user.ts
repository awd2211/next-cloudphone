import type { User } from '@/types';
import { UserStatus } from '@/types';

/**
 * Mock 验证码数据
 */
export const mockCaptcha = {
  id: 'captcha-123',
  svg: '<svg>...</svg>',
};

/**
 * Mock 登录响应
 */
export const mockLoginResponse = {
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
  user: {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    roles: ['admin'],
    isSuperAdmin: true,
    tenantId: null,
    fullName: 'Admin User',
    avatar: null,
  },
};

/**
 * Mock 权限数据 - 符合 PermissionSchema
 */
export const mockPermission = {
  id: '650e8400-e29b-41d4-a716-446655440001',
  resource: 'users',
  action: 'read',
  description: 'Read users permission',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Mock 角色数据 - 符合 RoleSchema
 */
export const mockRole = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'admin',
  description: 'Administrator role',
  permissions: [mockPermission],  // 必须是 Permission 数组
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

/**
 * Mock 用户数据 - 符合 UserSchema 要求
 */
export const mockUser: User = {
  id: '550e8400-e29b-41d4-a716-446655440001',  // Valid UUID
  username: 'admin',
  email: 'admin@example.com',
  phone: '13800138000',  // 中国手机号格式
  balance: 1000,
  roles: [mockRole],
  status: UserStatus.ACTIVE,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockUser2: User = {
  id: '550e8400-e29b-41d4-a716-446655440002',  // Valid UUID
  username: 'user2',
  email: 'user2@example.com',
  phone: '13900139000',  // 中国手机号格式
  balance: 500,
  roles: [mockRole],
  status: UserStatus.ACTIVE,
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

export const mockUsers: User[] = [mockUser, mockUser2];

/**
 * Mock 分页响应
 */
export const mockUsersPage = {
  items: mockUsers,
  total: 2,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};
