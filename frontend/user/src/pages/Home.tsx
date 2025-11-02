import { Row, Col } from 'antd';
import { HeroBanner, PlanCard, FeatureSection } from '@/components/Dashboard';
import { useHome } from '@/hooks/useHome';

const Home = () => {
  const { plans, loading, handlePurchase, handleGetStarted } = useHome();

  return (
    <div>
      {/* 头部横幅 */}
      <HeroBanner onGetStarted={handleGetStarted} />

      {/* 套餐列表 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, marginBottom: 48 }}>
          选择适合您的套餐
        </h2>

        <Row gutter={[24, 24]}>
          {plans.map((plan) => (
            <Col key={plan.id} xs={24} sm={12} lg={6}>
              <PlanCard
                plan={plan}
                loading={loading}
                onPurchase={handlePurchase}
              />
            </Col>
          ))}
        </Row>

        {/* 特性介绍 */}
        <FeatureSection />
      </div>
    </div>
  );
};

export default Home;
