import React from 'react';
import { Card, Row, Col, Button, Typography, Space, Tag } from 'antd';
import {
  MobileOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  SettingOutlined,
  SafetyOutlined,
  CloudOutlined,
  RocketOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components';

const { Title, Paragraph, Text } = Typography;

/**
 * 云手机管理产品页面
 * 详细介绍云手机管理功能、特性、使用场景
 */
const CloudDeviceManagement: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#6366f1' }} />,
      title: '一键创建',
      description: '秒级创建云手机实例，预装常用应用，开箱即用',
      benefits: ['支持批量创建', '自定义配置', '模板快速部署'],
    },
    {
      icon: <CloudOutlined style={{ fontSize: 32, color: '#10b981' }} />,
      title: '远程控制',
      description: 'WebRTC 实时画面传输，流畅操作体验',
      benefits: ['超低延迟', '高清画质', '触控手势支持'],
    },
    {
      icon: <SettingOutlined style={{ fontSize: 32, color: '#f59e0b' }} />,
      title: '批量操作',
      description: '支持批量安装应用、批量执行命令、批量管理',
      benefits: ['批量安装卸载', '批量配置修改', '批量数据同步'],
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 32, color: '#ef4444' }} />,
      title: '安全隔离',
      description: '容器化技术，每个云手机独立隔离，数据安全可靠',
      benefits: ['数据加密', '网络隔离', '访问控制'],
    },
    {
      icon: <AppstoreOutlined style={{ fontSize: 32, color: '#8b5cf6' }} />,
      title: '快照备份',
      description: '随时创建设备快照，快速恢复到任意状态',
      benefits: ['一键备份', '快速恢复', '版本管理'],
    },
    {
      icon: <RocketOutlined style={{ fontSize: 32, color: '#ec4899' }} />,
      title: '弹性扩容',
      description: '根据业务需求动态调整设备数量，按需付费',
      benefits: ['秒级扩容', '自动伸缩', '成本优化'],
    },
  ];

  const useCases = [
    {
      title: '游戏工作室',
      description: '管理数百台云手机进行游戏多开、挂机、养号',
      icon: '🎮',
      metrics: ['支持 500+ 设备', '99.9% 在线率', '自动故障转移'],
    },
    {
      title: 'App 开发团队',
      description: '在不同 Android 版本上快速测试应用兼容性',
      icon: '👨‍💻',
      metrics: ['10+ Android 版本', '真机环境', '日志实时查看'],
    },
    {
      title: '电商运营',
      description: '多账号管理，自动化抢单、刷单、数据采集',
      icon: '🛒',
      metrics: ['批量账号管理', 'IP 代理切换', '自动化脚本'],
    },
    {
      title: '社交媒体营销',
      description: '管理社交媒体账号矩阵，定时发布内容，粉丝互动',
      icon: '📱',
      metrics: ['多平台支持', '定时任务', '数据分析'],
    },
  ];

  const advantages = [
    { label: '高性能', value: '4核8G配置', icon: <ThunderboltOutlined /> },
    { label: '高可用', value: '99.9% SLA', icon: <SafetyOutlined /> },
    { label: '低延迟', value: '<50ms', icon: <RocketOutlined /> },
    { label: '灵活计费', value: '¥0.5/小时起', icon: <CloudOutlined /> },
  ];

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <SEO
        title="云手机管理 - CloudPhone.run"
        description="CloudPhone.run 云手机管理平台，提供一键创建、远程控制、批量操作等强大功能。支持游戏托管、应用测试、电商运营等多种场景。"
        keywords="云手机管理,Android云端,远程控制,批量操作,游戏托管,应用测试"
      />

      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '120px 24px 80px',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Tag color="gold" style={{ fontSize: 14, marginBottom: 24 }}>
            <MobileOutlined /> 核心产品
          </Tag>
          <Title level={1} style={{ color: 'white', fontSize: 56, marginBottom: 24, fontWeight: 800 }}>
            云手机管理平台
          </Title>
          <Paragraph style={{ fontSize: 20, color: 'rgba(255,255,255,0.9)', marginBottom: 40, maxWidth: 800, margin: '0 auto 40px' }}>
            一站式云端 Android 设备管理解决方案
            <br />
            秒级创建、远程控制、批量操作，让设备管理变得简单高效
          </Paragraph>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'white',
                color: '#6366f1',
                border: 'none',
                fontWeight: 600,
              }}
            >
              免费试用
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/contact')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                fontWeight: 600,
              }}
            >
              联系销售
            </Button>
          </Space>
        </div>
      </div>

      {/* 核心优势数据 */}
      <div style={{ maxWidth: 1200, margin: '-60px auto 80px', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <Card style={{ borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          <Row gutter={[32, 32]}>
            {advantages.map((item, index) => (
              <Col xs={12} md={6} key={index}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, color: '#6366f1', marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
                    {item.value}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      {/* 核心功能 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2}>核心功能</Title>
          <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
            全方位的云手机管理能力，满足各类业务场景需求
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {features.map((feature, index) => (
            <Col xs={24} md={12} lg={8} key={index}>
              <Card
                hoverable
                style={{ height: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>{feature.icon}</div>
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph style={{ color: '#64748b', marginBottom: 16 }}>
                    {feature.description}
                  </Paragraph>
                  <div>
                    {feature.benefits.map((benefit, i) => (
                      <div key={i} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                        <CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} />
                        <Text>{benefit}</Text>
                      </div>
                    ))}
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 使用场景 */}
      <div style={{ background: 'white', padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Title level={2}>典型应用场景</Title>
            <Paragraph style={{ fontSize: 16, color: '#64748b' }}>
              助力不同行业客户实现业务目标
            </Paragraph>
          </div>
          <Row gutter={[24, 24]}>
            {useCases.map((useCase, index) => (
              <Col xs={24} md={12} key={index}>
                <Card
                  hoverable
                  style={{ height: '100%', borderRadius: 12, border: '1px solid #e2e8f0' }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>{useCase.icon}</div>
                  <Title level={4}>{useCase.title}</Title>
                  <Paragraph style={{ color: '#64748b', marginBottom: 16 }}>
                    {useCase.description}
                  </Paragraph>
                  <Space wrap>
                    {useCase.metrics.map((metric, i) => (
                      <Tag key={i} color="blue">{metric}</Tag>
                    ))}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ maxWidth: 1200, margin: '80px auto', padding: '0 24px' }}>
        <Card
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: 16,
            border: 'none',
            textAlign: 'center',
          }}
          bodyStyle={{ padding: 64 }}
        >
          <Title level={2} style={{ color: 'white', marginBottom: 16 }}>
            立即开始使用云手机管理
          </Title>
          <Paragraph style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', marginBottom: 32 }}>
            7天免费试用，无需信用卡，随时取消
          </Paragraph>
          <Space size="large">
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/login')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'white',
                color: '#6366f1',
                border: 'none',
                fontWeight: 600,
              }}
            >
              免费试用
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/pricing')}
              style={{
                height: 56,
                fontSize: 18,
                padding: '0 48px',
                borderRadius: 12,
                background: 'transparent',
                color: 'white',
                border: '2px solid white',
                fontWeight: 600,
              }}
            >
              查看定价
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default CloudDeviceManagement;
