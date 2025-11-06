import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd';
import { ApiOutlined, CodeOutlined, SafetyOutlined, RocketOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

const OpenAPI: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { icon: <ApiOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />, title: 'RESTful API', description: '标准化的API设计，易于集成', benefits: ['完整文档', 'Postman集合', 'SDK支持'] },
    { icon: <SafetyOutlined style={{ fontSize: 32, color: '#ef4444' }} />, title: '安全认证', description: 'OAuth2.0 + API Key双重认证', benefits: ['权限管理', 'IP白名单', '流量控制'] },
    { icon: <RocketOutlined style={{ fontSize: 32, color: '#10b981' }} />, title: '高性能', description: '毫秒级响应，支持高并发访问', benefits: ['CDN加速', '负载均衡', '弹性扩容'] },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO title="开放 API - Ultrathink" description="Ultrathink 开放 API，RESTful 设计，完整文档，SDK 支持。轻松集成到您的系统。" keywords="开放API,RESTful,SDK,API文档,集成" />
      <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', padding: '120px 24px 80px', color: 'white', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}><ApiOutlined /> 核心产品</Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>开放 API</Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40 }}>强大的API能力，轻松集成到您的系统</Paragraph>
          <Button size="large" onClick={() => navigate('/login')} style={{ height: 56, fontSize: 18, padding: '0 48px', borderRadius: 12, background: 'white', color: '#8b5cf6', border: 'none', fontWeight: 600 }}>查看文档</Button>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}><Title level={2}>核心功能</Title></div>
        <Row gutter={[24, 24]}>
          {features.map((f, i) => (
            <Col xs={24} md={8} key={i}>
              <Card hoverable style={{ height: '100%', borderRadius: 12 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>{f.icon}</div>
                  <Title level={4}>{f.title}</Title>
                  <Paragraph style={{ color: '#64748b' }}>{f.description}</Paragraph>
                  <div>{f.benefits.map((b, j) => (<div key={j} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}><CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} /><Text>{b}</Text></div>))}</div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default OpenAPI;
