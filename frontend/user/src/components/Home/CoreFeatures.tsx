import React from 'react';
import { Row, Col, Card } from 'antd';
import {
  ThunderboltOutlined,
  SafetyOutlined,
  DollarOutlined,
  ApiOutlined,
  ClusterOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  gradient: string;
}

/**
 * Ultrathink 核心功能特性组件
 * 展示平台的6大核心功能
 */
export const CoreFeatures: React.FC = React.memo(() => {
  const features: Feature[] = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 40 }} />,
      title: '极致性能',
      description: '基于 Docker 容器化技术，真实 Android 环境，流畅运行各类应用，响应速度提升 300%',
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.1)',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 40 }} />,
      title: '企业级安全',
      description: '数据隔离存储，端到端加密传输，通过 ISO 27001 认证，7×24 小时实时监控保障',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      icon: <DollarOutlined style={{ fontSize: 40 }} />,
      title: '灵活计费',
      description: '按需付费，无隐藏费用，多种套餐选择，成本降低 60%，性价比行业领先',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    {
      icon: <ApiOutlined style={{ fontSize: 40 }} />,
      title: '完善 API',
      description: '提供 REST API 和 WebSocket 实时通信，支持主流编程语言 SDK，轻松集成',
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    },
    {
      icon: <ClusterOutlined style={{ fontSize: 40 }} />,
      title: '批量管理',
      description: '支持批量操作，图形化管理界面，一键部署应用，管理效率提升 500%',
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.1)',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    },
    {
      icon: <CloudServerOutlined style={{ fontSize: 40 }} />,
      title: '弹性伸缩',
      description: '自动扩容缩容，无需关心基础设施，专注业务核心逻辑，支持全球多地域部署',
      color: '#ec4899',
      bgColor: 'rgba(236, 72, 153, 0.1)',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto 120px', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: 20,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: '#6366f1' }}>
            核心优势
          </span>
        </div>
        <h2
          style={{
            fontSize: 42,
            fontWeight: 800,
            marginBottom: 16,
            letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          为什么选择 Ultrathink
        </h2>
        <p style={{ fontSize: 18, color: '#64748b', maxWidth: 600, margin: '0 auto', lineHeight: 1.8 }}>
          企业级云手机解决方案，助力您的业务快速增长
        </p>
      </div>

      <Row gutter={[32, 32]}>
        {features.map((feature, index) => (
          <Col xs={24} md={12} lg={8} key={index}>
            <Card
              hoverable
              style={{
                height: '100%',
                borderRadius: 16,
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(-8px)';
                card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
                const overlay = card.querySelector('.gradient-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget;
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                const overlay = card.querySelector('.gradient-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '0';
              }}
            >
              {/* 渐变覆盖层 */}
              <div
                className="gradient-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: feature.gradient,
                  opacity: 0,
                  transition: 'opacity 0.4s ease',
                }}
              />

              <div style={{ padding: '16px 8px' }}>
                {/* 图标 */}
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    background: feature.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: feature.color,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 16,
                      background: feature.gradient,
                      opacity: 0.15,
                    }}
                  />
                  {feature.icon}
                </div>

                {/* 标题 */}
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 12,
                    textAlign: 'center',
                    color: '#1e293b',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {feature.title}
                </h3>

                {/* 描述 */}
                <p
                  style={{
                    color: '#64748b',
                    textAlign: 'center',
                    lineHeight: 1.7,
                    fontSize: 15,
                    margin: 0,
                  }}
                >
                  {feature.description}
                </p>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 底部 CTA */}
      <div
        style={{
          marginTop: 64,
          textAlign: 'center',
          padding: '48px 32px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          borderRadius: 20,
          border: '1px solid rgba(99, 102, 241, 0.1)',
        }}
      >
        <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>
          还在犹豫？立即体验
        </h3>
        <p style={{ fontSize: 16, color: '#64748b', marginBottom: 24 }}>
          免费试用 14 天，无需信用卡，随时取消
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: 15, fontWeight: 500 }}>
            <span style={{ fontSize: 20, marginRight: 8 }}>✓</span>
            无需信用卡
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: 15, fontWeight: 500 }}>
            <span style={{ fontSize: 20, marginRight: 8 }}>✓</span>
            即刻开通
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: 15, fontWeight: 500 }}>
            <span style={{ fontSize: 20, marginRight: 8 }}>✓</span>
            专属技术支持
          </div>
        </div>
      </div>
    </div>
  );
});

CoreFeatures.displayName = 'CoreFeatures';
