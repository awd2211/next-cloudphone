import React from 'react';
import { useScrollProgress } from '@/hooks/useScrollAnimation';

interface ScrollProgressProps {
  color?: string;
  height?: number;
  position?: 'top' | 'bottom';
}

/**
 * 滚动进度指示器
 * 显示页面滚动进度条
 */
const ScrollProgress: React.FC<ScrollProgressProps> = ({
  color = '#6366f1',
  height = 3,
  position = 'top',
}) => {
  const progress = useScrollProgress();

  return (
    <div
      style={{
        position: 'fixed',
        [position]: 0,
        left: 0,
        width: '100%',
        height: height,
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          transition: 'width 0.1s ease-out',
          boxShadow: `0 0 10px ${color}66`,
        }}
      />
    </div>
  );
};

export default ScrollProgress;
