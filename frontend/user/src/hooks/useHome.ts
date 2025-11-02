import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivePlans } from '@/services/plan';
import type { Plan } from '@/types';

/**
 * 首页业务逻辑 Hook
 * 封装套餐加载和导航功能
 */
export function useHome() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载套餐列表
  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivePlans();
      setPlans(data);
    } catch (error) {
      console.error('加载套餐失败:', error);
      // 暂时不显示错误，因为 billing-service 可能未启动
      setPlans([]); // 设置为空数组
    } finally {
      setLoading(false);
    }
  }, []);

  // 页面加载时获取套餐
  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // 处理购买
  const handlePurchase = useCallback(
    (plan: Plan) => {
      navigate(`/plans/${plan.id}/purchase`);
    },
    [navigate]
  );

  // 跳转到设备列表
  const handleGetStarted = useCallback(() => {
    navigate('/devices');
  }, [navigate]);

  return {
    plans,
    loading,
    handlePurchase,
    handleGetStarted,
  };
}
