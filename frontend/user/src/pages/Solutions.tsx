import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Tabs,
  List,
  Statistic,
} from 'antd';
import {
  RocketOutlined,
  BugOutlined,
  RobotOutlined,
  ShareAltOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

/**
 * 解决方案页
 *
 * 功能：
 * 1. 展示不同行业的解决方案
 * 2. 详细的场景介绍和技术方案
 * 3. 推荐配置和最佳实践
 * 4. 引导用户购买
 */
const Solutions: React.FC = () => {
  const navigate = useNavigate();

  // 解决方案列表
  const solutions = [
    {
      key: 'game',
      icon: <RocketOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
      title: '游戏多开挂机',
      subtitle: '工作室批量运营解决方案',
      description:
        '为游戏工作室提供批量设备管理、24小时自动挂机、脚本自动化等功能，大幅提升运营效率。',
      challenges: [
        '需要同时运行数十上百个游戏账号',
        '本地电脑资源不足，卡顿严重',
        '设备管理复杂，效率低下',
        '脚本执行不稳定',
      ],
      solutions: [
        '批量创建云手机设备，支持100+设备同时在线',
        '高性能服务器保证流畅运行，无卡顿',
        '统一管理平台，一键批量操作',
        '稳定的脚本执行环境，支持ADB自动化',
        '24/7不间断运行，无需本地电脑',
      ],
      benefits: [
        { label: '成本节省', value: '70%', desc: '相比购买物理设备' },
        { label: '效率提升', value: '5倍', desc: '批量操作自动化' },
        { label: '设备数量', value: '100+', desc: '单账号管理上限' },
      ],
      techStack: ['Redroid容器', 'ADB自动化', '批量任务调度', '脚本沙箱'],
      recommendedPlan: '专业版',
    },
    {
      key: 'testing',
      icon: <BugOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      title: 'App自动化测试',
      subtitle: '提升测试效率的专业方案',
      description:
        '为开发团队提供完整的移动应用测试环境，支持UI自动化、兼容性测试、性能测试等多种测试场景。',
      challenges: [
        '测试设备种类少，覆盖率低',
        '手工测试效率低，人力成本高',
        '多版本适配测试困难',
        '测试环境不稳定',
      ],
      solutions: [
        '提供Android 7-13全版本支持',
        '集成Appium、UIAutomator等测试框架',
        '并发测试，大幅缩短测试周期',
        'CI/CD无缝集成，自动化测试流程',
        '完整的测试报告和日志记录',
      ],
      benefits: [
        { label: '测试时间', value: '80%', desc: '时间节省' },
        { label: '设备成本', value: '90%', desc: '成本降低' },
        { label: '覆盖率', value: '95%+', desc: '测试覆盖率' },
      ],
      techStack: ['Appium', 'UIAutomator', 'CI/CD集成', 'WebDriver API'],
      recommendedPlan: '标准版',
    },
    {
      key: 'automation',
      icon: <RobotOutlined style={{ fontSize: 48, color: '#faad14' }} />,
      title: '数据采集爬虫',
      subtitle: '智能数据获取解决方案',
      description:
        '模拟真实手机环境，突破App反爬限制，获取App内数据，支持IP代理和设备指纹伪造。',
      challenges: [
        'App反爬技术越来越复杂',
        '设备指纹容易被识别',
        '需要大量IP地址',
        '数据采集不稳定',
      ],
      solutions: [
        '真实Android环境，突破反爬检测',
        '支持设备指纹伪造和修改',
        '集成IP代理池，自动切换IP',
        '分布式采集，提高效率',
        'API接口，轻松集成到现有系统',
      ],
      benefits: [
        { label: '成功率', value: '95%+', desc: '数据采集成功率' },
        { label: '速度提升', value: '10倍', desc: '相比传统方式' },
        { label: '并发数', value: '50+', desc: '同时采集任务' },
      ],
      techStack: ['ADB命令', 'Frida Hook', 'IP代理池', 'Redis队列'],
      recommendedPlan: '专业版',
    },
    {
      key: 'marketing',
      icon: <ShareAltOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
      title: '社交营销推广',
      subtitle: '批量账号管理运营方案',
      description:
        '批量管理社交账号，自动点赞、评论、私信，支持定时任务，提升营销效率和触达率。',
      challenges: [
        '手工操作效率低，难以规模化',
        '账号容易被封禁',
        '设备成本高',
        '难以追踪营销效果',
      ],
      solutions: [
        '批量账号管理，支持100+账号',
        '智能防封策略，模拟真实用户行为',
        '定时任务，自动化营销流程',
        '数据统计，实时追踪营销效果',
        '多平台支持（微信、抖音、小红书等）',
      ],
      benefits: [
        { label: '触达率', value: '300%', desc: '相比人工操作' },
        { label: '成本节省', value: '80%', desc: '人力成本降低' },
        { label: '账号管理', value: '100+', desc: '单人管理上限' },
      ],
      techStack: ['自动化脚本', '行为模拟', '定时任务', '数据分析'],
      recommendedPlan: '标准版',
    },
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
            行业解决方案
          </Title>
          <Paragraph
            style={{
              fontSize: 20,
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: 700,
              margin: '0 auto',
            }}
          >
            无论您从事哪个行业，云手机平台都能为您提供专业的解决方案
          </Paragraph>
        </Space>
      </div>

      {/* 解决方案概览 */}
      <div style={{ maxWidth: 1200, margin: '-60px auto 80px', padding: '0 24px' }}>
        <Row gutter={[24, 24]}>
          {solutions.map((solution) => (
            <Col xs={24} sm={12} lg={6} key={solution.key}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {solution.icon}
                  <Title level={4} style={{ marginBottom: 0 }}>
                    {solution.title}
                  </Title>
                  <Text type="secondary">{solution.subtitle}</Text>
                  <Button type="primary" block href={`#${solution.key}`}>
                    查看详情
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 详细解决方案 */}
      {solutions.map((solution, index) => (
        <div
          key={solution.key}
          id={solution.key}
          style={{
            background: index % 2 === 0 ? 'white' : '#f0f2f5',
            padding: '80px 24px',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Row gutter={[48, 48]} align="middle">
              <Col xs={24} lg={12}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    {solution.icon}
                    <Title level={2} style={{ marginTop: 16 }}>
                      {solution.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 16 }}>
                      {solution.subtitle}
                    </Text>
                  </div>
                  <Paragraph style={{ fontSize: 16 }}>{solution.description}</Paragraph>

                  <div>
                    <Title level={4}>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      您面临的挑战
                    </Title>
                    <List
                      size="small"
                      dataSource={solution.challenges}
                      renderItem={(item) => (
                        <List.Item>
                          <Text>• {item}</Text>
                        </List.Item>
                      )}
                    />
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<RocketOutlined />}
                    onClick={() => navigate('/pricing')}
                  >
                    立即开始
                  </Button>
                </Space>
              </Col>

              <Col xs={24} lg={12}>
                <Card style={{ borderRadius: 12 }}>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Title level={4}>
                        <ThunderboltOutlined style={{ color: '#faad14', marginRight: 8 }} />
                        我们的解决方案
                      </Title>
                      <List
                        size="small"
                        dataSource={solution.solutions}
                        renderItem={(item) => (
                          <List.Item>
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                            <Text>{item}</Text>
                          </List.Item>
                        )}
                      />
                    </div>

                    <div>
                      <Title level={4}>
                        <LineChartOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                        效果数据
                      </Title>
                      <Row gutter={[16, 16]}>
                        {solution.benefits.map((benefit, i) => (
                          <Col span={8} key={i}>
                            <Card size="small" style={{ textAlign: 'center' }}>
                              <Statistic
                                title={benefit.label}
                                value={benefit.value}
                                valueStyle={{ color: '#1890ff', fontSize: 24 }}
                              />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {benefit.desc}
                              </Text>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>

                    <div>
                      <Title level={4}>
                        <ApiOutlined style={{ color: '#722ed1', marginRight: 8 }} />
                        技术栈
                      </Title>
                      <Space wrap>
                        {solution.techStack.map((tech, i) => (
                          <Tag key={i} color="purple">
                            {tech}
                          </Tag>
                        ))}
                      </Space>
                    </div>

                    <div>
                      <Title level={4}>
                        <SafetyOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                        推荐套餐
                      </Title>
                      <Tag color="blue" style={{ fontSize: 16, padding: '8px 16px' }}>
                        {solution.recommendedPlan}
                      </Tag>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      ))}

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: '80px auto 0', padding: '0 24px' }}>
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
              没有找到适合的解决方案？
            </Title>
            <Paragraph style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>
              联系我们的技术团队，为您定制专属解决方案
            </Paragraph>
            <Button
              size="large"
              style={{
                background: 'white',
                color: '#667eea',
                borderColor: 'white',
                height: 50,
                fontSize: 18,
              }}
              onClick={() => navigate('/help')}
            >
              联系技术顾问
            </Button>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default Solutions;
