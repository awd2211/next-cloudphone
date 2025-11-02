import React from 'react';
import { Row, Col, Steps, Card } from 'antd';
import { UserAddOutlined, ShoppingOutlined, MobileOutlined } from '@ant-design/icons';

/**
 * 使用流程组件
 * 展示3步快速开始流程
 */
export const HowItWorks: React.FC = React.memo(() => {
  const steps = [
    {
      icon: <UserAddOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
      title: '注册账号',
      description: '快速注册，1分钟完成',
      time: '1 分钟',
    },
    {
      icon: <ShoppingOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      title: '选择套餐',
      description: '灵活套餐，按需选择',
      time: '30 秒',
    },
    {
      icon: <MobileOutlined style={{ fontSize: 48, color: '#faad14' }} />,
      title: '创建设备',
      description: '一键创建，即刻使用',
      time: '10 秒',
    },
  ];

  return (
    <div style={{ background: '#fafafa', padding: '80px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, marginBottom: 16 }}>如何开始</h2>
          <p style={{ fontSize: 16, color: '#666' }}>
            只需3步，快速体验云手机服务
          </p>
        </div>

        {/* 桌面端：水平步骤条 */}
        <div style={{ display: window.innerWidth >= 768 ? 'block' : 'none', marginBottom: 48 }}>
          <Steps>
            {steps.map((step, index) => (
              <Steps.Step
                key={index}
                title={step.title}
                description={step.description}
                icon={<div style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: '50%', 
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>{step.icon}</div>}
              />
            ))}
          </Steps>
        </div>

        {/* 移动端：卡片展示 */}
        <Row gutter={[24, 24]}>
          {steps.map((step, index) => (
            <Col xs={24} md={8} key={index}>
              <Card
                style={{
                  textAlign: 'center',
                  borderRadius: 12,
                  height: '100%',
                }}
              >
                <div style={{ marginBottom: 24 }}>{step.icon}</div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#1890ff',
                    color: 'white',
                    fontSize: 20,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  {index + 1}
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 12 }}>{step.title}</h3>
                <p style={{ color: '#666', marginBottom: 8 }}>{step.description}</p>
                <p style={{ color: '#1890ff', fontWeight: 600 }}>预计用时：{step.time}</p>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
});

HowItWorks.displayName = 'HowItWorks';
