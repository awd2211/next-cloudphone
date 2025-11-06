import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header, Footer } from '@/components/Home';
import { ScrollProgress, PageTransition } from '@/components';

/**
 * 公共页面布局组件
 * 用于首页、产品、价格、帮助、关于等无需登录的页面
 */
const PublicLayout: React.FC = () => {
  const navigate = useNavigate();

  // 检查用户是否已登录（简单检查，基于 token）
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/login');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 滚动进度指示器 */}
      <ScrollProgress />

      {/* 头部导航 */}
      <Header
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDashboard={handleDashboard}
      />

      {/* 主要内容区域 */}
      <main style={{ flex: 1 }}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
  );
};

export default PublicLayout;
