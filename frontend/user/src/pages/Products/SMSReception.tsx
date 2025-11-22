import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag, Statistic, Table } from 'antd';
import {
  MessageOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  ApiOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

/**
 * 短信接收服务产品页面
 * 详细介绍短信接收/验证码服务的功能、特性、使用场景
 */
const SMSReception: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <MessageOutlined style={{ fontSize: 32, color: '#6366f1' }} />,
      title: '实时接收',
      description: '毫秒级短信接收，API 实时推送，确保验证码及时到达',
      benefits: ['< 3秒接收', 'Webhook 推送', '消息队列缓冲'],
    },
    {
      icon: <GlobalOutlined style={{ fontSize: 32, color: '#10b981' }} />,
      title: '全球号码',
      description: '覆盖 150+ 国家和地区，提供真实手机号码接收服务',
      benefits: ['150+ 国家', '虚拟号码池', '号码独占模式'],
    },
    {
      icon: <ApiOutlined style={{ fontSize: 32, color: '#f59e0b' }} />,
      title: 'RESTful API',
      description: '简洁易用的 API 接口，支持主流编程语言 SDK',
      benefits: ['RESTful 设计', '多语言 SDK', '完善文档'],
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#ef4444' }} />,
      title: '高并发支持',
      description: '支持百万级并发请求，弹性扩展，永不限流',
      benefits: ['百万级 QPS', '弹性扩展', '负载均衡'],
    },
    {
      icon: <LockOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />,
      title: '隐私保护',
      description: '短信内容加密存储，7天后自动删除，保护用户隐私',
      benefits: ['端到端加密', '自动清理', '合规认证'],
    },
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#ec4899' }} />,
      title: '智能过滤',
      description: '自动识别验证码、通知类短信，智能分类和提取',
      benefits: ['验证码识别', '关键词提取', '垃圾过滤'],
    },
  ];

  const useCases = [
    {
      title: '账号注册',
      description: '批量注册社交媒体、电商平台账号，获取验证码',
      icon: '📱',
      metrics: ['多平台支持', '批量注册', '成功率 95%+'],
    },
    {
      title: '账号验证',
      description: '登录验证、二次验证、找回密码等场景的短信接收',
      icon: '🔐',
      metrics: ['实时接收', '自动提取', '记录保存'],
    },
    {
      title: '应用测试',
      description: 'App 短信功能测试，无需真实手机号，快速验证',
      icon: '🧪',
      metrics: ['测试环境', '快速部署', '成本节约'],
    },
    {
      title: '营销活动',
      description: '批量接收营销短信，监控推广效果和转化率',
      icon: '📢',
      metrics: ['批量监控', '数据分析', '效果追踪'],
    },
    {
      title: '国际业务',
      description: '海外业务拓展，接收各国短信验证码',
      icon: '🌍',
      metrics: ['全球覆盖', '本地号码', '多语言支持'],
    },
    {
      title: '自动化运营',
      description: '自动化脚本接收验证码，无需人工介入',
      icon: '🤖',
      metrics: ['API 集成', '自动化流程', '7×24 运行'],
    },
  ];

  const advantages = [
    { label: '国家覆盖', value: '150+', icon: <GlobalOutlined /> },
    { label: '接收速度', value: '<3秒', icon: <ThunderboltOutlined /> },
    { label: '成功率', value: '95%+', icon: <CheckCircleOutlined /> },
    { label: '并发支持', value: '100万+', icon: <RocketOutlined /> },
  ];

  const pricingPlans = [
    {
      title: '基础版',
      price: '¥0.5/条',
      features: [
        '支持 50+ 国家',
        '共享号码池',
        '3秒内接收',
        '7天消息保存',
        'RESTful API',
      ],
      color: '#6366f1',
    },
    {
      title: '专业版',
      price: '¥1.0/条',
      features: [
        '支持 150+ 国家',
        '独占号码',
        '实时推送',
        '30天消息保存',
        'Webhook 回调',
      ],
      color: '#10b981',
      recommended: true,
    },
    {
      title: '企业版',
      price: '定制',
      features: [
        '全球覆盖',
        '专属号码段',
        '定制化开发',
        '永久保存',
        '技术支持',
      ],
      color: '#f59e0b',
    },
  ];

  const supportedPlatforms = [
    { name: '微信', count: '95%' },
    { name: 'QQ', count: '92%' },
    { name: '淘宝/天猫', count: '98%' },
    { name: '京东', count: '97%' },
    { name: 'Facebook', count: '90%' },
    { name: 'WhatsApp', count: '88%' },
    { name: 'Twitter', count: '93%' },
    { name: 'Instagram', count: '91%' },
    { name: 'LinkedIn', count: '89%' },
    { name: 'Telegram', count: '94%' },
  ];

  const tableColumns = [
    {
      title: '平台',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '成功率',
      dataIndex: 'count',
      key: 'count',
      render: (text: string) => (
        <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
          {text}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO
        title="短信接收服务 - CloudPhone.run"
        description="提供全球短信接收和验证码服务，覆盖 150+ 国家，实时接收，API 集成，适用于账号注册、应用测试、自动化运营等场景"
        keywords="短信接收,验证码接收,临时手机号,虚拟手机号,SMS接收,验证码API"
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
                  <MessageOutlined /> 全球短信接收服务
                </Tag>

                <Title level={1} style={{ color: '#fff', marginBottom: 0, fontSize: 48, fontWeight: 700 }}>
                  短信验证码接收
                </Title>

                <Paragraph style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: 18, marginBottom: 32 }}>
                  覆盖全球 150+ 国家和地区，实时接收短信验证码<br />
                  为您的账号注册、应用测试、自动化运营提供可靠支持
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
                    onClick={() => navigate('/docs/sms-api')}
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
                    查看文档
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
            企业级短信接收服务，为您的业务提供稳定可靠的验证码支持
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
                styles={{ body: { padding: 32 } }}
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

      {/* 支持平台 */}
      <div style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <Title level={2} style={{ fontSize: 36, fontWeight: 700 }}>
              支持平台
            </Title>
            <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
              支持主流平台的短信验证码接收，成功率高达 95%+
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            <Col xs={24} lg={16} offset={4}>
              <Card style={{ borderRadius: 12 }}>
                <Table
                  dataSource={supportedPlatforms}
                  columns={tableColumns}
                  pagination={false}
                  rowKey="name"
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* 价格方案 */}
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Title level={2} style={{ fontSize: 36, fontWeight: 700 }}>
            选择适合您的方案
          </Title>
          <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
            灵活的计费方式，满足不同规模的业务需求
          </Paragraph>
        </div>

        <Row gutter={[32, 32]}>
          {pricingPlans.map((plan, index) => (
            <Col xs={24} lg={8} key={index}>
              <Card
                style={{
                  height: '100%',
                  borderRadius: 16,
                  border: plan.recommended ? `2px solid ${plan.color}` : '1px solid #e2e8f0',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                styles={{ body: { padding: 32 } }}
              >
                {plan.recommended && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: -30,
                      background: plan.color,
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
                      {plan.title}
                    </Title>
                    <Title level={2} style={{ color: plan.color, marginBottom: 0 }}>
                      {plan.price}
                    </Title>
                  </div>

                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircleOutlined style={{ color: plan.color, marginRight: 12, fontSize: 16 }} />
                        <Text style={{ fontSize: 15 }}>{feature}</Text>
                      </div>
                    ))}
                  </Space>

                  <Button
                    type={plan.recommended ? 'primary' : 'default'}
                    block
                    size="large"
                    onClick={() => navigate('/register')}
                    style={{
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                      borderRadius: 10,
                      ...(plan.recommended && {
                        background: plan.color,
                        borderColor: plan.color,
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

      {/* 应用场景 */}
      <div style={{ background: '#fff', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <Title level={2} style={{ fontSize: 36, fontWeight: 700 }}>
              应用场景
            </Title>
            <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
              短信接收服务适用于多种业务场景
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
                  styles={{ body: { padding: 24 } }}
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
            注册即可获得 50 条免费短信接收额度，体验企业级短信服务
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
              onClick={() => navigate('/docs/sms-api')}
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
              查看 API 文档
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default SMSReception;
