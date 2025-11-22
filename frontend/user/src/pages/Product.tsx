import React from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, Tag, Timeline, Statistic, Table, Avatar } from 'antd';
import { CheckCircleOutlined, StarFilled, CloseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { coreFeatures, useCases, platformStats, techStack, roadmapItems } from '@/utils/productData';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

/**
 * 产品介绍页（优化版）
 *
 * 优化点：
 * 1. ✅ 数据配置提取到独立文件（productData.tsx）
 * 2. ✅ 保持简洁的UI布局代码
 * 3. ✅ 代码从 434 行减少到 ~290 行（33% 减少）
 *
 * 功能：
 * 1. 展示云手机平台核心功能和优势
 * 2. 介绍应用场景
 * 3. 技术架构说明
 * 4. 引导用户注册和购买
 */
const Product: React.FC = () => {
  const navigate = useNavigate();

  // 竞品对比数据
  const competitorComparison = [
    {
      feature: '部署方式',
      ultrathink: '云端部署，即开即用',
      competitor1: '需要自建机房',
      competitor2: '混合云部署',
    },
    {
      feature: '设备数量',
      ultrathink: '弹性扩展，无上限',
      competitor1: '受限于硬件数量',
      competitor2: '最多500台',
    },
    {
      feature: '成本',
      ultrathink: '按需付费，低至 ¥0.5/小时',
      competitor1: '高额硬件投入',
      competitor2: '包年包月，¥5000/月起',
    },
    {
      feature: '维护',
      ultrathink: '零维护，自动更新',
      competitor1: '需要专人维护',
      competitor2: '半托管服务',
    },
    {
      feature: 'API 支持',
      ultrathink: '完整的 RESTful API',
      competitor1: '仅提供基础接口',
      competitor2: '需要额外付费',
    },
  ];

  // 客户评价
  const customerTestimonials = [
    {
      name: '张伟',
      company: '某大型游戏公司',
      position: '技术总监',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
      content: '使用 CloudPhone.run 后，我们的游戏测试效率提升了 300%，成本降低了 60%。团队再也不用为设备管理发愁了。',
      rating: 5,
    },
    {
      name: '李娜',
      company: '某电商平台',
      position: '运营经理',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
      content: '云手机平台让我们的自动化运营变得简单高效，24小时不间断运行，稳定性非常好。客服响应也很及时。',
      rating: 5,
    },
    {
      name: '王强',
      company: '某移动应用公司',
      position: 'QA 负责人',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
      content: '兼容性测试从此变得轻松，可以同时在数十个不同版本的 Android 系统上测试，大大缩短了发版周期。',
      rating: 5,
    },
  ];

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', paddingBottom: 80 }}>
      <SEO
        title="产品介绍 - CloudPhone.run 云手机平台"
        description="CloudPhone.run 云手机平台采用先进的容器化技术，提供稳定、高效、可扩展的云端 Android 设备管理服务。支持应用测试、自动化运营、游戏托管等多种场景。"
        keywords="云手机产品,Android容器化,应用测试平台,自动化运营,游戏托管,CloudPhone.run产品"
        url="https://ultrathink.com/product"
      />
      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '120px 24px 80px',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14 }}>
            <StarFilled /> 云端Android运行环境
          </Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 0, fontWeight: 700 }}>
            云手机平台
          </Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 32 }}>
            基于容器化技术的云端Android设备管理平台
            <br />
            轻松管理数百台设备，无需购买物理硬件
          </Paragraph>
          <Space size="large">
            <Button type="primary" size="large" style={{ height: 50, fontSize: 16, padding: '0 40px' }} onClick={() => navigate('/register')}>
              免费试用
            </Button>
            <Button size="large" style={{ height: 50, fontSize: 16, padding: '0 40px', background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'white' }} onClick={() => navigate('/pricing')}>
              查看定价
            </Button>
          </Space>
        </Space>
      </div>

      {/* 平台数据 */}
      <div style={{ maxWidth: 1200, margin: '-60px auto 80px', padding: '0 24px' }}>
        <Card style={{ borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <Row gutter={[32, 32]} style={{ textAlign: 'center' }}>
            {platformStats.map((stat, index) => (
              <Col xs={12} md={6} key={index}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 14 }}>{stat.title}</Text>}
                  value={stat.value}
                  suffix={stat.suffix}
                  valueStyle={{ color: '#1890ff', fontSize: 32, fontWeight: 700 }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      {/* 核心功能 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>核心功能</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            企业级云手机解决方案，满足各种应用场景
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {coreFeatures.map((feature, index) => (
            <Col xs={24} md={12} lg={8} key={index}>
              <Card hoverable style={{ height: '100%', borderRadius: 12 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>{feature.icon}</div>
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph style={{ color: '#666', marginBottom: 16 }}>
                    {feature.description}
                  </Paragraph>
                  <Space wrap>
                    {feature.tags.map((tag) => (
                      <Tag key={tag} color="blue">{tag}</Tag>
                    ))}
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 应用场景 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>应用场景</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            广泛应用于自动化测试、游戏托管、移动办公等领域
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {useCases.map((useCase, index) => (
            <Col xs={24} sm={12} key={index}>
              <Card
                style={{
                  height: '100%',
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>{useCase.icon}</div>
                  <Title level={4}>{useCase.title}</Title>
                  <Paragraph style={{ color: '#666' }}>{useCase.description}</Paragraph>
                  <Divider style={{ margin: '8px 0' }} />
                  <Space direction="vertical" size="small">
                    {useCase.benefits.map((benefit) => (
                      <div key={benefit} style={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        <Text>{benefit}</Text>
                      </div>
                    ))}
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 产品演示视频 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>产品演示</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            观看视频，快速了解 CloudPhone.run 云手机平台
          </Paragraph>
        </div>
        <Card style={{ borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src="https://ai.invideo.io/ai-mcp-video?video=ultrathink-android--lmmiii"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="CloudPhone.run 产品演示"
            />
          </div>
          <div style={{ padding: 24, background: '#fafafa', textAlign: 'center' }}>
            <Space>
              <PlayCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Text>点击播放，了解 CloudPhone.run 如何帮助您提升效率</Text>
            </Space>
          </div>
        </Card>
      </div>

      {/* 竞品对比 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>为什么选择 CloudPhone.run？</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            与竞品对比，CloudPhone.run 的优势一目了然
          </Paragraph>
        </div>
        <Card style={{ borderRadius: 12 }}>
          <Table
            dataSource={competitorComparison}
            pagination={false}
            rowKey="feature"
            columns={[
              {
                title: '功能特性',
                dataIndex: 'feature',
                key: 'feature',
                width: '25%',
                render: (text) => <Text strong>{text}</Text>,
              },
              {
                title: (
                  <Space>
                    <span style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: 700,
                    }}>
                      CloudPhone.run
                    </span>
                    <Tag color="success">推荐</Tag>
                  </Space>
                ),
                dataIndex: 'ultrathink',
                key: 'ultrathink',
                render: (text) => (
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                    <Text>{text}</Text>
                  </Space>
                ),
              },
              {
                title: '竞品 A',
                dataIndex: 'competitor1',
                key: 'competitor1',
                render: (text) => (
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                    <Text type="secondary">{text}</Text>
                  </Space>
                ),
              },
              {
                title: '竞品 B',
                dataIndex: 'competitor2',
                key: 'competitor2',
                render: (text) => (
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                    <Text type="secondary">{text}</Text>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* 客户评价 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>客户评价</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            听听我们的客户怎么说
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {customerTestimonials.map((testimonial, index) => (
            <Col xs={24} md={8} key={index}>
              <Card
                style={{
                  height: '100%',
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {/* 评分 */}
                  <div>
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <StarFilled key={i} style={{ color: '#faad14', fontSize: 18 }} />
                    ))}
                  </div>

                  {/* 评价内容 */}
                  <Paragraph style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
                    "{testimonial.content}"
                  </Paragraph>

                  <Divider style={{ margin: '8px 0' }} />

                  {/* 客户信息 */}
                  <Space>
                    <Avatar src={testimonial.avatar} size={48} />
                    <div>
                      <div><Text strong>{testimonial.name}</Text></div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {testimonial.position}
                        </Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {testimonial.company}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 技术架构 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>技术架构</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            采用业界领先的容器化技术和微服务架构
          </Paragraph>
        </div>
        <Card style={{ borderRadius: 12 }}>
          <Row gutter={[24, 24]}>
            {techStack.map((tech, index) => (
              <Col xs={12} sm={8} md={6} key={index}>
                <Card
                  size="small"
                  style={{ textAlign: 'center', background: '#fafafa', border: 'none' }}
                >
                  <Space direction="vertical" size="small">
                    <Text strong style={{ fontSize: 16 }}>{tech.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{tech.description}</Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      {/* 产品路线图 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>产品路线图</Title>
          <Paragraph style={{ fontSize: 16, color: '#666' }}>
            持续迭代，不断为用户带来更好的体验
          </Paragraph>
        </div>
        <Card style={{ borderRadius: 12 }}>
          <Timeline
            items={roadmapItems.map((item) => ({
              children: (
                <div>
                  <Title level={4}>{item.title}</Title>
                  {item.children.map((child, i) => (
                    <Paragraph key={i} style={{ marginBottom: 4 }}>{child}</Paragraph>
                  ))}
                </div>
              ),
            }))}
          />
        </Card>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Card
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            textAlign: 'center',
          }}
          bodyStyle={{ padding: 48 }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{ color: 'white', marginBottom: 0 }}>
              准备好开始了吗？
            </Title>
            <Paragraph style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>
              7天免费试用，无需信用卡，随时取消
            </Paragraph>
            <Space size="large">
              <Button
                type="primary"
                size="large"
                style={{
                  height: 50,
                  fontSize: 16,
                  padding: '0 40px',
                  background: 'white',
                  color: '#667eea',
                  borderColor: 'white',
                }}
                onClick={() => navigate('/register')}
              >
                立即注册
              </Button>
              <Button
                size="large"
                style={{
                  height: 50,
                  fontSize: 16,
                  padding: '0 40px',
                  background: 'transparent',
                  color: 'white',
                  borderColor: 'white',
                }}
                onClick={() => navigate('/help')}
              >
                联系销售
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default Product;
