import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag, Statistic } from 'antd';
import {
  AppstoreOutlined,
  CloudDownloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ApiOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

const AppMarket: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <AppstoreOutlined style={{ fontSize: 32, color: '#10b981' }} />,
      title: '海量应用',
      description: '覆盖主流应用商店，10万+ 应用随时安装',
      benefits: ['热门应用', '游戏大全', '工具软件', '定期更新'],
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#6366f1' }} />,
      title: '一键安装',
      description: '搜索、下载、安装一气呵成，省时省力',
      benefits: ['批量安装', '自动更新', '版本管理'],
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#ef4444' }} />,
      title: '安全检测',
      description: '所有应用经过安全扫描，确保无病毒无恶意代码',
      benefits: ['病毒扫描', '权限分析', '隐私保护'],
    },
    {
      icon: <CloudDownloadOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />,
      title: '版本管理',
      description: '支持多版本共存，随时切换到任意历史版本',
      benefits: ['版本回退', '版本对比', '增量更新'],
    },
    {
      icon: <ApiOutlined style={{ fontSize: 32, color: '#f59e0b' }} />,
      title: 'API 集成',
      description: '提供完整 API，轻松集成到您的管理系统',
      benefits: ['RESTful API', 'SDK 支持', '丰富文档'],
    },
    {
      icon: <SyncOutlined style={{ fontSize: 32, color: '#ec4899' }} />,
      title: '自动同步',
      description: '设备间应用状态自动同步，配置一次处处可用',
      benefits: ['配置同步', '数据同步', '批量部署'],
    },
  ];

  const stats = [
    { title: '应用总数', value: 100000, suffix: '+', prefix: '', color: '#6366f1' },
    { title: '日均安装', value: 50000, suffix: '+', prefix: '', color: '#10b981' },
    { title: '热门分类', value: 30, suffix: '+', prefix: '', color: '#f59e0b' },
    { title: '用户评分', value: 4.8, suffix: '/5.0', prefix: '', color: '#ef4444' },
  ];

  const categories = [
    { name: '社交通讯', count: '15,000+', icon: '💬', color: '#6366f1' },
    { name: '游戏娱乐', count: '25,000+', icon: '🎮', color: '#10b981' },
    { name: '生活服务', count: '12,000+', icon: '🏠', color: '#f59e0b' },
    { name: '购物消费', count: '8,000+', icon: '🛒', color: '#ef4444' },
    { name: '工具效率', count: '18,000+', icon: '🔧', color: '#8b5cf6' },
    { name: '影音娱乐', count: '10,000+', icon: '🎬', color: '#ec4899' },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO
        title="应用市场 - Ultrathink"
        description="Ultrathink 应用市场提供10万+应用，一键安装，批量部署，安全可靠。支持自动更新、版本管理、API集成。"
        keywords="应用市场,APK安装,批量部署,应用管理,Android应用"
      />

      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '120px 24px 80px',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}>
            <AppstoreOutlined /> 核心产品
          </Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>
            应用市场
          </Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40, maxWidth: 800, margin: '0 auto 40px' }}>
            10万+ 应用随心选，一键安装批量部署
            <br />
            安全可靠，版本管理，让应用分发变得简单高效
          </Paragraph>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'white',
                color: '#10b981',
                border: 'none',
                fontWeight: 600,
              }}
            >
              立即体验
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/contact')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                fontWeight: 600,
              }}
            >
              联系销售
            </Button>
          </Space>
        </div>
      </div>

      {/* 数据统计 */}
      <div style={{ maxWidth: 1200, margin: '-60px auto 80px', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <Card style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          <Row gutter={[32, 32]}>
            {stats.map((stat, index) => (
              <Col xs={12} md={6} key={index}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 14 }}>{stat.title}</Text>}
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                  valueStyle={{ color: stat.color, fontSize: 32, fontWeight: 700 }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      {/* 应用分类 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>热门分类</Title>
          <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
            覆盖30+应用分类，满足各类使用需求
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {categories.map((category, index) => (
            <Col xs={12} md={8} lg={4} key={index}>
              <Card
                hoverable
                style={{ textAlign: 'center', borderRadius: 12, border: `2px solid ${category.color}20` }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>{category.icon}</div>
                <Title level={5} style={{ marginBottom: 8 }}>{category.name}</Title>
                <Text type="secondary">{category.count}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 核心功能 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>核心功能</Title>
          <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
            全方位的应用管理能力，简化应用分发流程
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} md={12} lg={8} key={index}>
              <Card
                hoverable
                style={{ height: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>{feature.icon}</div>
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph style={{ color: '#64748b', marginBottom: 16 }}>
                    {feature.description}
                  </Paragraph>
                  <div>
                    {feature.benefits.map((benefit, i) => (
                      <div key={i} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                        <CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} />
                        <Text>{benefit}</Text>
                      </div>
                    ))}
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA Section */}
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <Card
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: 16,
            border: 'none',
            textAlign: 'center',
          }}
          bodyStyle={{ padding: 64 }}
        >
          <Title level={2} style={{ color: 'white', marginBottom: 16 }}>
            立即开始使用应用市场
          </Title>
          <Paragraph style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', marginBottom: 32 }}>
            10万+ 应用等你来探索，7天免费试用
          </Paragraph>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'white',
                color: '#10b981',
                border: 'none',
                fontWeight: 600,
              }}
            >
              免费试用
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/pricing')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'transparent',
                color: 'white',
                border: '2px solid white',
                fontWeight: 600,
              }}
            >
              查看定价
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default AppMarket;
