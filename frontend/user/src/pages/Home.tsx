import { Row, Col } from 'antd';
import { HeroBanner, PlanCard } from '@/components/Dashboard';
import {
  Header,
  PlatformStats,
  CoreFeatures,
  HowItWorks,
  UseCases,
  CTABanner,
  Footer,
} from '@/components/Home';
import { useHome } from '@/hooks/useHome';

/**
 * 营销型首页
 * 包含完整的产品介绍、功能特性、使用流程、定价方案等内容
 */
const Home = () => {
  const {
    plans,
    loading,
    platformStats,
    isLoggedIn,
    handlePurchase,
    handleLogin,
    handleRegister,
    handleDashboard,
    handleGetStarted,
  } = useHome();

  return (
    <div>
      {/* 头部导航栏 */}
      <Header
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDashboard={handleDashboard}
      />

      {/* 1. 头部横幅 - 品牌宣传 */}
      <HeroBanner
        onGetStarted={handleGetStarted}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDashboard={handleDashboard}
      />

      {/* 2. 平台数据统计 - 社会证明 */}
      <PlatformStats data={platformStats} />

      {/* 3. 核心功能特性 - 6大亮点 */}
      <CoreFeatures />

      {/* 4. 使用流程 - 3步快速开始 */}
      <HowItWorks />

      {/* 5. 定价方案 - 套餐列表 */}
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, marginBottom: 16 }}>选择适合您的套餐</h2>
          <p style={{ fontSize: 16, color: '#666' }}>
            灵活的套餐选择，按需付费，无隐藏费用
          </p>
        </div>

        <Row gutter={[24, 24]}>
          {plans.map((plan) => (
            <Col key={plan.id} xs={24} sm={12} lg={6}>
              <PlanCard plan={plan} loading={loading} onPurchase={handlePurchase} />
            </Col>
          ))}
        </Row>
      </div>

      {/* 6. 应用场景 - 4大典型场景 */}
      <UseCases />

      {/* 7. CTA横幅 - 行动号召 */}
      <CTABanner />

      {/* 8. 页脚导航 - 完整导航 */}
      <Footer />
    </div>
  );
};

export default Home;
