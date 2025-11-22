import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivePlans } from '@/services/plan';
import type { Plan } from '@/types';
import type { PlatformStatsData } from '@/components/Home';

/**
 * 首页业务逻辑 Hook
 * 封装套餐加载、导航功能和平台统计数据
 */
export function useHome() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  // 检查用户是否已登录
  const isLoggedIn = useMemo(() => {
    return !!localStorage.getItem('token');
  }, []);

  // 平台统计数据（实际项目中应从 API 获取）
  const platformStats: PlatformStatsData = useMemo(() => ({
    users: '10,000+',
    devices: '50,000+',
    uptime: '99.9%',
    companies: '500+',
  }), []);

  // 加载套餐列表
  const loadPlans = useCallback(async () => {
    // 如果未登录，使用模拟数据展示（避免 401 跳转）
    if (!isLoggedIn) {
      setPlans([
        {
          id: 'mock-basic',
          name: '基础版',
          price: 99,
          duration: 30,
          features: ['2核 CPU', '4GB 内存', '20GB 存储', '10台设备'],
          description: '适合个人开发者',
        },
        {
          id: 'mock-standard',
          name: '标准版',
          price: 399,
          duration: 30,
          features: ['4核 CPU', '8GB 内存', '50GB 存储', '50台设备'],
          description: '适合小团队',
        },
        {
          id: 'mock-pro',
          name: '专业版',
          price: 999,
          duration: 30,
          features: ['8核 CPU', '16GB 内存', '100GB 存储', '200台设备'],
          description: '适合企业用户',
        },
        {
          id: 'mock-enterprise',
          name: '企业版',
          price: 0,
          duration: 30,
          features: ['自定义配置', '无限设备', '专属客服', '定制开发'],
          description: '联系我们获取报价',
        },
      ] as any);
      return;
    }

    setLoading(true);
    try {
      const data = await getActivePlans();
      setPlans(data ?? []);
    } catch (error) {
      console.error('加载套餐失败:', error);
      // 暂时不显示错误，因为 billing-service 可能未启动
      setPlans([]); // 设置为空数组
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // 页面加载时获取套餐
  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 处理购买
  const handlePurchase = useCallback(
    (plan: Plan) => {
      // 如果未登录，先跳转到登录页
      if (!isLoggedIn) {
        navigate('/login', { state: { from: `/plans/${plan.id}/purchase` } });
        return;
      }
      navigate(`/plans/${plan.id}/purchase`);
    },
    [navigate, isLoggedIn]
  );

  // 跳转到登录页
  const handleLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  // 跳转到注册页（暂时跳转到登录页，因为可能没有独立注册页）
  const handleRegister = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  // 跳转到控制台（已登录用户）
  const handleDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  // 开始使用（根据登录状态跳转）
  const handleGetStarted = useCallback(() => {
    if (isLoggedIn) {
      navigate('/devices');
    } else {
      navigate('/login');
    }
  }, [navigate, isLoggedIn]);

  return {
    plans,
    loading,
    isLoggedIn,
    platformStats,
    handlePurchase,
    handleLogin,
    handleRegister,
    handleDashboard,
    handleGetStarted,
  };
}
