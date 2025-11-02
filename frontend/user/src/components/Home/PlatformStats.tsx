import React from 'react';
import { Row, Col, Statistic, Card } from 'antd';
import { UserOutlined, MobileOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';

export interface PlatformStatsData {
  users: string;
  devices: string;
  uptime: string;
  companies: string;
}

interface PlatformStatsProps {
  data: PlatformStatsData;
}

/**
 * 平台数据统计组件
 * 展示用户数、设备数、可用性、企业客户数等关键指标
 */
export const PlatformStats: React.FC<PlatformStatsProps> = React.memo(({ data }) => {
  const stats = [
    {
      title: '注册用户',
      value: data.users,
      icon: <UserOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      color: '#1890ff',
    },
    {
      title: '在线设备',
      value: data.devices,
      icon: <MobileOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      color: '#52c41a',
    },
    {
      title: '服务可用性',
      value: data.uptime,
      icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      color: '#faad14',
    },
    {
      title: '企业客户',
      value: data.companies,
      icon: <TeamOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      color: '#722ed1',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '-60px auto 80px', padding: '0 24px' }}>
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
      >
        <Row gutter={[32, 32]}>
          {stats.map((stat, index) => (
            <Col xs={12} md={6} key={index}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 16 }}>{stat.icon}</div>
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  valueStyle={{ color: stat.color, fontSize: 28, fontWeight: 600 }}
                />
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
});

PlatformStats.displayName = 'PlatformStats';
