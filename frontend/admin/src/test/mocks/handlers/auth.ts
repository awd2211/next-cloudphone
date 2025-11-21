/**
 * MSW Handlers for Auth API
 */
import { http, HttpResponse } from 'msw';

// const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:30000';

export const mockCaptcha = {
  id: 'captcha-123',
  svg: '<svg>mock captcha</svg>',
};

export const mockLoginResponse = {
  success: true,
  token: 'mock-jwt-token',
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

export const mockCurrentUser = {
  id: '1',
  username: 'admin',
  email: 'admin@example.com',
  roles: ['admin'],
  isSuperAdmin: true,
};

export const authHandlers = [
  // GET /auth/captcha - 获取验证码
  http.get('*/auth/captcha', () => {
    return HttpResponse.json({
      success: true,
      data: mockCaptcha,
    });
  }),

  // POST /auth/login - 用户登录
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as any;

    // 模拟验证失败
    if (body.username === 'invalid') {
      return HttpResponse.json(
        {
          success: false,
          message: '用户名或密码错误',
        },
        { status: 401 }
      );
    }

    // 模拟验证码错误
    if (body.captcha !== 'correct' && body.captcha) {
      return HttpResponse.json(
        {
          success: false,
          message: '验证码错误',
        },
        { status: 400 }
      );
    }

    // 成功登录
    return HttpResponse.json({
      success: true,
      data: mockLoginResponse,
    });
  }),

  // POST /auth/logout - 退出登录
  http.post('*/auth/logout', () => {
    return HttpResponse.json({
      success: true,
      message: '退出成功',
    });
  }),

  // GET /auth/me - 获取当前用户
  http.get('*/auth/me', ({ request }) => {
    // 检查是否有 token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return HttpResponse.json(
        {
          success: false,
          message: '未登录',
        },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: mockCurrentUser,
    });
  }),

  // POST /auth/refresh - 刷新 token
  http.post('*/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      data: {
        token: 'new-mock-jwt-token',
        expiresIn: '7d',
      },
    });
  }),
];
