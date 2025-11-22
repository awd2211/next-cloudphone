import React, { useState, useEffect } from 'react';
import { Menu, Button, Space, Drawer, Dropdown, Card, Row, Col, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LoginOutlined,
  UserAddOutlined,
  DashboardOutlined,
  MenuOutlined,
  MobileOutlined,
  AppstoreOutlined,
  ApiOutlined,
  RobotOutlined,
  TrophyOutlined,
  ExperimentOutlined,
  ShoppingOutlined,
  WechatOutlined,
  ThunderboltOutlined,
  ExpandAltOutlined,
  DollarOutlined,
  CustomerServiceOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  FormOutlined,
  RightOutlined,
  WifiOutlined,
  PhoneOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface HeaderProps {
  isLoggedIn?: boolean;
  onLogin?: () => void;
  onRegister?: () => void;
  onDashboard?: () => void;
}

/**
 * CloudPhone.run 首页头部导航组件
 * 现代化设计，支持滚动效果和响应式布局
 */
export const Header: React.FC<HeaderProps> = React.memo(({
  isLoggedIn = false,
  onLogin,
  onRegister,
  onDashboard,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
    setMobileMenuOpen(false);
  };

  // 产品下拉菜单内容 - 优化版
  const productMenuContent = (
    <div style={{ width: 1080, padding: '24px', background: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
      <style>
        {`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes iconRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .product-card {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
          }
          .product-card:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1) !important;
          }
          .product-card:hover .product-icon {
            animation: iconRotate 0.6s ease-in-out;
          }
          .product-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .product-card:hover::before {
            left: 100%;
          }
        `}
      </style>

      <Row gutter={24}>
        {/* 第一栏：核心功能 */}
        <Col span={6}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f0f0f0' }}>
            <Space>
              <div style={{ width: 6, height: 20, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 3 }} />
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>核心功能</Text>
            </Space>
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {[
              { icon: <MobileOutlined />, title: '云手机管理', desc: '一键创建、远程控制', color: '#6366f1', bg: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', path: '/products/cloud-device-management' },
              { icon: <AppstoreOutlined />, title: '应用市场', desc: '海量应用一键安装', color: '#10b981', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', path: '/products/app-market' },
              { icon: <RobotOutlined />, title: '自动化工具', desc: '脚本录制、任务调度', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', path: '/products/automation-tools' },
              { icon: <ApiOutlined />, title: '开放 API', desc: 'RESTful API 集成', color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', path: '/products/open-api' },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="product-card"
                styles={{ body: { padding: 16 } }}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                style={{
                  border: 'none',
                  background: '#fafafa',
                  animation: `slideInUp 0.4s ease-out ${idx * 0.1}s backwards`,
                }}
              >
                <Space align="start">
                  <div
                    className="product-icon"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${item.color}40`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: 14 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '1.4' }}>{item.desc}</Text>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Col>

        {/* 第二栏：行业方案 */}
        <Col span={6}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f0f0f0' }}>
            <Space>
              <div style={{ width: 6, height: 20, background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', borderRadius: 3 }} />
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>行业方案</Text>
            </Space>
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {[
              { icon: <TrophyOutlined />, title: '游戏托管', desc: '24/7 挂机、多开', color: '#ef4444', bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', path: '/solutions/gaming-hosting' },
              { icon: <ExperimentOutlined />, title: '应用测试', desc: '兼容性、性能测试', color: '#3b82f6', bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', path: '/solutions/app-testing' },
              { icon: <ShoppingOutlined />, title: '电商运营', desc: '多账号管理、自动化', color: '#ec4899', bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', path: '/solutions/ecommerce-operations' },
              { icon: <WechatOutlined />, title: '社交媒体', desc: '账号矩阵、内容发布', color: '#10b981', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', path: '/solutions/social-media' },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="product-card"
                styles={{ body: { padding: 16 } }}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                style={{
                  border: 'none',
                  background: '#fafafa',
                  animation: `slideInUp 0.4s ease-out ${idx * 0.1 + 0.2}s backwards`,
                }}
              >
                <Space align="start">
                  <div
                    className="product-icon"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${item.color}40`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: 14 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '1.4' }}>{item.desc}</Text>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Col>

        {/* 第三栏：增值服务 */}
        <Col span={6}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f0f0f0' }}>
            <Space>
              <div style={{ width: 6, height: 20, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', borderRadius: 3 }} />
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>增值服务</Text>
            </Space>
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {[
              { icon: <WifiOutlined />, title: '家宽代理', desc: '真实家宽IP代理服务', color: '#06b6d4', bg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', path: '/products/residential-proxy' },
              { icon: <PhoneOutlined />, title: '短信接收', desc: '全球短信验证码接收', color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', path: '/products/sms-reception' },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="product-card"
                styles={{ body: { padding: 16 } }}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                style={{
                  border: 'none',
                  background: '#fafafa',
                  animation: `slideInUp 0.4s ease-out ${idx * 0.1 + 0.4}s backwards`,
                }}
              >
                <Space align="start">
                  <div
                    className="product-icon"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${item.color}40`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: 14 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '1.4' }}>{item.desc}</Text>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Col>

        {/* 第四栏：产品优势 */}
        <Col span={6}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f0f0f0' }}>
            <Space>
              <div style={{ width: 6, height: 20, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', borderRadius: 3 }} />
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>产品优势</Text>
            </Space>
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {[
              { icon: <ThunderboltOutlined />, title: '高可用保障', desc: '99.9% SLA 保障', color: '#f59e0b', bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', path: '/product#advantages' },
              { icon: <ExpandAltOutlined />, title: '弹性扩展', desc: '秒级扩容、无上限', color: '#6366f1', bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', path: '/product#advantages' },
              { icon: <DollarOutlined />, title: '成本优化', desc: '低至 ¥0.5/小时', color: '#10b981', bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', path: '/pricing' },
              { icon: <CustomerServiceOutlined />, title: '技术支持', desc: '7×24 小时响应', color: '#8b5cf6', bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', path: '/contact' },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="product-card"
                styles={{ body: { padding: 16 } }}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                style={{
                  border: 'none',
                  background: '#fafafa',
                  animation: `slideInUp 0.4s ease-out ${idx * 0.1 + 0.4}s backwards`,
                }}
              >
                <Space align="start">
                  <div
                    className="product-icon"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${item.color}40`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: 14 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '1.4' }}>{item.desc}</Text>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Col>
      </Row>
    </div>
  );

  // 帮助菜单下拉内容
  const helpMenuContent = (
    <div style={{ width: 720, padding: '24px', background: '#fff', borderRadius: 12 }}>
      <style>
        {`
          .help-card {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: none;
            background: #fafafa;
          }
          .help-card:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1) !important;
          }
          .help-card:hover .help-icon {
            animation: iconRotate 0.6s ease-in-out;
          }
          .help-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .help-card:hover::before {
            left: 100%;
          }
        `}
      </style>

      <Row gutter={24}>
        {/* 第一栏：快速入口 */}
        <Col span={12}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f0f0f0' }}>
            <Space>
              <div style={{ width: 6, height: 20, background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', borderRadius: 3 }} />
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>快速入口</Text>
            </Space>
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {[
              { icon: <FileTextOutlined />, title: '帮助文档', desc: '详细的产品使用文档', color: '#1890ff', bg: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', path: '/help/articles' },
              { icon: <QuestionCircleOutlined />, title: '常见问题', desc: '快速找到问题答案', color: '#52c41a', bg: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', path: '/help/faqs' },
              { icon: <PlayCircleOutlined />, title: '视频教程', desc: '通过视频学习功能', color: '#faad14', bg: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)', path: '/help/tutorials' },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="help-card"
                styles={{ body: { padding: 16 } }}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                style={{
                  animation: `slideInUp 0.4s ease-out ${idx * 0.1}s backwards`,
                }}
              >
                <Space align="start">
                  <div
                    className="help-icon"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${item.color}40`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: 14 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '1.4' }}>{item.desc}</Text>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Col>

        {/* 第二栏：热门帮助 */}
        <Col span={12}>
          <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f0f0f0' }}>
            <Space>
              <div style={{ width: 6, height: 20, background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)', borderRadius: 3 }} />
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>获取支持</Text>
            </Space>
          </div>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {[
              { icon: <FormOutlined />, title: '提交工单', desc: '获得专业技术支持', color: '#722ed1', bg: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)', path: '/tickets' },
              { icon: <CustomerServiceOutlined />, title: '在线客服', desc: '7×24 小时在线支持', color: '#eb2f96', bg: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)', path: '/contact' },
              { icon: <BookOutlined />, title: '开发者文档', desc: 'API 接口使用指南', color: '#13c2c2', bg: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)', path: '/docs' },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="help-card"
                styles={{ body: { padding: 16 } }}
                onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                style={{
                  animation: `slideInUp 0.4s ease-out ${idx * 0.1 + 0.15}s backwards`,
                }}
              >
                <Space align="start">
                  <div
                    className="help-icon"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: 'white',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${item.color}40`,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b', fontSize: 14 }}>{item.title}</div>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: '1.4' }}>{item.desc}</Text>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        </Col>
      </Row>

      {/* 底部快速链接 */}
      <div style={{
        marginTop: 24,
        paddingTop: 20,
        borderTop: '1px solid #e8e8e8',
      }}>
        <Row gutter={12}>
          {[
            { text: '帮助中心首页', path: '/help', icon: <RightOutlined style={{ fontSize: 12 }} /> },
            { text: '新手入门指南', path: '/help/getting-started', icon: <RightOutlined style={{ fontSize: 12 }} /> },
            { text: 'API 文档', path: '/docs/api', icon: <RightOutlined style={{ fontSize: 12 }} /> },
            { text: '查看所有文章', path: '/help/articles', icon: <RightOutlined style={{ fontSize: 12 }} /> },
          ].map((link, idx) => (
            <Col span={6} key={idx}>
              <a
                onClick={(e) => { e.preventDefault(); navigate(link.path); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#64748b',
                  textDecoration: 'none',
                  borderRadius: 6,
                  transition: 'all 0.3s',
                  background: '#fafafa',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1890ff10';
                  e.currentTarget.style.color = '#1890ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fafafa';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <span style={{ marginRight: 4 }}>{link.text}</span>
                {link.icon}
              </a>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );

  // 桌面端简单菜单（移除了"帮助"，因为它现在有单独的下拉菜单）
  const menuItems = [
    { key: '/pricing', label: '价格' },
    { key: '/about', label: '关于' },
  ];

  // 移动端菜单（包含产品和帮助子菜单）
  const mobileMenuItems = [
    { key: '/', label: '首页' },
    {
      key: '/product',
      label: '产品',
      children: [
        { key: '/products/cloud-device-management', label: '云手机管理', icon: <MobileOutlined /> },
        { key: '/products/app-market', label: '应用市场', icon: <AppstoreOutlined /> },
        { key: '/products/automation-tools', label: '自动化工具', icon: <RobotOutlined /> },
        { key: '/products/open-api', label: '开放 API', icon: <ApiOutlined /> },
        { key: '/products/residential-proxy', label: '家宽代理', icon: <WifiOutlined /> },
        { key: '/products/sms-reception', label: '短信接收', icon: <PhoneOutlined /> },
      ],
    },
    { key: '/pricing', label: '价格' },
    {
      key: '/help',
      label: '帮助',
      children: [
        { key: '/help/articles', label: '帮助文档', icon: <FileTextOutlined /> },
        { key: '/help/faqs', label: '常见问题', icon: <QuestionCircleOutlined /> },
        { key: '/help/tutorials', label: '视频教程', icon: <PlayCircleOutlined /> },
        { key: '/tickets', label: '提交工单', icon: <FormOutlined /> },
        { key: '/contact', label: '在线客服', icon: <CustomerServiceOutlined /> },
        { key: '/docs', label: '开发者文档', icon: <BookOutlined /> },
      ],
    },
    { key: '/about', label: '关于' },
  ];

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: scrolled
            ? 'rgba(255, 255, 255, 0.8)'
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: scrolled
            ? '1px solid rgba(226, 232, 240, 0.8)'
            : '1px solid transparent',
          boxShadow: scrolled
            ? '0 4px 20px rgba(0, 0, 0, 0.08)'
            : '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: scrolled ? '12px 24px' : '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'padding 0.3s ease',
          }}
        >
          {/* Logo 和品牌名称 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
            }}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div
              style={{
                width: scrolled ? 38 : 44,
                height: scrolled ? 38 : 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
                transition: 'all 0.3s ease',
              }}
            >
              <span
                style={{
                  fontSize: scrolled ? 20 : 24,
                  fontWeight: 'bold',
                  color: 'white',
                  transition: 'font-size 0.3s ease',
                }}
              >
                U
              </span>
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: scrolled ? 20 : 22,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
                transition: 'font-size 0.3s ease',
              }}>
                CloudPhone.run
              </h2>
              <p style={{
                margin: 0,
                fontSize: scrolled ? 10 : 11,
                color: '#64748b',
                letterSpacing: '0.5px',
                fontWeight: 500,
                transition: 'font-size 0.3s ease',
              }}>
                Cloud Phone Platform
              </p>
            </div>
          </div>

          {/* 桌面端导航菜单 */}
          <nav
            style={{
              display: window.innerWidth >= 768 ? 'flex' : 'none',
              alignItems: 'center',
              gap: 32,
              flex: 1,
              justifyContent: 'center',
            }}
            className="desktop-nav"
          >
            {/* 首页链接 */}
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: location.pathname === '/' ? '#6366f1' : '#262626',
                textDecoration: 'none',
                transition: 'color 0.3s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#6366f1'; }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/') {
                  e.currentTarget.style.color = '#262626';
                }
              }}
            >
              首页
            </a>

            {/* 产品下拉菜单 */}
            <Dropdown
              overlay={productMenuContent}
              trigger={['hover']}
              placement="bottomLeft"
            >
              <a
                href="/product"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: location.pathname.startsWith('/product') ? '#6366f1' : '#262626',
                  textDecoration: 'none',
                  transition: 'color 0.3s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#6366f1'; }}
                onMouseLeave={(e) => {
                  if (!location.pathname.startsWith('/product')) {
                    e.currentTarget.style.color = '#262626';
                  }
                }}
              >
                产品 ▾
              </a>
            </Dropdown>

            {/* 帮助下拉菜单 */}
            <Dropdown
              overlay={helpMenuContent}
              trigger={['hover']}
              placement="bottomLeft"
            >
              <a
                href="/help"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: location.pathname.startsWith('/help') ? '#6366f1' : '#262626',
                  textDecoration: 'none',
                  transition: 'color 0.3s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#6366f1'; }}
                onMouseLeave={(e) => {
                  if (!location.pathname.startsWith('/help')) {
                    e.currentTarget.style.color = '#262626';
                  }
                }}
              >
                帮助 ▾
              </a>
            </Dropdown>

            {/* 其他菜单项 */}
            {menuItems.map(item => (
              <a
                key={item.key}
                href={item.key}
                onClick={(e) => { e.preventDefault(); navigate(item.key); }}
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: location.pathname === item.key ? '#6366f1' : '#262626',
                  textDecoration: 'none',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#6366f1'; }}
                onMouseLeave={(e) => {
                  if (location.pathname !== item.key) {
                    e.currentTarget.style.color = '#262626';
                  }
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <style>
            {`
              @media (min-width: 768px) {
                .desktop-nav {
                  display: flex !important;
                }
                .mobile-menu-btn {
                  display: none !important;
                }
              }
              @media (max-width: 767px) {
                .desktop-nav {
                  display: none !important;
                }
              }
            `}
          </style>

          {/* 右侧按钮组 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Space size="middle" className="desktop-nav">
              {isLoggedIn && onDashboard ? (
                <Button
                  type="primary"
                  icon={<DashboardOutlined />}
                  onClick={onDashboard}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    height: 40,
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    padding: '0 20px',
                    boxShadow: '0 2px 12px rgba(99, 102, 241, 0.3)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.transform = 'translateY(-2px)';
                    target.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = '0 2px 12px rgba(99, 102, 241, 0.3)';
                  }}
                >
                  控制台
                </Button>
              ) : (
                <>
                  {onLogin && (
                    <Button
                      icon={<LoginOutlined />}
                      onClick={onLogin}
                      style={{
                        height: 40,
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 14,
                        border: '1.5px solid #e2e8f0',
                        color: '#475569',
                        background: 'white',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.borderColor = '#6366f1';
                        target.style.color = '#6366f1';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.borderColor = '#e2e8f0';
                        target.style.color = '#475569';
                      }}
                    >
                      登录
                    </Button>
                  )}
                  {onRegister && (
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={onRegister}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        border: 'none',
                        height: 40,
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 14,
                        padding: '0 20px',
                        boxShadow: '0 2px 12px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.transform = 'translateY(-2px)';
                        target.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.transform = 'translateY(0)';
                        target.style.boxShadow = '0 2px 12px rgba(99, 102, 241, 0.3)';
                      }}
                    >
                      免费注册
                    </Button>
                  )}
                </>
              )}
            </Space>

            {/* 移动端菜单按钮 */}
            <Button
              className="mobile-menu-btn"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              style={{
                height: 40,
                width: 40,
                borderRadius: 10,
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </div>
        </div>
      </header>

      {/* 移动端抽屉菜单 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>U</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>CloudPhone.run</span>
          </div>
        }
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
      >
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={mobileMenuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            fontSize: 16,
          }}
        />

        <div style={{ marginTop: 24, padding: '16px 0' }}>
          {isLoggedIn && onDashboard ? (
            <Button
              type="primary"
              icon={<DashboardOutlined />}
              onClick={onDashboard}
              block
              size="large"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                height: 48,
              }}
            >
              进入控制台
            </Button>
          ) : (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {onLogin && (
                <Button
                  icon={<LoginOutlined />}
                  onClick={onLogin}
                  block
                  size="large"
                  style={{
                    height: 48,
                    borderRadius: 10,
                    fontWeight: 600,
                    border: '1.5px solid #e2e8f0',
                  }}
                >
                  登录
                </Button>
              )}
              {onRegister && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={onRegister}
                  block
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    height: 48,
                    borderRadius: 10,
                    fontWeight: 600,
                  }}
                >
                  免费注册
                </Button>
              )}
            </Space>
          )}
        </div>
      </Drawer>
    </>
  );
});

Header.displayName = 'Header';
