import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd';
import {
  RobotOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

const AutomationTools: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <CodeOutlined style={{ fontSize: 32, color: '#f59e0b' }} />,
      title: '脚本录制',
      description: '无需编程，录制操作即可生成自动化脚本',
      benefits: ['可视化录制', '智能识别', '一键回放'],
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#6366f1' }} />,
      title: '定时任务',
      description: '灵活设置执行时间，支持复杂的调度策略',
      benefits: ['Cron 表达式', '循环执行', '条件触发'],
    },
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#10b981' }} />,
      title: '批量执行',
      description: '一键在多台设备上同时执行自动化任务',
      benefits: ['并发执行', '进度监控', '失败重试'],
    },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO
        title="自动化工具 - Ultrathink"
        description="Ultrathink 自动化工具，脚本录制、定时任务、批量执行。无需编程，可视化操作，提升运营效率。"
        keywords="自动化工具,脚本录制,定时任务,批量执行,RPA"
      />

      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          padding: '120px 24px 80px',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}>
            <RobotOutlined /> 核心产品
          </Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>
            自动化工具
          </Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40 }}>
            无需编程，可视化操作，让自动化变得简单
          </Paragraph>
          <Space size="large">
            <Button
              size="large"
              onClick={() => navigate('/login')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'white',
                color: '#f59e0b',
                border: 'none',
                fontWeight: 600,
              }}
            >
              免费试用
            </Button>
          </Space>
        </div>
      </div>

      {/* 核心功能 */}
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>核心功能</Title>
        </div>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} md={8} key={index}>
              <Card hoverable style={{ height: '100%', borderRadius: 12 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>{feature.icon}</div>
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph style={{ color: '#64748b' }}>{feature.description}</Paragraph>
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
    </div>
  );
};

export default AutomationTools;
