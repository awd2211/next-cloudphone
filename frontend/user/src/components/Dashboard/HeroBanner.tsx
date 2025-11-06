import React, { useRef } from 'react';
import { Button, Space, Carousel } from 'antd';
import { RocketOutlined, PlayCircleOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { CarouselRef } from 'antd/es/carousel';

interface HeroBannerProps {
  onGetStarted: () => void;
  isLoggedIn?: boolean;
  onLogin?: () => void;
  onRegister?: () => void;
  onDashboard?: () => void;
}

// Banner slides 数据
const bannerSlides = [
  {
    id: 1,
    title: '思维无界',
    subtitle: '云端赋能',
    description: 'Ultrathink 为您提供稳定可靠的云端 Android 设备\n随时随地，轻松管理数百台设备，专注核心业务',
    tag: '企业级云手机平台 · 全球领先',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#d946ef',
  },
  {
    id: 2,
    title: '安全可靠',
    subtitle: '稳定高效',
    description: '99.9% SLA 保障，企业级数据安全\n全球多地域部署，毫秒级响应速度',
    tag: '银行级安全 · ISO 27001 认证',
    bgGradient: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0c4a6e 100%)',
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
  {
    id: 3,
    title: '极致性能',
    subtitle: '智能调度',
    description: '强大的 GPU 加速，流畅的云端体验\nAI 智能资源调度，成本降低 50%',
    tag: '高性能计算 · 智能优化',
    bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #4c1d95 100%)',
    primaryColor: '#a855f7',
    secondaryColor: '#c084fc',
    accentColor: '#e879f9',
  },
  {
    id: 4,
    title: '开箱即用',
    subtitle: '快速部署',
    description: '一键创建云设备，30秒完成部署\n丰富的 API 接口，快速集成到您的业务',
    tag: '极简部署 · 开发者友好',
    bgGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%)',
    primaryColor: '#10b981',
    secondaryColor: '#34d399',
    accentColor: '#6ee7b7',
  },
];

/**
 * Ultrathink 首页头部横幅组件
 * 现代化设计，展示品牌价值主张，支持多图轮播
 */
