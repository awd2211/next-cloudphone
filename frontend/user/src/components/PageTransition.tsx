import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 页面过渡动画组件
 * 在路由切换时显示加载动画
 */
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // 路由改变时触发过渡动画
    setIsTransitioning(true);

    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {/* 过渡遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'white',
          zIndex: 9998,
          pointerEvents: isTransitioning ? 'all' : 'none',
          opacity: isTransitioning ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        {/* 加载动画 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              border: '4px solid #f0f0f0',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>

      {/* 页面内容 */}
      <div
        style={{
          opacity: isTransitioning ? 0 : 1,
          transform: isTransitioning ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        }}
      >
        {children}
      </div>
    </>
  );
};

export default PageTransition;
