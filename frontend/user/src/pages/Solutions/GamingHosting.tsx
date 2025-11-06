import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd';
import { TrophyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

const GamingHosting: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { title: '24/7 挂机', description: '全天候自动运行，无需人工值守', benefits: ['自动登录', '断线重连', '异常恢复'] },
    { title: '多开管理', description: '支持单机多开，轻松管理多个账号', benefits: ['批量操作', '账号切换', '数据同步'] },
    { title: '自动化养号', description: '脚本自动执行任务，快速养成账号', benefits: ['任务自动化', '数据统计', '智能策略'] },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO title="游戏托管 - Ultrathink" description="Ultrathink 游戏托管解决方案，24/7挂机、多开、自动化养号。游戏工作室的最佳选择。" keywords="游戏托管,游戏多开,挂机,自动化养号,游戏工作室" />
      <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: '120px 24px 80px', color: 'white', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}><TrophyOutlined /> 行业方案</Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>游戏托管</Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40 }}>24/7 挂机、多开、自动化养号，游戏工作室的最佳选择</Paragraph>
          <Button size="large" onClick={() => navigate('/login')} style={{ height: 56, fontSize: 18, padding: '0 48px', borderRadius: 12, background: 'white', color: '#ef4444', border: 'none', fontWeight: 600 }}>免费试用</Button>
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

export default GamingHosting;
