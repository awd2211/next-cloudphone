import React from 'react';
import { Row, Col, Divider, Space } from 'antd';
import { Link } from 'react-router-dom';
import {
  GithubOutlined,
  WechatOutlined,
  MailOutlined,
  PhoneOutlined,
  TwitterOutlined,
  LinkedinOutlined,
  YoutubeOutlined,
  InstagramOutlined,
} from '@ant-design/icons';
import { useFooterNavContent } from '@/hooks/useCmsContent';

interface FooterLink {
  label: string;
  path: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

// 图标映射
const socialIconMap: Record<string, React.ReactNode> = {
  GithubOutlined: <GithubOutlined />,
  TwitterOutlined: <TwitterOutlined />,
  LinkedinOutlined: <LinkedinOutlined />,
  WechatOutlined: <WechatOutlined />,
  YoutubeOutlined: <YoutubeOutlined />,
  InstagramOutlined: <InstagramOutlined />,
};

// 默认数据
const defaultSections: FooterSection[] = [
  {
    title: '产品',
    links: [
      { label: '产品介绍', path: '/product' },
      { label: '价格方案', path: '/pricing' },
      { label: '应用市场', path: '/app-market' },
      { label: '设备模板', path: '/device-templates' },
    ],
  },
  {
    title: '开发者',
    links: [
      { label: 'API 文档', path: '/help/api' },
      { label: '使用教程', path: '/help/tutorials' },
      { label: 'SDK 下载', path: '/help/sdk' },
      { label: '开发者社区', path: '/help/community' },
    ],
  },
  {
    title: '公司',
    links: [
      { label: '关于我们', path: '/about' },
      { label: '帮助中心', path: '/help' },
      { label: '联系我们', path: '/contact' },
      { label: '加入我们', path: '/careers' },
    ],
  },
  {
    title: '法律',
    links: [
      { label: '服务条款', path: '/legal/terms' },
      { label: '隐私政策', path: '/legal/privacy' },
      { label: '服务协议', path: '/legal/sla' },
      { label: '安全保障', path: '/legal/security' },
    ],
  },
];

const defaultSocialLinks = [
  { icon: 'GithubOutlined', name: 'GitHub', url: '#' },
  { icon: 'TwitterOutlined', name: 'Twitter', url: '#' },
  { icon: 'LinkedinOutlined', name: 'LinkedIn', url: '#' },
  { icon: 'WechatOutlined', name: 'WeChat', url: '#' },
];

const defaultContactInfo = {
  phone: '400-123-4567',
  email: 'support@ultrathink.com',
  wechat: 'CloudPhone.run_Support',
  serviceHours: '7×24 小时',
};

const defaultBrandInfo = {
  name: 'CloudPhone.run',
  slogan: 'Cloud Phone Platform',
  description: 'CloudPhone.run 致力于为全球企业提供稳定可靠的云端 Android 设备服务，助力业务创新与增长。',
};

const defaultCopyright = {
  text: '© 2025 CloudPhone.run. All rights reserved.',
  links: [
    { label: 'ICP备案号', path: '/legal/icp' },
    { label: '营业执照', path: '/legal/license' },
  ],
};

/**
 * CloudPhone.run 页脚导航组件
 * 提供完整的导航链接和联系信息，内容从 CMS 动态加载
 */
export const Footer: React.FC = React.memo(() => {
  // 从 CMS 获取内容
  const { data: footerContent } = useFooterNavContent();

  const sections = footerContent?.sections || defaultSections;
  const socialLinks = footerContent?.socialLinks || defaultSocialLinks;
  const contactInfo = footerContent?.contactInfo || defaultContactInfo;
  const brandInfo = footerContent?.brandInfo || defaultBrandInfo;
  const copyright = footerContent?.copyright || defaultCopyright;

  return (
    <footer
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        color: 'rgba(255, 255, 255, 0.65)',
        padding: '80px 0 32px',
        marginTop: 0,
        position: 'relative',
      }}
    >
      {/* 顶部分隔线装饰 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent)',
        }}
      />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Logo 和简介 */}
        <Row gutter={[48, 48]} style={{ marginBottom: 64 }}>
          <Col xs={24} lg={8}>
            <div style={{ marginBottom: 20 }}>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <span style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>U</span>
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'white',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {brandInfo.name}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: '#64748b',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {brandInfo.slogan}
                  </p>
                </div>
              </div>

              {/* 简介 */}
              <p
                style={{
                  color: '#94a3b8',
                  lineHeight: 1.8,
                  fontSize: 15,
                  marginBottom: 24,
                }}
              >
                {brandInfo.description}
              </p>

              {/* 社交媒体链接 */}
              <div style={{ display: 'flex', gap: 12 }}>
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: 18,
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                      e.currentTarget.style.color = '#6366f1';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {socialIconMap[social.icon] || <GithubOutlined />}
                  </a>
                ))}
              </div>
            </div>
          </Col>

          {/* 导航链接 */}
          <Col xs={24} lg={16}>
            <Row gutter={[32, 32]}>
              {sections.map((section, index) => (
                <Col xs={12} sm={6} key={index}>
                  <h4
                    style={{
                      color: 'white',
                      fontSize: 16,
                      marginBottom: 20,
                      fontWeight: 700,
                      letterSpacing: '-0.3px',
                    }}
                  >
                    {section.title}
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex} style={{ marginBottom: 12 }}>
                        <Link
                          to={link.path}
                          style={{
                            color: '#94a3b8',
                            fontSize: 15,
                            transition: 'color 0.3s',
                            display: 'inline-block',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#6366f1';
                            e.currentTarget.style.paddingLeft = '4px';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.paddingLeft = '0';
                          }}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>

        {/* 联系方式 */}
        <div
          style={{
            padding: '32px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: 48,
          }}
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6366f1',
                  }}
                >
                  <PhoneOutlined style={{ fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>电话</div>
                  <div style={{ fontSize: 15, color: '#cbd5e1', fontWeight: 500 }}>
                    {contactInfo.phone}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(139, 92, 246, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8b5cf6',
                  }}
                >
                  <MailOutlined style={{ fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>邮箱</div>
                  <div style={{ fontSize: 15, color: '#cbd5e1', fontWeight: 500 }}>
                    {contactInfo.email}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                  }}
                >
                  <WechatOutlined style={{ fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>微信</div>
                  <div style={{ fontSize: 15, color: '#cbd5e1', fontWeight: 500 }}>
                    {contactInfo.wechat}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                  }}
                >
                  <span style={{ fontSize: 18 }}>⏰</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>服务时间</div>
                  <div style={{ fontSize: 15, color: '#cbd5e1', fontWeight: 500 }}>{contactInfo.serviceHours}</div>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* 分隔线 */}
        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '0 0 32px' }} />

        {/* 版权信息 */}
        <Row justify="space-between" align="middle">
          <Col xs={24} md={12} style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              {copyright.text}
            </div>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'center' }}>
            <Space size="large">
              {copyright.links.map((link: { label: string; path: string }, index: number) => (
                <Link key={index} to={link.path} style={{ color: '#64748b', fontSize: 14 }}>
                  {link.label}
                </Link>
              ))}
            </Space>
          </Col>
        </Row>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
