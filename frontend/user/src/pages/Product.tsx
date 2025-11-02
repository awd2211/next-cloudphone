import React from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, Tag, Timeline, Statistic } from 'antd';
import { CheckCircleOutlined, StarFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { coreFeatures, useCases, platformStats, techStack, roadmapItems } from '@/utils/productData';

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

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', paddingBottom: 80 }}>
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
