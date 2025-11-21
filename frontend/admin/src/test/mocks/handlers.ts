/**
 * MSW HTTP 请求处理器
 *
 * 定义测试环境中的 API mock 响应
 */

import { http, HttpResponse } from 'msw';

// API base URL
const API_URL = 'http://localhost:30000';

export const handlers = [
  // 用户相关 API
  http.get(`${API_URL}/users`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          {
            id: '1',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            username: 'user1',
            email: 'user1@example.com',
            role: 'user',
            status: 'active',
            createdAt: '2024-01-02T00:00:00Z',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      },
    });
  }),

  http.get(`${API_URL}/users/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: {
        id,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
      },
    });
  }),

  // 设备相关 API
  http.get(`${API_URL}/devices`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          {
            id: '1',
            name: 'Device 1',
            status: 'running',
            userId: '1',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: '2',
            name: 'Device 2',
            status: 'stopped',
            userId: '1',
            createdAt: '2024-01-02T00:00:00Z',
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      },
    });
  }),

  // 认证相关 API
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        token: 'mock-jwt-token',
        user: {
          id: '1',
          username: (body as any).username,
          role: 'admin',
        },
      },
    });
  }),

  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
      },
    });
  }),

  // 统计相关 API
  http.get(`${API_URL}/stats/overview`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalUsers: 100,
        totalDevices: 50,
        activeDevices: 30,
        totalRevenue: 10000,
      },
    });
  }),

  // 计费相关 API
  http.get(`${API_URL}/billing/orders`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          {
            id: '1',
            userId: '1',
            amount: 100,
            status: 'paid',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    });
  }),

  // 通知相关 API
  http.get(`${API_URL}/notifications`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          {
            id: '1',
            title: 'Test Notification',
            content: 'This is a test notification',
            type: 'info',
            read: false,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    });
  }),

  // 权限相关 API
  http.get(`${API_URL}/roles`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', name: 'Admin', permissions: ['all'] },
        { id: '2', name: 'User', permissions: ['read'] },
      ],
    });
  }),
];
