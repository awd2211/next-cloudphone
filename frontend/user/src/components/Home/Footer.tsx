import React from 'react';
import { Row, Col, Divider } from 'antd';
import { Link } from 'react-router-dom';
import {
  GithubOutlined,
  WechatOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';

interface FooterLink {
  label: string;
  path: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

/**
 * 页脚导航组件
 * 提供产品、开发者、公司、法律等链接导航
 */
export const Footer: React.FC = React.memo(() => {
  const sections: FooterSection[] = [
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

  const contactInfo = [
    { icon: <PhoneOutlined />, text: '400-123-4567' },
    { icon: <MailOutlined />, text: 'support@cloudphone.com' },
    { icon: <WechatOutlined />, text: '微信客服' },
    { icon: <GithubOutlined />, text: 'GitHub' },
  ];

  return (
    <footer
      style={{
        background: '#001529',
        color: 'rgba(255, 255, 255, 0.65)',
        padding: '60px 0 24px',
        marginTop: 80,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* 导航链接区域 */}
        <Row gutter={[48, 32]}>
          {sections.map((section, index) => (
            <Col xs={12} sm={6} key={index}>
              <h3 style={{ color: 'white', fontSize: 16, marginBottom: 20, fontWeight: 600 }}>
                {section.title}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex} style={{ marginBottom: 12 }}>
                    <Link
                      to={link.path}
                      style={{
                        color: 'rgba(255, 255, 255, 0.65)',
                        transition: 'color 0.3s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#1890ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Col>
          ))}
        </Row>

        {/* 联系方式区域 */}
        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.12)', margin: '48px 0 32px' }} />
        <Row gutter={[16, 16]} justify="center" style={{ marginBottom: 32 }}>
          {contactInfo.map((item, index) => (
            <Col key={index}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.65)',
                }}
              >
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            </Col>
          ))}
        </Row>

        {/* 版权信息 */}
        <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255, 255, 255, 0.45)' }}>
          <p style={{ margin: 0 }}>© 2025 云手机平台. All rights reserved.</p>
          <p style={{ margin: '8px 0 0' }}>
            <Link
              to="/legal/icp"
              style={{ color: 'rgba(255, 255, 255, 0.45)', marginRight: 16 }}
            >
              ICP备案号
            </Link>
            <Link
              to="/legal/license"
              style={{ color: 'rgba(255, 255, 255, 0.45)' }}
            >
              营业执照
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';
