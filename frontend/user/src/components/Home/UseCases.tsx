import React from 'react';
import { Row, Col, Card } from 'antd';
import { BugOutlined, RobotOutlined, TrophyOutlined, LaptopOutlined } from '@ant-design/icons';

interface UseCase {
  icon: React.ReactNode;
  title: string;
  description: string;
  users: string;
  color: string;
  bgColor: string;
}

/**
 * 应用场景组件
 * 展示4大典型应用场景
 */
export const UseCases: React.FC = React.memo(() => {
  const useCases: UseCase[] = [
    {
      icon: <BugOutlined style={{ fontSize: 48 }} />,
      title: 'APP 测试',
      description: '自动化测试、兼容性测试、性能测试，覆盖多机型多版本',
      users: '开发者 & 测试团队',
      color: '#1890ff',
      bgColor: '#e6f7ff',
    },
    {
      icon: <RobotOutlined style={{ fontSize: 48 }} />,
      title: '自动化任务',
      description: '批量操作、脚本执行、定时任务，提升效率10倍以上',
      users: '运营团队 & 工作室',
      color: '#52c41a',
      bgColor: '#f6ffed',
    },
    {
      icon: <TrophyOutlined style={{ fontSize: 48 }} />,
      title: '游戏多开',
      description: '云端多开，无需购买硬件，随时扩容，降本增效',
      users: '游戏工作室 & 玩家',
      color: '#faad14',
      bgColor: '#fff7e6',
    },
    {
      icon: <LaptopOutlined style={{ fontSize: 48 }} />,
      title: '移动办公',
      description: '远程访问，数据安全，多人协作，随时随地办公',
      users: '企业 & 团队',
      color: '#722ed1',
      bgColor: '#f9f0ff',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: 32, marginBottom: 16 }}>应用场景</h2>
        <p style={{ fontSize: 16, color: '#666' }}>
          广泛应用于自动化测试、游戏托管、移动办公等领域
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {useCases.map((useCase, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
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
                  background: useCase.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  color: useCase.color,
                }}
              >
                {useCase.icon}
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
                {useCase.title}
              </h3>
              <p style={{ color: '#666', textAlign: 'center', marginBottom: 16, lineHeight: 1.6, minHeight: 60 }}>
                {useCase.description}
              </p>
              <div
                style={{
                  textAlign: 'center',
                  padding: '8px 16px',
                  background: useCase.bgColor,
                  borderRadius: 20,
                  color: useCase.color,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {useCase.users}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
});

UseCases.displayName = 'UseCases';
