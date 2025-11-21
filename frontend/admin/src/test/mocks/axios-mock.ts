/**
 * Axios Mock Adapter Configuration
 *
 * 使用 axios-mock-adapter 拦截 axios 请求
 * 这比 MSW 更适合测试 axios 请求
 */
import MockAdapter from 'axios-mock-adapter';
import request from '../../utils/request';
import { mockCaptcha, mockLoginResponse, mockUser, mockUsers } from './user';
import { mockDevice, mockDevices } from './device';
import { /* mockOrder, */ mockOrders } from './order';

// 创建 mock adapter (第二个参数 { delayResponse: 0 } 用于更快的测试)
export const axiosMock = new MockAdapter(request as any, { delayResponse: 0 });

/**
 * 配置所有 API mock handlers
 */
export const setupAxiosMock = () => {
  // ========== Auth API ==========

  // GET /auth/captcha
  axiosMock.onGet('/auth/captcha').reply(200, {
    success: true,
    data: mockCaptcha,
  });

  // POST /auth/login - 动态根据请求体返回不同结果
  axiosMock.onPost('/auth/login').reply((config) => {
    const body = JSON.parse(config.data || '{}');

    // 错误的用户名
    if (body.username === 'invalid') {
      return [
        401,
        {
          success: false,
          message: '用户名或密码错误',
        },
      ];
    }

    // 错误的验证码
    if (body.captcha === 'wrong') {
      return [
        400,
        {
          success: false,
          message: '验证码错误',
        },
      ];
    }

    // 成功登录
    return [
      200,
      {
        success: true,
        data: mockLoginResponse,
      },
    ];
  });

  // POST /auth/logout - 成功
  axiosMock.onPost('/auth/logout').reply(200, {
    success: true,
    message: '登出成功',
  });

  // GET /auth/me - 动态根据场景返回
  // 默认返回成功，测试中可以通过 server.use() 覆盖为 401
  axiosMock.onGet('/auth/me').reply(200, {
    success: true,
    data: mockUser,
  });

  // POST /auth/refresh - 成功
  axiosMock.onPost('/auth/refresh').reply(200, {
    success: true,
    data: {
      token: 'new-mock-jwt-token',  // 修改为匹配测试期望
      refreshToken: 'new-refresh-token',
      expiresIn: '7d',
    },
  });

  // ========== User API ==========

  // GET /users - 获取用户列表
  axiosMock.onGet(/\/users(\?.*)?$/).reply((config) => {
    // axios 将参数放在 config.params 中，优先使用
    const page = config.params?.page || parseInt(new URLSearchParams(config.url?.split('?')[1] || '').get('page') || '1');
    const pageSize = config.params?.pageSize || parseInt(new URLSearchParams(config.url?.split('?')[1] || '').get('pageSize') || '10');

    return [
      200,
      {
        data: mockUsers,  // 直接返回用户数组
        total: mockUsers.length,
        page,
        pageSize,
      },
    ];
  });

  // GET /users/:id - 获取用户详情
  axiosMock.onGet(/\/users\/[^\/]+$/).reply((config) => {
    const userId = config.url?.split('/').pop();

    // 查找匹配的用户
    const user = mockUsers.find(u => u.id === userId);

    if (user) {
      return [200, user];  // 直接返回用户对象
    }

    return [
      404,
      {
        success: false,
        message: '用户不存在',
      },
    ];
  });

  // POST /users - 创建用户
  axiosMock.onPost('/users').reply((config) => {
    const body = JSON.parse(config.data || '{}');

    return [
      201,
      {
        success: true,
        data: {
          id: `new-${Date.now()}`,
          ...body,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];
  });

  // PUT /users/:id - 更新用户
  axiosMock.onPut(/\/users\/[^\/]+$/).reply((config) => {
    const userId = config.url?.split('/').pop();
    const body = JSON.parse(config.data || '{}');

    return [
      200,
      {
        success: true,
        data: {
          id: userId,
          ...body,
          updatedAt: new Date(),
        },
      },
    ];
  });

  // DELETE /users/:id - 删除用户
  axiosMock.onDelete(/\/users\/[^\/]+$/).reply((config) => {
    const userId = config.url?.split('/').pop();

    return [
      200,
      {
        success: true,
        message: `用户 ${userId} 已删除`,
      },
    ];
  });

  // ========== Device API ==========

  // GET /devices - 获取设备列表
  axiosMock.onGet(/\/devices(\?.*)?$/).reply((config) => {
    // axios 将参数放在 config.params 中，优先使用
    const page = config.params?.page || parseInt(new URLSearchParams(config.url?.split('?')[1] || '').get('page') || '1');
    const pageSize = config.params?.pageSize || parseInt(new URLSearchParams(config.url?.split('?')[1] || '').get('pageSize') || '10');

    return [
      200,
      {
        data: mockDevices,  // 直接返回设备数组
        total: mockDevices.length,
        page,
        pageSize,
      },
    ];
  });

  // GET /devices/:id - 获取设备详情
  axiosMock.onGet(/\/devices\/[^\/]+$/).reply((config) => {
    const deviceId = config.url?.split('/').pop();

    if (deviceId === 'device-1') {
      return [200, mockDevice];  // 直接返回设备对象
    }

    return [
      404,
      {
        success: false,
        message: '设备不存在',
      },
    ];
  });

  // POST /devices - 创建设备
  axiosMock.onPost('/devices').reply((config) => {
    const body = JSON.parse(config.data || '{}');

    return [
      201,
      {
        id: `device-${Date.now()}`,
        ...body,
        status: 'creating' as const,
        androidVersion: '11.0',
        cpuCores: 2,
        memoryMB: 4096,
        storageMB: 8192,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  // PUT /devices/:id - 更新设备
  axiosMock.onPut(/\/devices\/[^\/]+$/).reply((config) => {
    const deviceId = config.url?.split('/').pop();
    const body = JSON.parse(config.data || '{}');

    return [
      200,
      {
        ...mockDevice,
        id: deviceId,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  // DELETE /devices/:id - 删除设备
  axiosMock.onDelete(/\/devices\/[^\/]+$/).reply((config) => {
    const deviceId = config.url?.split('/').pop();

    return [
      200,
      {
        success: true,
        message: `设备 ${deviceId} 已删除`,
      },
    ];
  });

  // ========== Order API ==========

  // GET /orders - 获取订单列表
  axiosMock.onGet(/\/orders(\?.*)?$/).reply((config) => {
    // axios 将参数放在 config.params 中，优先使用
    const page = config.params?.page || parseInt(new URLSearchParams(config.url?.split('?')[1] || '').get('page') || '1');
    const pageSize = config.params?.pageSize || parseInt(new URLSearchParams(config.url?.split('?')[1] || '').get('pageSize') || '10');

    return [
      200,
      {
        data: mockOrders,  // 直接返回订单数组
        total: mockOrders.length,
        page,
        pageSize,
      },
    ];
  });

  // GET /orders/:id - 获取订单详情
  axiosMock.onGet(/\/orders\/[^\/]+$/).reply((config) => {
    const orderId = config.url?.split('/').pop();

    // 查找匹配的订单
    const order = mockOrders.find(o => o.id === orderId);

    if (order) {
      return [200, order];  // 直接返回订单对象
    }

    return [
      404,
      {
        success: false,
        message: '订单不存在',
      },
    ];
  });
};

/**
 * 清除请求历史但保留 handlers
 * 用于测试之间清理，不会影响 replyOnce() 配置
 */
export const clearAxiosHistory = () => {
  axiosMock.resetHistory();
};

/**
 * 重置所有 mock handlers（会清除 replyOnce）
 * 注意：这会清除所有临时配置的 replyOnce() handlers
 * 通常不需要在测试之间调用，除非需要完全重置
 */
export const resetAxiosMock = () => {
  axiosMock.reset();
  setupAxiosMock(); // 重新设置
};

/**
 * 清理 mock adapter
 */
export const cleanupAxiosMock = () => {
  axiosMock.restore();
};
