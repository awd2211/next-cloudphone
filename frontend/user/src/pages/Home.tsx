import { Row, Col } from 'antd';
import { HeroBanner, PlanCard } from '@/components/Dashboard';
import {
  PlatformStats,
  CoreFeatures,
  HowItWorks,
  UseCases,
  CTABanner,
} from '@/components/Home';
import { SEO, AnimatedSection } from '@/components';
import { useHome } from '@/hooks/useHome';
import { useSEOContent, usePageContent } from '@/hooks/useCmsContent';

// 默认 SEO 数据
const defaultSEO = {
  title: 'CloudPhone.run - 企业级云手机平台',
  description: 'CloudPhone.run 提供稳定高效的云端 Android 设备服务，支持应用测试、自动化运营、游戏多开等场景。思维无界，云端赋能。',
  keywords: '云手机,云端Android,应用测试,自动化运营,游戏多开,移动设备云,云测试平台,CloudPhone.run',
  url: 'https://cloudphone.run',
};

// 默认定价区块数据
const defaultPricingSection = {
  title: '选择适合您的套餐',
  subtitle: '灵活的套餐选择，按需付费，无隐藏费用',
};

/**
 * CloudPhone.run 营销型首页
 * 包含完整的产品介绍、功能特性、使用流程、定价方案等内容
 * Header 和 Footer 由 PublicLayout 提供
 */
const Home = () => {
  const {
    plans,
    loading,
    platformStats,
    handlePurchase,
    handleGetStarted,
  } = useHome();

  // 从 CMS 获取 SEO 和定价区块内容
  const { data: seoContent } = useSEOContent();
  const { data: pricingSection } = usePageContent<{ title: string; subtitle: string }>('home', 'pricing-section');

  const seo = seoContent || defaultSEO;
  const pricing = pricingSection?.[0]?.content || defaultPricingSection;

  return (
    <div>
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        url={seo.url}
      />
      {/* 1. 头部横幅 - 品牌宣传 */}
      <AnimatedSection animation="fadeIn" duration={0.8}>
        <HeroBanner onGetStarted={handleGetStarted} />
      </AnimatedSection>

      {/* 2. 平台数据统计 - 社会证明 */}
      <AnimatedSection animation="fadeInUp" delay={0.2}>
        <PlatformStats data={platformStats} />
      </AnimatedSection>

      {/* 3. 核心功能特性 - 6大亮点 */}
      <AnimatedSection animation="fadeInUp" delay={0.1}>
        <CoreFeatures />
      </AnimatedSection>

      {/* 4. 使用流程 - 3步快速开始 */}
      <AnimatedSection animation="fadeInUp" delay={0.1}>
        <HowItWorks />
      </AnimatedSection>

      {/* 5. 定价方案 - 套餐列表 */}
      <AnimatedSection animation="fadeInUp" delay={0.1}>
        <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, marginBottom: 16 }}>{pricing.title}</h2>
            <p style={{ fontSize: 16, color: '#666' }}>
              {pricing.subtitle}
            </p>
          </div>

          <Row gutter={[24, 24]}>
            {plans.map((plan, index) => (
              <Col key={plan.id} xs={24} sm={12} lg={6}>
                <AnimatedSection animation="scaleIn" delay={index * 0.1}>
                  <PlanCard plan={plan} loading={loading} onPurchase={handlePurchase} />
                </AnimatedSection>
              </Col>
            ))}
          </Row>
        </div>
      </AnimatedSection>

      {/* 6. 应用场景 - 4大典型场景 */}
      <AnimatedSection animation="fadeInUp" delay={0.1}>
        <UseCases />
      </AnimatedSection>

      {/* 7. CTA横幅 - 行动号召 */}
      <AnimatedSection animation="scaleIn" delay={0.2}>
        <CTABanner />
      </AnimatedSection>
    </div>
  );
};

export default Home;
