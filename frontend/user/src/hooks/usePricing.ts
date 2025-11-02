import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const usePricing = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [deviceCount, setDeviceCount] = useState(10);

  // 价格计算
  const calculatePrice = useCallback(() => {
    const basePrice = 10;
    let total = deviceCount * basePrice;
    if (billingCycle === 'yearly') {
      total = total * 12 * 0.8;
    }
    return total;
  }, [deviceCount, billingCycle]);

  // 节省金额
  const savedAmount = useMemo(() => {
    if (billingCycle === 'yearly') {
      return Math.round(calculatePrice() / 0.8 - calculatePrice());
    }
    return 0;
  }, [billingCycle, calculatePrice]);

  return {
    billingCycle,
    setBillingCycle,
    deviceCount,
    setDeviceCount,
    calculatePrice,
    savedAmount,
    navigate,
  };
};
