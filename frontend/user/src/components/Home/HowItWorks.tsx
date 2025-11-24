import React from 'react';
import { Row, Col, Steps, Card, theme } from 'antd';
import { UserAddOutlined, ShoppingOutlined, MobileOutlined, RocketOutlined, SettingOutlined, CloudOutlined } from '@ant-design/icons';
import { useHowItWorksContent } from '@/hooks/useCmsContent';

const { useToken } = theme;

interface Step {
  icon: string;
  title: string;
  description: string;
  time: string;
  color: string;
}

// 图标映射
const iconMap: Record<string, (color: string) => React.ReactNode> = {
  UserAddOutlined: (color) => <UserAddOutlined style={{ fontSize: 48, color }} />,
  ShoppingOutlined: (color) => <ShoppingOutlined style={{ fontSize: 48, color }} />,
  MobileOutlined: (color) => <MobileOutlined style={{ fontSize: 48, color }} />,
  RocketOutlined: (color) => <RocketOutlined style={{ fontSize: 48, color }} />,
  SettingOutlined: (color) => <SettingOutlined style={{ fontSize: 48, color }} />,
  CloudOutlined: (color) => <CloudOutlined style={{ fontSize: 48, color }} />,
};

// 默认数据（回退用）
const defaultSteps: Step[] = [
  { icon: 'UserAddOutlined', title: '注册账号', description: '快速注册，1分钟完成', time: '1 分钟', color: '#1677ff' },
  { icon: 'ShoppingOutlined', title: '选择套餐', description: '灵活套餐，按需选择', time: '30 秒', color: '#52c41a' },
  { icon: 'MobileOutlined', title: '创建设备', description: '一键创建，即刻使用', time: '10 秒', color: '#faad14' },
];

/**
 * 使用流程组件
 * 展示3步快速开始流程，内容从 CMS 动态加载
 */
export const HowItWorks: React.FC = React.memo(() => {
  const { token } = useToken();
  // 从 CMS 获取内容
  const { data: howItWorksContent } = useHowItWorksContent();

  const steps = howItWorksContent?.steps || defaultSteps;
  const sectionTitle = howItWorksContent?.sectionTitle || '如何开始';
  const sectionSubtitle = howItWorksContent?.sectionSubtitle || '只需3步，快速体验云手机服务';

  return (
    <div style={{ background: token.colorBgLayout, padding: '80px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 32, marginBottom: 16 }}>{sectionTitle}</h2>
          <p style={{ fontSize: 16, color: token.colorTextSecondary }}>
            {sectionSubtitle}
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
                }}>{iconMap[step.icon]?.(step.color) || <UserAddOutlined style={{ fontSize: 48, color: step.color }} />}</div>}
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
                <div style={{ marginBottom: 24 }}>{iconMap[step.icon]?.(step.color) || <UserAddOutlined style={{ fontSize: 48, color: step.color }} />}</div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: token.colorPrimary,
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
                <p style={{ color: token.colorTextSecondary, marginBottom: 8 }}>{step.description}</p>
                <p style={{ color: token.colorPrimary, fontWeight: 600 }}>预计用时：{step.time}</p>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
});

HowItWorks.displayName = 'HowItWorks';
