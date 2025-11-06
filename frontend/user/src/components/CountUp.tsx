import React, { useState, useEffect } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  separator?: string;
  style?: React.CSSProperties;
}

/**
 * 数字滚动动画组件
 * 当进入视口时自动从起始值滚动到目标值
 */
const CountUp: React.FC<CountUpProps> = ({
  end,
  start = 0,
  duration = 2,
  decimals = 0,
  suffix = '',
  prefix = '',
  separator = ',',
  style = {},
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3, triggerOnce: true });
  const [count, setCount] = useState(start);

  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (endTime - startTime), 1);

      // 使用 easeOutExpo 缓动函数
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      const currentCount = start + (end - start) * easeProgress;
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };

    requestAnimationFrame(updateCount);
  }, [isVisible, start, end, duration]);

  // 格式化数字（添加千位分隔符）
  const formatNumber = (num: number): string => {
    const fixedNum = num.toFixed(decimals);
    const parts = fixedNum.split('.');
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    }
    return parts.join('.');
  };

  return (
    <span ref={ref} style={style}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  );
};

export default CountUp;
