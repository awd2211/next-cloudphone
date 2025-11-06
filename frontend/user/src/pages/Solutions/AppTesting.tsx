import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

const AppTesting: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { title: '兼容性测试', description: '多版本 Android 系统一键测试', benefits: ['10+ 系统版本', '真机环境', '快速切换'] },
    { title: '性能测试', description: 'CPU、内存、网络全面监控', benefits: ['性能指标', '压力测试', '数据分析'] },
    { title: '自动化测试', description: 'UI 自动化、接口测试全覆盖', benefits: ['录制回放', 'CI/CD集成', '报告生成'] },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO title="应用测试 - Ultrathink" description="Ultrathink 应用测试解决方案，兼容性测试、性能测试、自动化测试。提升应用质量。" keywords="应用测试,兼容性测试,性能测试,自动化测试,质量保障" />
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '120px 24px 80px', color: 'white', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}><ExperimentOutlined /> 行业方案</Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>应用测试</Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40 }}>全面的测试解决方案，确保应用质量</Paragraph>
          <Button size="large" onClick={() => navigate('/login')} style={{ height: 56, fontSize: 18, padding: '0 48px', borderRadius: 12, background: 'white', color: '#3b82f6', border: 'none', fontWeight: 600 }}>免费试用</Button>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}><Title level={2}>核心功能</Title></div>
        <Row gutter={[24, 24]}>
          {features.map((f, i) => (
            <Col xs={24} md={8} key={i}>
              <Card hoverable style={{ height: '100%', borderRadius: 12 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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

export default AppTesting;
