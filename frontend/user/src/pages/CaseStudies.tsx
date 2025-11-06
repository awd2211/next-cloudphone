import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Rate,
  Statistic,
} from 'antd';
import {
  TrophyOutlined,
  RocketOutlined,
  TeamOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

/**
 * 客户案例页
 *
 * 功能：
 * 1. 展示客户成功案例
 * 2. 客户评价和反馈
 * 3. 使用数据展示
 * 4. 行业分类筛选
 */
const CaseStudies: React.FC = () => {
  const navigate = useNavigate();
  const [activeIndustry, setActiveIndustry] = useState('all');

  // 客户案例数据
  const cases = [
    {
      id: 1,
      company: '某头部游戏工作室',
      industry: 'game',
      industryName: '游戏行业',
      logo: '🎮',
      title: '批量管理300+云手机，运营效率提升5倍',
      description:
        '该游戏工作室主要从事手游多开挂机业务，之前使用物理设备，成本高、管理难。接入云手机平台后，实现了批量自动化管理，大幅降低成本。',
      challenge:
        '需要同时运行300+个游戏账号，物理设备购买成本高达50万，且管理困难，经常出现设备故障。',
      solution:
        '使用云手机平台专业版，批量创建300台云手机设备，配合自动化脚本实现24/7挂机，统一管理平台一键操作。',
      results: [
        { label: '成本节省', value: '70%', desc: '相比物理设备' },
        { label: '效率提升', value: '5倍', desc: '运营效率' },
        { label: '故障率', value: '<1%', desc: '设备故障率' },
      ],
      testimonial: {
        content:
          '云手机平台彻底改变了我们的运营方式，不仅节省了大量设备采购成本，更重要的是极大提升了管理效率。批量操作功能太方便了！',
        author: '张总监',
        position: '运营总监',
        rating: 5,
      },
      tags: ['专业版', '游戏多开', '批量管理'],
    },
    {
      id: 2,
      company: '某互联网大厂',
      industry: 'testing',
      industryName: '测试行业',
      logo: '💻',
      title: 'App测试效率提升80%，覆盖率达95%',
      description:
        '该公司拥有多款移动应用，每次发版需要在大量设备上进行兼容性测试。使用云手机平台后，测试效率大幅提升。',
      challenge:
        '测试团队仅有20台物理设备，无法覆盖所有Android版本，手工测试效率低，发版周期长。',
      solution:
        '接入云手机平台标准版，按需创建不同Android版本的设备，集成Appium自动化测试框架，实现CI/CD自动化测试。',
      results: [
        { label: '测试时间', value: '80%', desc: '时间节省' },
        { label: '覆盖率', value: '95%', desc: 'Android版本' },
        { label: '发版周期', value: '50%', desc: '周期缩短' },
      ],
      testimonial: {
        content:
          '云手机平台完美解决了我们的测试难题，支持多版本Android系统，集成自动化测试非常方便。现在我们的发版周期缩短了一半！',
        author: '李经理',
        position: '测试经理',
        rating: 5,
      },
      tags: ['标准版', 'App测试', '自动化'],
    },
    {
      id: 3,
      company: '某数据服务公司',
      industry: 'automation',
      industryName: '数据行业',
      logo: '📊',
      title: '数据采集成功率提升至95%，效率提升10倍',
      description:
        '该公司为客户提供移动应用数据采集服务，传统模拟器容易被识别。使用云手机平台后，采集成功率大幅提升。',
      challenge:
        '模拟器容易被App识别，数据采集成功率低，需要大量真实设备环境，且需要频繁更换IP。',
      solution:
        '部署云手机平台专业版，使用真实Android环境，集成IP代理池，支持设备指纹伪造，分布式采集架构。',
      results: [
        { label: '成功率', value: '95%', desc: '采集成功率' },
        { label: '效率', value: '10倍', desc: '相比传统方式' },
        { label: '并发数', value: '50+', desc: '同时采集任务' },
      ],
      testimonial: {
        content:
          '真实的Android环境是关键！云手机平台帮我们突破了App的反爬限制，数据采集成功率从60%提升到95%，客户非常满意。',
        author: '王总',
        position: 'CTO',
        rating: 5,
      },
      tags: ['专业版', '数据采集', 'IP代理'],
    },
    {
      id: 4,
      company: '某营销公司',
      industry: 'marketing',
      industryName: '营销行业',
      logo: '📱',
      title: '管理100+社交账号，营销效率提升300%',
      description:
        '该公司专注于社交媒体营销，需要管理大量账号进行内容发布和互动。云手机平台帮助他们实现了批量自动化运营。',
      challenge:
        '手工管理多个社交账号效率极低，账号容易被封禁，无法规模化运营。',
      solution:
        '采用云手机平台标准版，批量创建100台设备，模拟真实用户行为，配合定时任务实现自动化营销。',
      results: [
        { label: '触达率', value: '300%', desc: '相比人工' },
        { label: '成本', value: '80%', desc: '成本降低' },
        { label: '账号数', value: '100+', desc: '单人管理' },
      ],
      testimonial: {
        content:
          '云手机平台让我们的营销业务实现了质的飞跃，现在1个人可以管理100+账号，客户数量增长了3倍，真的太棒了！',
        author: '刘总',
        position: '创始人',
        rating: 5,
      },
      tags: ['标准版', '社交营销', '批量管理'],
    },
  ];

  // 行业分类
  const industries = [
    { key: 'all', label: '全部行业', icon: <TeamOutlined /> },
    { key: 'game', label: '游戏行业', icon: <RocketOutlined /> },
    { key: 'testing', label: '测试行业', icon: <CheckCircleOutlined /> },
    { key: 'automation', label: '数据行业', icon: <BarChartOutlined /> },
    { key: 'marketing', label: '营销行业', icon: <TrophyOutlined /> },
  ];

  // 过滤案例
  const filteredCases =
    activeIndustry === 'all'
      ? cases
      : cases.filter((c) => c.industry === activeIndustry);

  // 总体数据
  const overallStats = [
    { label: '服务客户', value: '5000+', suffix: '' },
    { label: '平均满意度', value: 4.9, suffix: '分', precision: 1 },
    { label: '续费率', value: 95, suffix: '%' },
    { label: '推荐率', value: 98, suffix: '%' },
  ];

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={1} style={{ color: 'white', fontSize: 48, marginBottom: 0 }}>
            客户成功案例
          </Title>
          <Paragraph
            style={{
              fontSize: 20,
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: 700,
              margin: '0 auto',
            }}
          >
            看看他们如何通过云手机平台实现业务增长
          </Paragraph>
        </Space>
      </div>

      {/* 总体数据 */}
      <div style={{ maxWidth: 1200, margin: '-40px auto 0', padding: '0 24px' }}>
        <Card style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <Row gutter={[32, 32]}>
            {overallStats.map((stat, index) => (
              <Col xs={24} sm={12} md={6} key={index}>
                <Statistic
                  title={<Text style={{ fontSize: 16 }}>{stat.label}</Text>}
                  value={stat.value}
                  suffix={stat.suffix}
                  precision={stat.precision}
                  valueStyle={{ color: '#1890ff', fontSize: 36, fontWeight: 'bold' }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      </div>

      {/* 行业筛选 */}
      <div style={{ maxWidth: 1200, margin: '60px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2}>按行业查看</Title>
        </div>
        <Row gutter={[16, 16]} justify="center">
          {industries.map((industry) => (
            <Col key={industry.key}>
              <Button
                type={activeIndustry === industry.key ? 'primary' : 'default'}
                size="large"
                icon={industry.icon}
                onClick={() => setActiveIndustry(industry.key)}
                style={{
                  height: 50,
                  fontSize: 16,
                }}
              >
                {industry.label}
              </Button>
            </Col>
          ))}
        </Row>
      </div>

      {/* 客户案例列表 */}
      <div style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 24px' }}>
        <Row gutter={[24, 24]}>
          {filteredCases.map((caseItem) => (
            <Col xs={24} key={caseItem.id}>
              <Card
                hoverable
                style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
              >
                <Row gutter={[32, 32]}>
                  <Col xs={24} md={8}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            fontSize: 80,
                            marginBottom: 16,
                          }}
                        >
                          {caseItem.logo}
                        </div>
                        <Title level={4}>{caseItem.company}</Title>
                        <Tag color="blue">{caseItem.industryName}</Tag>
                      </div>
                      <Space wrap>
                        {caseItem.tags.map((tag, i) => (
                          <Tag key={i}>{tag}</Tag>
                        ))}
                      </Space>
                    </Space>
                  </Col>

                  <Col xs={24} md={16}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                      <div>
                        <Title level={3} style={{ marginBottom: 8 }}>
                          {caseItem.title}
                        </Title>
                        <Paragraph style={{ fontSize: 15, color: '#666' }}>
                          {caseItem.description}
                        </Paragraph>
                      </div>

                      <div>
                        <Title level={5}>挑战</Title>
                        <Paragraph style={{ color: '#666' }}>{caseItem.challenge}</Paragraph>
                      </div>

                      <div>
                        <Title level={5}>解决方案</Title>
                        <Paragraph style={{ color: '#666' }}>{caseItem.solution}</Paragraph>
                      </div>

                      <div>
                        <Title level={5}>效果数据</Title>
                        <Row gutter={[16, 16]}>
                          {caseItem.results.map((result, i) => (
                            <Col span={8} key={i}>
                              <Card
                                size="small"
                                style={{ textAlign: 'center', background: '#f0f7ff' }}
                              >
                                <Statistic
                                  title={result.label}
                                  value={result.value}
                                  valueStyle={{ color: '#1890ff', fontSize: 24 }}
                                />
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {result.desc}
                                </Text>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>

                      <Card
                        style={{ background: '#fafafa', borderLeft: '4px solid #1890ff' }}
                      >
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div>
                            <Rate disabled value={caseItem.testimonial.rating} />
                          </div>
                          <Paragraph
                            italic
                            style={{ fontSize: 15, marginBottom: 8, color: '#333' }}
                          >
                            "{caseItem.testimonial.content}"
                          </Paragraph>
                          <div>
                            <Text strong>{caseItem.testimonial.author}</Text>
                            <Text type="secondary"> · {caseItem.testimonial.position}</Text>
                          </div>
                        </Space>
                      </Card>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Card
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            textAlign: 'center',
          }}
          bodyStyle={{ padding: 48 }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{ color: 'white', marginBottom: 0 }}>
              加入5000+成功客户
            </Title>
            <Paragraph style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>
              开始您的云手机之旅，实现业务快速增长
            </Paragraph>
            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => navigate('/plans')}
                style={{
                  height: 50,
                  fontSize: 18,
                  background: 'white',
                  color: '#667eea',
                  borderColor: 'white',
                }}
              >
                开始免费试用
              </Button>
              <Button
                size="large"
                onClick={() => navigate('/help')}
                style={{
                  height: 50,
                  fontSize: 18,
                  background: 'transparent',
                  color: 'white',
                  borderColor: 'white',
                }}
              >
                联系销售
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default CaseStudies;
