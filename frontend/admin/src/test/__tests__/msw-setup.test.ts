/**
 * MSW Setup Verification Test
 * 验证 MSW 是否正确配置
 */
import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('MSW Setup', () => {
  it('should have MSW server configured', () => {
    expect(server).toBeDefined();
  });

  it('should intercept requests', async () => {
    // 添加一个测试 handler
    server.use(
      http.get('*/test', () => {
        return HttpResponse.json({ message: 'MSW is working!' });
      })
    );

    // 使用 fetch 测试
    const response = await fetch('http://localhost:3000/test');
    const data = await response.json();

    expect(data.message).toBe('MSW is working!');
  });
});
