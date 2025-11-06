import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePricing } from '../usePricing';

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('usePricing Hook', () => {
  describe('初始状态', () => {
    it('应该有正确的初始值', () => {
      const { result } = renderHook(() => usePricing());

      expect(result.current.billingCycle).toBe('monthly');
      expect(result.current.deviceCount).toBe(10);
      expect(result.current.savedAmount).toBe(0);
    });

    it('应该提供所有必需的方法', () => {
      const { result } = renderHook(() => usePricing());

      expect(typeof result.current.setBillingCycle).toBe('function');
      expect(typeof result.current.setDeviceCount).toBe('function');
      expect(typeof result.current.calculatePrice).toBe('function');
      expect(typeof result.current.navigate).toBe('function');
    });
  });

  describe('计费周期切换', () => {
    it('应该能切换到年付', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setBillingCycle('yearly');
      });

      expect(result.current.billingCycle).toBe('yearly');
    });

    it('应该能切换回月付', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setBillingCycle('yearly');
      });
      act(() => {
        result.current.setBillingCycle('monthly');
      });

      expect(result.current.billingCycle).toBe('monthly');
    });
  });

  describe('设备数量设置', () => {
    it('应该能设置设备数量', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setDeviceCount(50);
      });

      expect(result.current.deviceCount).toBe(50);
    });

    it('应该能设置任意有效数量', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setDeviceCount(100);
      });

      expect(result.current.deviceCount).toBe(100);
    });
  });

  describe('价格计算 - 月付', () => {
    it('应该正确计算月付价格（10台设备）', () => {
      const { result } = renderHook(() => usePricing());

      const price = result.current.calculatePrice();
      expect(price).toBe(100); // 10 * 10
    });

    it('应该正确计算月付价格（50台设备）', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setDeviceCount(50);
      });

      const price = result.current.calculatePrice();
      expect(price).toBe(500); // 50 * 10
    });

    it('应该正确计算月付价格（1台设备）', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setDeviceCount(1);
      });

      const price = result.current.calculatePrice();
      expect(price).toBe(10); // 1 * 10
    });
  });

  describe('价格计算 - 年付', () => {
    it('应该应用年付折扣（10台设备）', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setBillingCycle('yearly');
      });

      const price = result.current.calculatePrice();
      // 10 * 10 * 12 * 0.8 = 960
      expect(price).toBe(960);
    });

    it('应该应用年付折扣（50台设备）', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setDeviceCount(50);
        result.current.setBillingCycle('yearly');
      });

      const price = result.current.calculatePrice();
      // 50 * 10 * 12 * 0.8 = 4800
      expect(price).toBe(4800);
    });

    it('应该应用年付折扣（1台设备）', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setDeviceCount(1);
        result.current.setBillingCycle('yearly');
      });

      const price = result.current.calculatePrice();
      // 1 * 10 * 12 * 0.8 = 96
      expect(price).toBe(96);
    });
  });

  describe('节省金额计算', () => {
    it('月付时节省金额应该为0', () => {
      const { result } = renderHook(() => usePricing());

      expect(result.current.savedAmount).toBe(0);
    });

    it('年付时应该显示节省金额（10台设备）', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setBillingCycle('yearly');
      });

      // 原价: 960 / 0.8 = 1200
      // 现价: 960
      // 节省: 1200 - 960 = 240
      expect(result.current.savedAmount).toBe(240);
    });

    it('年付时应该显示节省金额（50台设备）', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setDeviceCount(50);
        result.current.setBillingCycle('yearly');
      });

      // 原价: 4800 / 0.8 = 6000
      // 现价: 4800
      // 节省: 6000 - 4800 = 1200
      expect(result.current.savedAmount).toBe(1200);
    });

    it('切换回月付后节省金额应该归零', () => {
      const { result } = renderHook(() => usePricing());

      act(() => {
        result.current.setBillingCycle('yearly');
      });
      expect(result.current.savedAmount).toBeGreaterThan(0);

      act(() => {
        result.current.setBillingCycle('monthly');
      });
      expect(result.current.savedAmount).toBe(0);
    });
  });

  describe('综合场景', () => {
    it('应该正确处理多次状态变更', () => {
      const { result } = renderHook(() => usePricing());

      // 初始: 月付, 10台
      expect(result.current.calculatePrice()).toBe(100);

      // 改为50台
      act(() => {
        result.current.setDeviceCount(50);
      });
      expect(result.current.calculatePrice()).toBe(500);

      // 改为年付
      act(() => {
        result.current.setBillingCycle('yearly');
      });
      expect(result.current.calculatePrice()).toBe(4800);
      expect(result.current.savedAmount).toBe(1200);

      // 改回月付
      act(() => {
        result.current.setBillingCycle('monthly');
      });
      expect(result.current.calculatePrice()).toBe(500);
      expect(result.current.savedAmount).toBe(0);
    });
  });
});