export const HeroBanner: React.FC<HeroBannerProps> = React.memo(({
  onGetStarted,
}) => {
  const carouselRef = useRef<CarouselRef>(null);

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 左右切换按钮 */}
      <Button
        type="text"
        icon={<LeftOutlined />}
        onClick={() => carouselRef.current?.prev()}
        style={{
          position: 'absolute',
          left: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.background = 'rgba(255, 255, 255, 0.2)';
          target.style.transform = 'translateY(-50%) scale(1.1)';
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.background = 'rgba(255, 255, 255, 0.1)';
          target.style.transform = 'translateY(-50%) scale(1)';
        }}
      />
      <Button
        type="text"
        icon={<RightOutlined />}
        onClick={() => carouselRef.current?.next()}
        style={{
          position: 'absolute',
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.background = 'rgba(255, 255, 255, 0.2)';
          target.style.transform = 'translateY(-50%) scale(1.1)';
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget as HTMLElement;
          target.style.background = 'rgba(255, 255, 255, 0.1)';
          target.style.transform = 'translateY(-50%) scale(1)';
        }}
      />

      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(30px, 30px); }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .hero-carousel .slick-dots {
            bottom: 32px !important;
          }
          .hero-carousel .slick-dots li button {
            width: 12px !important;
            height: 12px !important;
            border-radius: 50% !important;
            background: rgba(255, 255, 255, 0.3) !important;
          }
          .hero-carousel .slick-dots li.slick-active button {
            width: 32px !important;
            border-radius: 6px !important;
            background: rgba(255, 255, 255, 0.9) !important;
          }
        `}
      </style>

      {/* Carousel 轮播 */}
      <Carousel
        ref={carouselRef}
        autoplay
        autoplaySpeed={5000}
        effect="fade"
        dots
        className="hero-carousel"
      >
        {bannerSlides.map((slide) => (
          <div key={slide.id}>
            <div
              style={{
                position: 'relative',
                background: slide.bgGradient,
                padding: '120px 24px 100px',
                color: '#fff',
                overflow: 'hidden',
                minHeight: '600px',
              }}
            >
              {/* 背景装饰 - 渐变球体 */}
              <div
                style={{
                  position: 'absolute',
                  top: '-20%',
                  right: '-10%',
                  width: '600px',
                  height: '600px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${slide.primaryColor}4D 0%, transparent 70%)`,
                  filter: 'blur(60px)',
                  animation: 'float 8s ease-in-out infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-20%',
                  left: '-10%',
                  width: '500px',
                  height: '500px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${slide.secondaryColor}4D 0%, transparent 70%)`,
                  filter: 'blur(60px)',
                  animation: 'float 6s ease-in-out infinite reverse',
                }}
              />

              {/* 网格背景 */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `
                    linear-gradient(${slide.primaryColor}0D 1px, transparent 1px),
                    linear-gradient(90deg, ${slide.primaryColor}0D 1px, transparent 1px)
                  `,
                  backgroundSize: '50px 50px',
                  opacity: 0.3,
                }}
              />

              {/* Hero 内容 */}
              <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center' }}>
                  {/* 标签 */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '8px 20px',
                      background: `${slide.primaryColor}26`,
                      borderRadius: 24,
                      border: `1px solid ${slide.primaryColor}4D`,
                      marginBottom: 32,
                      animation: 'fadeInUp 0.8s ease-out',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: slide.accentColor,
                        marginRight: 8,
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#a5b4fc' }}>
                      {slide.tag}
                    </span>
                  </div>

                  {/* 主标题 */}
                  <h1
                    style={{
                      fontSize: 64,
                      fontWeight: 800,
                      lineHeight: 1.2,
                      margin: '0 0 24px 0',
                      animation: 'fadeInUp 0.8s ease-out 0.2s backwards',
                      letterSpacing: '-2px',
                    }}
                  >
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {slide.title}
                    </span>
                    <br />
                    <span
                      style={{
                        background: `linear-gradient(135deg, ${slide.primaryColor} 0%, ${slide.secondaryColor} 50%, ${slide.accentColor} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {slide.subtitle}
                    </span>
                  </h1>

                  {/* 副标题 */}
                  <p
                    style={{
                      fontSize: 22,
                      lineHeight: 1.8,
                      color: '#cbd5e1',
                      maxWidth: 700,
                      margin: '0 auto 48px',
                      animation: 'fadeInUp 0.8s ease-out 0.4s backwards',
                      fontWeight: 400,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {slide.description}
                  </p>

                  {/* CTA 按钮组 */}
                  <Space
                    size="large"
                    style={{
                      animation: 'fadeInUp 0.8s ease-out 0.6s backwards',
                    }}
                  >
                    <Button
                      type="primary"
                      size="large"
                      icon={<RocketOutlined />}
                      onClick={onGetStarted}
                      style={{
                        height: 56,
                        fontSize: 18,
                        padding: '0 48px',
                        background: `linear-gradient(135deg, ${slide.primaryColor} 0%, ${slide.secondaryColor} 100%)`,
                        border: 'none',
                        borderRadius: 12,
                        fontWeight: 600,
                        boxShadow: `0 10px 40px ${slide.primaryColor}66`,
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.transform = 'translateY(-2px)';
                        target.style.boxShadow = `0 15px 50px ${slide.primaryColor}80`;
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.transform = 'translateY(0)';
                        target.style.boxShadow = `0 10px 40px ${slide.primaryColor}66`;
                      }}
                    >
                      立即开始
                    </Button>

                    <Button
                      size="large"
                      icon={<PlayCircleOutlined />}
                      style={{
                        height: 56,
                        fontSize: 18,
                        padding: '0 48px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        borderRadius: 12,
                        fontWeight: 600,
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.background = 'rgba(255, 255, 255, 0.15)';
                        target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.background = 'rgba(255, 255, 255, 0.1)';
                        target.style.transform = 'translateY(0)';
                      }}
                    >
                      观看演示
                    </Button>
                  </Space>

                  {/* 信任标记 */}
                  <div
                    style={{
                      marginTop: 64,
                      paddingTop: 48,
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      animation: 'fadeInUp 0.8s ease-out 0.8s backwards',
                    }}
                  >
                    <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, fontWeight: 500 }}>
                      已有 10,000+ 企业客户信赖
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 48,
                        flexWrap: 'wrap',
                      }}
                    >
                      {['企业级安全', '99.9% 可用性', '7×24 小时支持', 'ISO 27001 认证'].map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: '#cbd5e1',
                            fontSize: 15,
                            fontWeight: 500,
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${slide.primaryColor} 0%, ${slide.secondaryColor} 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 8,
                            }}
                          >
                            <span style={{ fontSize: 12, color: 'white' }}>✓</span>
                          </div>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  );
});

HeroBanner.displayName = 'HeroBanner';
