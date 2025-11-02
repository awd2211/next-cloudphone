import React from 'react';
import { Card, Row, Col, Timeline, Statistic } from 'antd';
import {
  RocketOutlined,
  TeamOutlined,
  TrophyOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { Header, Footer } from '@/components/Home';
import { useNavigate } from 'react-router-dom';

/**
 * 关于我们页面
 * 展示公司信息、团队、里程碑等
 */
const About: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div>
      {/* 头部导航 */}
      <Header
        isLoggedIn={isLoggedIn}
        onLogin={() => navigate('/login')}
        onRegister={() => navigate('/login')}
        onDashboard={() => navigate('/dashboard')}
      />

      {/* 页面内容 */}
      <div style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 300px)' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '80px 24px',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <h1 style={{ fontSize: 48, marginBottom: 16, color: 'white' }}>关于我们</h1>
          <p style={{ fontSize: 20, opacity: 0.9 }}>
            致力于为全球开发者提供最优质的云手机服务
          </p>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
          {/* 公司简介 */}
          <Card style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, marginBottom: 24, textAlign: 'center' }}>公司简介</h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
              我们是一家专注于云手机技术的创新型公司，成立于 2020 年。
              通过先进的容器化技术和虚拟化方案，为全球开发者、企业和游戏工作室提供稳定、高效的云端 Android 设备服务。
              我们的使命是让每个人都能轻松使用云手机，提升开发测试效率，降低硬件成本。
            </p>
          </Card>

          {/* 核心数据 */}
          <Row gutter={[24, 24]} style={{ marginBottom: 60 }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="注册用户"
                  value={10000}
                  prefix={<TeamOutlined />}
                  suffix="+"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="在线设备"
                  value={50000}
                  prefix={<GlobalOutlined />}
                  suffix="+"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="企业客户"
                  value={500}
                  prefix={<TrophyOutlined />}
                  suffix="+"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="服务可用性"
                  value={99.9}
                  prefix={<RocketOutlined />}
                  suffix="%"
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 发展历程 */}
          <Card style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, marginBottom: 24, textAlign: 'center' }}>发展历程</h2>
            <Timeline
              mode="alternate"
              style={{ marginTop: 40 }}
              items={[
                {
                  label: '2020年1月',
                  children: (
                    <div>
                      <h3>公司成立</h3>
                      <p>云手机平台正式成立，开始技术研发</p>
                    </div>
                  ),
                  color: 'green',
                },
                {
                  label: '2020年6月',
                  children: (
                    <div>
                      <h3>Beta 版本发布</h3>
                      <p>完成核心功能开发，开始内测</p>
                    </div>
                  ),
                  color: 'blue',
                },
                {
                  label: '2021年1月',
                  children: (
                    <div>
                      <h3>正式商用</h3>
                      <p>平台正式对外开放，获得首批付费用户</p>
                    </div>
                  ),
                  color: 'orange',
                },
                {
                  label: '2022年6月',
                  children: (
                    <div>
                      <h3>用户突破万人</h3>
                      <p>注册用户数突破 10,000，企业客户超过 100 家</p>
                    </div>
                  ),
                  color: 'purple',
                },
                {
                  label: '2024年1月',
                  children: (
                    <div>
                      <h3>国际化扩展</h3>
                      <p>开通海外节点，服务覆盖全球</p>
                    </div>
                  ),
                  color: 'red',
                },
                {
                  label: '2025年',
                  children: (
                    <div>
                      <h3>持续创新</h3>
                      <p>不断优化产品，为用户提供更好的服务</p>
                    </div>
                  ),
                  color: 'green',
                },
              ]}
            />
          </Card>

          {/* 核心价值观 */}
          <Card>
            <h2 style={{ fontSize: 28, marginBottom: 24, textAlign: 'center' }}>核心价值观</h2>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <RocketOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                  <h3 style={{ fontSize: 20, marginBottom: 12 }}>创新驱动</h3>
                  <p style={{ color: '#666' }}>
                    持续技术创新，为用户提供最前沿的云手机解决方案
                  </p>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <TeamOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                  <h3 style={{ fontSize: 20, marginBottom: 12 }}>用户至上</h3>
                  <p style={{ color: '#666' }}>
                    始终以用户需求为中心，提供优质的产品和服务
                  </p>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <TrophyOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
                  <h3 style={{ fontSize: 20, marginBottom: 12 }}>追求卓越</h3>
                  <p style={{ color: '#666' }}>
                    精益求精，打造行业领先的云手机平台
                  </p>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </div>

      {/* 页脚 */}
      <Footer />
    </div>
  );
};

export default About;
