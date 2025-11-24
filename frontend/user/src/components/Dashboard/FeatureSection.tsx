import React from 'react';
import { Row, Col, Card, theme } from 'antd';
import { ThunderboltOutlined, SafetyOutlined, DollarOutlined } from '@ant-design/icons';

const { useToken } = theme;

/**
 * 特性介绍区域组件
 * 展示平台的核心特性
 */
export const FeatureSection: React.FC = React.memo(() => {
  const { token } = useToken();

  const features = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 48, color: token.colorPrimary }} />,
      title: '高性能',
      description: '高性能云服务器，流畅运行 Android 系统',
      backgroundColor: token.colorPrimaryBg,
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 48, color: token.colorSuccess }} />,
      title: '安全可靠',
      description: '数据隔离存储，7x24 小时监控保障',
      backgroundColor: token.colorSuccessBg,
    },
    {
      icon: <DollarOutlined style={{ fontSize: 48, color: token.colorWarning }} />,
      title: '价格实惠',
      description: '灵活的套餐选择，按需付费更省钱',
      backgroundColor: token.colorWarningBg,
    },
  ];

  return (
    <div style={{ marginTop: 80, marginBottom: 80 }}>
      <h2 style={{ textAlign: 'center', fontSize: 32, marginBottom: 48 }}>
        为什么选择我们
      </h2>

      <Row gutter={[48, 48]}>
        {features.map((feature, index) => (
          <Col key={index} xs={24} md={8}>
            <Card
              hoverable
              style={{ textAlign: 'center', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: feature.backgroundColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 20, marginBottom: 12 }}>{feature.title}</h3>
              <p style={{ color: token.colorTextSecondary }}>{feature.description}</p>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
});

FeatureSection.displayName = 'FeatureSection';
