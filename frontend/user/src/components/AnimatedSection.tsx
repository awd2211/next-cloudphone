import React, { CSSProperties } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideInUp' | 'slideInDown';
  delay?: number;
  duration?: number;
  threshold?: number;
  triggerOnce?: boolean;
  style?: CSSProperties;
  className?: string;
}

/**
 * 滚动触发动画组件
 * 当元素进入视口时自动播放动画
 */
const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  triggerOnce = true,
  style = {},
  className = '',
}) => {
  const { ref, isVisible } = useScrollAnimation({ threshold, triggerOnce });

  // 动画样式映射
  const animationStyles: Record<string, CSSProperties> = {
    fadeIn: {
      opacity: isVisible ? 1 : 0,
    },
    fadeInUp: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
    },
    fadeInDown: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(-30px)',
    },
    fadeInLeft: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(-30px)',
    },
    fadeInRight: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(30px)',
    },
    scaleIn: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(0.9)',
    },
    slideInUp: {
      transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
      opacity: isVisible ? 1 : 0,
    },
    slideInDown: {
      transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
      opacity: isVisible ? 1 : 0,
    },
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...animationStyles[animation],
        transition: `all ${duration}s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
