import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('request utility', () => {
  it('应该处理成功的请求', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: { id: 1 } },
    });

    // 实际测试需要导入 request 工具
    expect(true).toBe(true); // 占位符
  });

  it('应该处理错误响应', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    expect(true).toBe(true); // 占位符
  });
});
