import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHome } from '../useHome';
import * as planService from '@/services/plan';
import type { Plan } from '@/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock plan service
vi.mock('@/services/plan', () => ({
  getActivePlans: vi.fn(),
}));

describe('useHome Hook', () => {
  const mockPlans: Plan[] = [
    {
      id: 'plan-1',
      name: '基础版',
      price: 99,
      duration: 30,
      features: ['2核 CPU', '4GB 内存'],
      description: '适合个人开发者',
    } as Plan,
    {
      id: 'plan-2',
      name: '专业版',
      price: 299,
      duration: 30,
      features: ['4核 CPU', '8GB 内存'],
      description: '适合团队使用',
    } as Plan,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(planService.getActivePlans).mockResolvedValue(mockPlans);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useHome());

      // plans 会立即加载（未登录时加载模拟数据），所以不检查初始值
      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.isLoggedIn).toBe('boolean');
      expect(result.current.platformStats).toBeDefined();
    });

    it('platformStats应该包含正确的字段', () => {
      const { result } = renderHook(() => useHome());

      expect(result.current.platformStats).toHaveProperty('users');
      expect(result.current.platformStats).toHaveProperty('devices');
      expect(result.current.platformStats).toHaveProperty('uptime');
      expect(result.current.platformStats).toHaveProperty('companies');
    });
  });

  describe('isLoggedIn 登录状态检查', () => {
    it('没有token时应该返回false', () => {
      const { result } = renderHook(() => useHome());
      expect(result.current.isLoggedIn).toBe(false);
    });

    it('有token时应该返回true', () => {
      localStorage.setItem('token', 'fake-token');
      const { result } = renderHook(() => useHome());
      expect(result.current.isLoggedIn).toBe(true);
    });
  });

  describe('数据加载 - 未登录状态', () => {
    it('未登录时应该加载模拟套餐数据', async () => {
      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBe(4);
      });

      expect(planService.getActivePlans).not.toHaveBeenCalled();
    });

    it('模拟数据应该包含4个套餐', async () => {
      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBe(4);
      });

      const planNames = result.current.plans.map(p => p.name);
      expect(planNames).toContain('基础版');
      expect(planNames).toContain('标准版');
      expect(planNames).toContain('专业版');
      expect(planNames).toContain('企业版');
    });
  });

  describe('数据加载 - 已登录状态', () => {
    it('已登录时应该调用API加载套餐', async () => {
      localStorage.setItem('token', 'fake-token');

      renderHook(() => useHome());

      await waitFor(() => {
        expect(planService.getActivePlans).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新plans', async () => {
      localStorage.setItem('token', 'fake-token');

      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans).toEqual(mockPlans);
      });
    });

    it('加载失败应该设置plans为空数组', async () => {
      localStorage.setItem('token', 'fake-token');
      vi.mocked(planService.getActivePlans).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.plans).toEqual([]);
    });
  });

  describe('handlePurchase 购买套餐', () => {
    const mockPlan: Plan = {
      id: 'plan-1',
      name: '基础版',
      price: 99,
    } as Plan;

    it('未登录时应该跳转到登录页', async () => {
      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePurchase(mockPlan);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { from: '/plans/plan-1/purchase' },
      });
    });

    it('已登录时应该跳转到购买页', async () => {
      localStorage.setItem('token', 'fake-token');

      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePurchase(mockPlan);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/plans/plan-1/purchase');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHome());

      const firstHandle = result.current.handlePurchase;
      rerender();
      const secondHandle = result.current.handlePurchase;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleLogin 跳转登录', () => {
    it('应该导航到登录页', async () => {
      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleLogin();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHome());

      const firstHandle = result.current.handleLogin;
      rerender();
      const secondHandle = result.current.handleLogin;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleRegister 跳转注册', () => {
    it('应该导航到登录页', async () => {
      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleRegister();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHome());

      const firstHandle = result.current.handleRegister;
      rerender();
      const secondHandle = result.current.handleRegister;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleDashboard 跳转控制台', () => {
    it('应该导航到控制台页', async () => {
      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleDashboard();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHome());

      const firstHandle = result.current.handleDashboard;
      rerender();
      const secondHandle = result.current.handleDashboard;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleGetStarted 开始使用', () => {
    it('未登录时应该跳转到登录页', async () => {
      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleGetStarted();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('已登录时应该跳转到设备页', async () => {
      localStorage.setItem('token', 'fake-token');

      const { result } = renderHook(() => useHome());

      await waitFor(() => {
        expect(result.current.plans.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleGetStarted();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/devices');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useHome());

      const firstHandle = result.current.handleGetStarted;
      rerender();
      const secondHandle = result.current.handleGetStarted;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('platformStats useMemo', () => {
    it('应该缓存platformStats', () => {
      const { result, rerender } = renderHook(() => useHome());

      const firstStats = result.current.platformStats;
      rerender();
      const secondStats = result.current.platformStats;

      expect(firstStats).toBe(secondStats);
    });
  });
});
