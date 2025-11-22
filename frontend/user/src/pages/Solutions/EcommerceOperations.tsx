import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd';
import { ShoppingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

const EcommerceOperations: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { title: '多账号管理', description: '统一管理多个电商平台账号', benefits: ['批量登录', '账号分组', '数据隔离'] },
    { title: '自动化运营', description: '自动下单、抢购、秒杀', benefits: ['定时任务', '智能抢购', '库存监控'] },
    { title: '数据采集', description: '商品信息、价格、评论批量采集', benefits: ['多平台支持', '数据导出', '定期更新'] },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO title="电商运营 - CloudPhone.run" description="CloudPhone.run 电商运营解决方案，多账号管理、自动化运营、数据采集。提升运营效率。" keywords="电商运营,多账号管理,自动化运营,数据采集,电商自动化" />
      <div style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', padding: '120px 24px 80px', color: 'white', textAlign: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}><ShoppingOutlined /> 行业方案</Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>电商运营</Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40 }}>智能化电商运营，提升业务效率</Paragraph>
          <Button size="large" onClick={() => navigate('/login')} style={{ height: 56, fontSize: 18, padding: '0 48px', borderRadius: 12, background: 'white', color: '#ec4899', border: 'none', fontWeight: 600 }}>免费试用</Button>
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

export default EcommerceOperations;
