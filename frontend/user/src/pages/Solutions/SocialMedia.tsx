import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd';
import { WechatOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

const SocialMedia: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { title: '账号矩阵', description: '统一管理多个社交媒体账号', benefits: ['批量管理', '快速切换', '数据同步'] },
    { title: '内容发布', description: '定时发布内容，多平台同步', benefits: ['定时发布', '内容审核', '多平台支持'] },
    { title: '粉丝互动', description: '自动回复、点赞、评论', benefits: ['智能回复', '互动统计', '用户分析'] },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO title="社交媒体 - CloudPhone.run" description="CloudPhone.run 社交媒体解决方案，账号矩阵、内容发布、粉丝互动。社交营销的强力助手。" keywords="社交媒体,账号矩阵,内容发布,粉丝互动,社交营销" />
      <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '120px 24px 80px', color: 'white', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}><WechatOutlined /> 行业方案</Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>社交媒体</Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40 }}>高效管理社交媒体矩阵，提升营销效果</Paragraph>
          <Button size="large" onClick={() => navigate('/login')} style={{ height: 56, fontSize: 18, padding: '0 48px', borderRadius: 12, background: 'white', color: '#10b981', border: 'none', fontWeight: 600 }}>免费试用</Button>
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

export default SocialMedia;
