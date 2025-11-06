import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag, Statistic } from 'antd';
import {
  GlobalOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  CloudOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  SyncOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

/**
 * 家宽代理产品页面
 * 详细介绍家宽代理服务的功能、特性、使用场景
 */
const ResidentialProxy: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <GlobalOutlined style={{ fontSize: 32, color: '#6366f1' }} />,
      title: '真实家宽 IP',
      description: '采用真实家庭宽带 IP，模拟真实用户行为，降低被封风险',
      benefits: ['ISP 级别真实 IP', '高匿名性', '低封禁率'],
    },
    {
      icon: <EnvironmentOutlined style={{ fontSize: 32, color: '#10b981' }} />,
      title: '全球覆盖',
      description: '覆盖 200+ 国家和地区，3000万+ IP 池，精准定位',
      benefits: ['200+ 国家', '城市级定位', '运营商选择'],
    },
    {
      icon: <SyncOutlined style={{ fontSize: 32, color: '#f59e0b' }} />,
      title: '智能轮换',
      description: '支持固定 IP 和自动轮换，灵活配置轮换策略',
      benefits: ['按请求轮换', '按时间轮换', '固定会话保持'],
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#ef4444' }} />,
      title: '高速稳定',
      description: '千兆带宽接入，智能路由优化，平均响应时间 < 300ms',
      benefits: ['千兆带宽', '智能路由', '99.9% 可用性'],
    },
    {
      icon: <LockOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />,
      title: '安全加密',
      description: 'HTTPS/SOCKS5 双协议支持，数据传输全程加密',
      benefits: ['HTTP/HTTPS', 'SOCKS5', '数据加密'],
    },
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#ec4899' }} />,
      title: '弹性计费',
      description: '按流量或按 IP 数量计费，灵活选择最适合的方案',
      benefits: ['按流量计费', '按 IP 计费', '套餐优惠'],
    },
  ];

  const useCases = [
    {
      title: '数据采集',
      description: '大规模网页数据抓取，突破反爬虫限制，获取公开数据',
      icon: '🕷️',
      metrics: ['百万级请求/天', '自动重试机制', '智能反反爬'],
    },
    {
      title: '价格监控',
      description: '电商价格监控、竞品分析，实时获取市场数据',
      icon: '💰',
      metrics: ['多平台支持', '实时监控', '价格趋势分析'],
    },
    {
      title: '广告验证',
      description: '验证广告投放效果，检测点击欺诈，保护广告预算',
      icon: '📊',
      metrics: ['多地域验证', '点击追踪', '欺诈检测'],
    },
    {
      title: '账号管理',
      description: '社交媒体多账号管理，降低关联风险，提高账号存活率',
      icon: '👥',
      metrics: ['账号防关联', 'IP 独立性', '自动切换'],
    },
    {
      title: 'SEO 监控',
      description: '多地域搜索引擎排名监控，分析 SEO 效果',
      icon: '🔍',
      metrics: ['全球排名', '竞品对比', '关键词追踪'],
    },
    {
      title: '品牌保护',
      description: '监控品牌在全球市场的展示，防止盗版和侵权',
      icon: '🛡️',
      metrics: ['全网监控', '侵权检测', '自动预警'],
    },
  ];

  const advantages = [
    { label: 'IP 池大小', value: '3000万+', icon: <GlobalOutlined /> },
    { label: '国家覆盖', value: '200+', icon: <EnvironmentOutlined /> },
    { label: '响应时间', value: '<300ms', icon: <ThunderboltOutlined /> },
    { label: '成功率', value: '99.5%', icon: <CheckCircleOutlined /> },
  ];

  const proxyTypes = [
    {
      title: '静态住宅代理',
      price: '¥5/IP/天',
      features: [
        '固定 IP 地址',
        '会话保持 24 小时',
        '独享带宽',
        '适合长期任务',
        '账号注册/登录',
      ],
      color: '#6366f1',
    },
    {
      title: '动态住宅代理',
      price: '¥50/GB',
      features: [
        '自动 IP 轮换',
        '按流量计费',
        '不限并发',
        '适合数据采集',
        '价格监控',
      ],
      color: '#10b981',
      recommended: true,
    },
    {
      title: '移动代理',
      price: '¥10/GB',
      features: [
        '真实移动网络 IP',
        '4G/5G 网络',
        '运营商级 IP',
        '适合移动端业务',
        'App 数据采集',
      ],
      color: '#f59e0b',
    },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO
        title="家宽代理服务 - Ultrathink"
        description="提供真实家庭宽带 IP 代理，覆盖全球 200+ 国家，3000万+ IP 池，支持数据采集、价格监控、广告验证等场景"
        keywords="家宽代理,住宅代理,IP代理,数据采集,爬虫代理,真实IP"
      />

      {/* 头部横幅 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '80px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景装饰 */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={14}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Tag
                  color="rgba(255, 255, 255, 0.3)"
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: 20,
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <GlobalOutlined /> 全球家宽代理网络
                </Tag>

                <Title level={1} style={{ color: '#fff', marginBottom: 0, fontSize: 48, fontWeight: 700 }}>
                  真实家宽 IP 代理
                </Title>

                <Paragraph style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 18, marginBottom: 32 }}>
                  3000万+ 真实家庭宽带 IP，覆盖全球 200+ 国家和地区<br />
                  为您的数据采集、价格监控、广告验证业务保驾护航
                </Paragraph>

                <Space size="middle">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => navigate('/register')}
                    style={{
                      height: 48,
                      padding: '0 32px',
                      fontSize: 16,
                      fontWeight: 600,
                      background: '#fff',
                      color: '#667eea',
                      border: 'none',
                      borderRadius: 10,
                    }}
                  >
                    免费试用
                  </Button>
                  <Button
                    size="large"
                    onClick={() => navigate('/pricing')}
                    style={{
                      height: 48,
                      padding: '0 32px',
                      fontSize: 16,
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      borderRadius: 10,
                    }}
                  >
                    查看价格
                  </Button>
                </Space>
              </Space>
            </Col>

            <Col xs={24} lg={10}>
              <Row gutter={[16, 16]}>
                {advantages.map((item, index) => (
                  <Col span={12} key={index}>
                    <Card
                      style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        textAlign: 'center',
                      }}
                    >
                      <Statistic
                        title={<span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>{item.label}</span>}
                        value={item.value}
                        prefix={React.cloneElement(item.icon, { style: { color: '#fff' } })}
                        valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        </div>
      </div>

      {/* 核心特性 */}
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Title level={2} style={{ fontSize: 36, fontWeight: 700 }}>
            核心特性
          </Title>
          <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
            企业级家宽代理服务，为您的业务提供稳定可靠的网络支持
          </Paragraph>
        </div>

        <Row gutter={[32, 32]}>
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
                bodyStyle={{ padding: 32 }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {feature.icon}
                  </div>

                  <div>
                    <Title level={4} style={{ marginBottom: 8 }}>
                      {feature.title}
                    </Title>
                    <Paragraph style={{ color: '#64748b', marginBottom: 16 }}>
                      {feature.description}
                    </Paragraph>

                    <Space direction="vertical" size={8}>
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} />
                          <Text style={{ fontSize: 14, color: '#475569' }}>{benefit}</Text>
                        </div>
                      ))}
                    </Space>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 代理类型对比 */}
      <div style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <Title level={2} style={{ fontSize: 36, fontWeight: 700 }}>
              选择适合您的代理类型
            </Title>
            <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
              灵活的计费方式，满足不同业务需求
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {proxyTypes.map((type, index) => (
              <Col xs={24} lg={8} key={index}>
                <Card
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    border: type.recommended ? `2px solid ${type.color}` : '1px solid #e2e8f0',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  bodyStyle={{ padding: 32 }}
                >
                  {type.recommended && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 20,
                        right: -30,
                        background: type.color,
                        color: '#fff',
                        padding: '4px 40px',
                        fontSize: 12,
                        fontWeight: 600,
                        transform: 'rotate(45deg)',
                      }}
                    >
                      推荐
                    </div>
                  )}

                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Title level={3} style={{ marginBottom: 8 }}>
                        {type.title}
                      </Title>
                      <Title level={2} style={{ color: type.color, marginBottom: 0 }}>
                        {type.price}
                      </Title>
                    </div>

                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {type.features.map((feature, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleOutlined style={{ color: type.color, marginRight: 12, fontSize: 16 }} />
                          <Text style={{ fontSize: 15 }}>{feature}</Text>
                        </div>
                      ))}
                    </Space>

                    <Button
                      type={type.recommended ? 'primary' : 'default'}
                      block
                      size="large"
                      onClick={() => navigate('/register')}
                      style={{
                        height: 48,
                        fontSize: 16,
                        fontWeight: 600,
                        borderRadius: 10,
                        ...(type.recommended && {
                          background: type.color,
                          borderColor: type.color,
                        }),
                      }}
                    >
                      立即购买
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* 应用场景 */}
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Title level={2} style={{ fontSize: 36, fontWeight: 700 }}>
            应用场景
          </Title>
          <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
            家宽代理适用于多种业务场景，助力您的业务增长
          </Paragraph>
        </div>

        <Row gutter={[24, 24]}>
          {useCases.map((useCase, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
                bodyStyle={{ padding: 24 }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div style={{ fontSize: 48 }}>{useCase.icon}</div>
                  <div>
                    <Title level={4} style={{ marginBottom: 8 }}>
                      {useCase.title}
                    </Title>
                    <Paragraph style={{ color: '#64748b', marginBottom: 16 }}>
                      {useCase.description}
                    </Paragraph>

                    <Space direction="vertical" size={4}>
                      {useCase.metrics.map((metric, idx) => (
                        <Tag key={idx} color="blue" style={{ marginRight: 0 }}>
                          {metric}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA 区域 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Title level={2} style={{ color: '#fff', fontSize: 36, marginBottom: 16 }}>
            准备好开始了吗？
          </Title>
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 18, marginBottom: 32 }}>
            注册即可获得 5GB 免费流量，体验企业级家宽代理服务
          </Paragraph>
          <Space size="middle">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/register')}
              style={{
                height: 56,
                padding: '0 48px',
                fontSize: 18,
                fontWeight: 600,
                background: '#fff',
                color: '#667eea',
                border: 'none',
                borderRadius: 12,
              }}
            >
              免费注册
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/contact')}
              style={{
                height: 56,
                padding: '0 48px',
                fontSize: 18,
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: 12,
              }}
            >
              联系销售
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default ResidentialProxy;
