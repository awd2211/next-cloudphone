import React from 'react';
import { Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { RocketOutlined, MessageOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { useCTABannerContent } from '@/hooks/useCmsContent';

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  RocketOutlined: <RocketOutlined />,
  MessageOutlined: <MessageOutlined />,
  PhoneOutlined: <PhoneOutlined />,
  MailOutlined: <MailOutlined />,
};

// 默认内容
const defaultContent = {
  tag: '立即行动',
  title: '准备好体验',
  highlightText: '未来的云手机服务',
  titleSuffix: '了吗？',
  description: '加入 10,000+ 企业客户，享受 CloudPhone.run 提供的企业级云手机服务\n免费试用 14 天，无需信用卡',
  primaryButton: { text: '免费开始使用', icon: 'RocketOutlined', link: '/login' },
  secondaryButton: { text: '联系销售', icon: 'MessageOutlined', link: '/help' },
  trustBadges: ['✓ 14 天免费试用', '✓ 无需信用卡', '✓ 随时取消', '✓ 即刻开通'],
};

/**
 * CloudPhone.run CTA (Call To Action) 横幅组件
 * 鼓励用户注册或联系销售，内容从 CMS 动态加载
 */
export const CTABanner: React.FC = React.memo(() => {
  const navigate = useNavigate();

  // 从 CMS 获取内容
  const { data: ctaContent } = useCTABannerContent();

  const tag = ctaContent?.tag || defaultContent.tag;
  const title = ctaContent?.title || defaultContent.title;
  const highlightText = ctaContent?.highlightText || defaultContent.highlightText;
  const titleSuffix = ctaContent?.titleSuffix || defaultContent.titleSuffix;
  const description = ctaContent?.description || defaultContent.description;
  const primaryButton = ctaContent?.primaryButton || defaultContent.primaryButton;
  const secondaryButton = ctaContent?.secondaryButton || defaultContent.secondaryButton;
  const trustBadges = ctaContent?.trustBadges || defaultContent.trustBadges;

  return (
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '100px 24px',
        marginTop: 120,
        overflow: 'hidden',
      }}
    >
      {/* 背景装饰 */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-50%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* 网格背景 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* 标签 */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 16px',
            background: 'rgba(99, 102, 241, 0.15)',
            borderRadius: 20,
            border: '1px solid rgba(99, 102, 241, 0.3)',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>
            {tag}
          </span>
        </div>

        {/* 标题 */}
        <h2
          style={{
            fontSize: 48,
            color: 'white',
            marginBottom: 20,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-1px',
          }}
        >
          {title}
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {highlightText}
          </span>
          {titleSuffix}
        </h2>

        {/* 描述 */}
        <p
          style={{
            fontSize: 20,
            color: '#cbd5e1',
            marginBottom: 40,
            lineHeight: 1.8,
            maxWidth: 700,
            margin: '0 auto 40px',
            whiteSpace: 'pre-line',
          }}
        >
          {description}
        </p>

        {/* 按钮组 */}
        <Space size="large">
          <Button
            type="primary"
            size="large"
            icon={iconMap[primaryButton.icon] || <RocketOutlined />}
            onClick={() => navigate(primaryButton.link)}
            style={{
              height: 56,
              padding: '0 48px',
              fontSize: 18,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.transform = 'translateY(-2px)';
              target.style.boxShadow = '0 15px 50px rgba(99, 102, 241, 0.5)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.transform = 'translateY(0)';
              target.style.boxShadow = '0 10px 40px rgba(99, 102, 241, 0.4)';
            }}
          >
            {primaryButton.text}
          </Button>

          <Button
            size="large"
            icon={iconMap[secondaryButton.icon] || <MessageOutlined />}
            onClick={() => navigate(secondaryButton.link)}
            style={{
              height: 56,
              padding: '0 48px',
              fontSize: 18,
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              borderRadius: 12,
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
            {secondaryButton.text}
          </Button>
        </Space>

        {/* 信任标记 */}
        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {trustBadges.map((item: string, idx: number) => (
            <div key={idx} style={{ color: '#94a3b8', fontSize: 15, fontWeight: 500 }}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

CTABanner.displayName = 'CTABanner';
