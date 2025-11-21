/**
 * 示例测试文件
 * 这是一个简单的测试示例，用于验证测试环境配置正确
 */

import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings', () => {
    const message = 'Hello Testing';
    expect(message).toContain('Testing');
  });

  it('should handle arrays', () => {
    const numbers = [1, 2, 3, 4, 5];
    expect(numbers).toHaveLength(5);
    expect(numbers).toContain(3);
  });

  it('should handle objects', () => {
    const user = {
      id: '1',
      username: 'test',
      email: 'test@example.com',
    };

    expect(user).toHaveProperty('id');
    expect(user.username).toBe('test');
  });

  it('should handle async operations', async () => {
    const fetchData = async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve('data'), 100);
      });
    };

    const data = await fetchData();
    expect(data).toBe('data');
  });
});

describe('Math Operations', () => {
  it('should add numbers correctly', () => {
    expect(5 + 3).toBe(8);
  });

  it('should multiply numbers correctly', () => {
    expect(4 * 5).toBe(20);
  });

  it('should handle negative numbers', () => {
    expect(-5 + 3).toBe(-2);
  });
});
