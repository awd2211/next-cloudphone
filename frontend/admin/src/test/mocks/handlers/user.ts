/**
 * MSW Handlers for User API
 */
import { http, HttpResponse } from 'msw';
import { mockUsers, mockUsersPage } from '../user';

// const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:30000';

export const userHandlers = [
  // GET /users - 获取用户列表
  http.get('*/users', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    return HttpResponse.json({
      success: true,
      data: {
        ...mockUsersPage,
        page,
        pageSize,
      },
    });
  }),

  // GET /users/:id - 获取用户详情
  http.get('*/users/:id', ({ params }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === id);

    if (!user) {
      return HttpResponse.json(
        {
          success: false,
          message: '用户不存在',
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: user,
    });
  }),

  // POST /users - 创建用户
  http.post('*/users', async ({ request }) => {
    const body = (await request.json()) as any;

    return HttpResponse.json({
      success: true,
      data: {
        id: `new-${Date.now()}`,
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }),

  // PUT /users/:id - 更新用户
  http.put('*/users/:id', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as any;

    return HttpResponse.json({
      success: true,
      data: {
        id,
        ...body,
        updatedAt: new Date(),
      },
    });
  }),

  // DELETE /users/:id - 删除用户
  http.delete('*/users/:id', ({ params }) => {
    const { id } = params;

    return HttpResponse.json({
      success: true,
      message: `用户 ${id} 已删除`,
    });
  }),
];
