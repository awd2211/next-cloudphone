/**
 * 验证 User API mock 是否正常工作
 */
import { describe, it, expect } from 'vitest';
import { getUsers } from '@/services/user';

describe('Verify User Mock Setup', () => {
  it('should intercept user API calls', async () => {
    console.log('🔍 Testing user API mock interception...');

    const result = await getUsers({ page: 1, pageSize: 10 });

    console.log('📦 Result:', JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result.data).toBeInstanceOf(Array);  // data 直接是数组
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });
});
