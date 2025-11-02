import React from 'react';
import { Row, Col, Card } from 'antd';
import {
  ThunderboltOutlined,
  SafetyOutlined,
  DollarOutlined,
  ApiOutlined,
  ClusterOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

/**
 * 核心功能特性组件
 * 展示平台的6大核心功能
 */
export const CoreFeatures: React.FC = React.memo(() => {
  const features: Feature[] = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 48 }} />,
      title: '高性能',
      description: '基于容器化技术，真实 Android 环境，流畅运行各类应用',
      color: '#1890ff',
      bgColor: '#e6f7ff',
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 48 }} />,
      title: '安全可靠',
      description: '数据隔离存储，7x24 小时监控，99.9% 服务可用性保障',
      color: '#52c41a',
      bgColor: '#f6ffed',
    },
    {
      icon: <DollarOutlined style={{ fontSize: 48 }} />,
      title: '价格实惠',
      description: '灵活的套餐选择，按需付费，无隐藏费用，性价比极高',
      color: '#faad14',
      bgColor: '#fff7e6',
    },
    {
      icon: <ApiOutlined style={{ fontSize: 48 }} />,
      title: 'API 丰富',
      description: '完善的 REST API 和 SDK，轻松集成到现有业务系统',
      color: '#722ed1',
      bgColor: '#f9f0ff',
    },
    {
      icon: <ClusterOutlined style={{ fontSize: 48 }} />,
      title: '批量管理',
      description: '支持批量操作，轻松管理数百台设备，提升运维效率',
      color: '#13c2c2',
      bgColor: '#e6fffb',
    },
    {
      icon: <CloudServerOutlined style={{ fontSize: 48 }} />,
      title: '弹性扩展',
      description: '按需扩容，无需关心基础设施，专注业务核心逻辑',
      color: '#eb2f96',
      bgColor: '#fff0f6',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: 32, marginBottom: 16 }}>核心功能</h2>
        <p style={{ fontSize: 16, color: '#666' }}>
          企业级云手机解决方案，满足各种应用场景
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {features.map((feature, index) => (
          <Col xs={24} md={12} lg={8} key={index}>
            <Card
              hoverable
              style={{
                height: '100%',
                borderRadius: 12,
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: feature.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  color: feature.color,
                }}
              >
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 20, marginBottom: 12, textAlign: 'center' }}>
                {feature.title}
              </h3>
              <p style={{ color: '#666', textAlign: 'center', lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
});

CoreFeatures.displayName = 'CoreFeatures';
