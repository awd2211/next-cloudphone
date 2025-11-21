/**
 * 验证 axios-mock-adapter 是否正常工作
 */
import { describe, it, expect } from 'vitest';
import { getDevices } from '@/services/device';

describe('Verify Mock Setup', () => {
  it('should intercept device API calls', async () => {
    console.log('🔍 Testing device API mock interception...');

    const result = await getDevices({ page: 1, pageSize: 10 });

    console.log('📦 Result:', JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result.data).toBeInstanceOf(Array);  // data 直接是数组
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });
});
