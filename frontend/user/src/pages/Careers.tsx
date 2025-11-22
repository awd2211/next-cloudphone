import React from 'react';
import { Card, Row, Col, Button, Tag } from 'antd';
import {
  TeamOutlined,
  RocketOutlined,
  HeartOutlined,
  TrophyOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  SafetyOutlined,
  CoffeeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

/**
 * CloudPhone.run 招聘/加入我们页面
 * 展示公司文化、福利待遇和招聘职位
 * Header 和 Footer 由 PublicLayout 提供
 */
const Careers: React.FC = () => {
  const navigate = useNavigate();

  // 公司文化价值观
  const cultureValues = [
    {
      icon: <RocketOutlined style={{ fontSize: 48, color: '#1890ff' }} />,
      title: '创新驱动',
      description: '鼓励创新思维，推动技术进步，让每个想法都有可能改变世界',
    },
    {
      icon: <TeamOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      title: '团队协作',
      description: '开放的沟通氛围，扁平化的组织结构，让每个人都能发挥价值',
    },
    {
      icon: <HeartOutlined style={{ fontSize: 48, color: '#eb2f96' }} />,
      title: '热爱工作',
      description: '追求卓越，享受过程，在工作中找到乐趣和成就感',
    },
    {
      icon: <TrophyOutlined style={{ fontSize: 48, color: '#faad14' }} />,
      title: '追求卓越',
      description: '高标准严要求，持续学习成长，打造行业领先的产品',
    },
  ];

  // 员工福利
  const benefits = [
    {
      icon: <DollarOutlined />,
      title: '具有竞争力的薪资',
      description: '行业领先的薪酬待遇 + 年度绩效奖金 + 股票期权',
    },
    {
      icon: <SafetyOutlined />,
      title: '完善的保险福利',
      description: '五险一金 + 补充商业保险 + 年度体检',
    },
    {
      icon: <CoffeeOutlined />,
      title: '弹性工作制度',
      description: '弹性工作时间 + 远程办公 + 无限量零食饮料',
    },
    {
      icon: <EnvironmentOutlined />,
      title: '舒适的办公环境',
      description: '现代化办公空间 + 健身房 + 休闲娱乐区',
    },
    {
      icon: <RocketOutlined />,
      title: '职业发展机会',
      description: '完善的培训体系 + 技术分享 + 晋升通道',
    },
    {
      icon: <HeartOutlined />,
      title: '团队建设活动',
      description: '定期团建 + 节日福利 + 年度旅游',
    },
  ];

  // 招聘职位
  const jobPositions = [
    {
      title: '高级前端工程师',
      department: '技术部',
      location: '北京 / 上海 / 远程',
      type: '全职',
      salary: '25K-40K',
      requirements: [
        '3年以上前端开发经验',
        '精通 React/Vue 等主流框架',
        '熟悉 TypeScript 和现代前端工程化',
        '有云平台或 SaaS 产品开发经验优先',
      ],
      tags: ['React', 'TypeScript', 'Vite', 'Ant Design'],
    },
    {
      title: '后端开发工程师',
      department: '技术部',
      location: '北京 / 上海',
      type: '全职',
      salary: '25K-45K',
      requirements: [
        '3年以上后端开发经验',
        '精通 Node.js/NestJS 或 Go/Python',
        '熟悉微服务架构和容器化技术',
        '有分布式系统经验优先',
      ],
      tags: ['NestJS', 'PostgreSQL', 'Docker', 'Redis'],
    },
    {
      title: 'DevOps 工程师',
      department: '技术部',
      location: '北京',
      type: '全职',
      salary: '30K-50K',
      requirements: [
        '3年以上 DevOps 经验',
        '熟悉 Kubernetes、Docker 等容器技术',
        '精通 CI/CD 流程和自动化部署',
        '有云平台运维经验优先',
      ],
      tags: ['Kubernetes', 'Docker', 'CI/CD', 'Prometheus'],
    },
    {
      title: '产品经理',
      department: '产品部',
      location: '北京 / 深圳',
      type: '全职',
      salary: '20K-35K',
      requirements: [
        '3年以上产品经理经验',
        '有 SaaS 或云服务产品经验',
        '优秀的需求分析和产品设计能力',
        '良好的沟通协调能力',
      ],
      tags: ['SaaS', '云平台', 'B端产品', '用户研究'],
    },
    {
      title: 'UI/UX 设计师',
      department: '设计部',
      location: '北京 / 上海 / 远程',
      type: '全职',
      salary: '18K-30K',
      requirements: [
        '2年以上 UI/UX 设计经验',
        '精通 Figma、Sketch 等设计工具',
        '有 B 端产品设计经验优先',
        '良好的审美和创意能力',
      ],
      tags: ['Figma', 'UI Design', 'UX', '交互设计'],
    },
    {
      title: '测试工程师',
      department: '技术部',
      location: '北京 / 上海',
      type: '全职',
      salary: '15K-25K',
      requirements: [
        '2年以上测试经验',
        '熟悉自动化测试工具和框架',
        '有性能测试和安全测试经验',
        '熟悉 CI/CD 流程',
      ],
      tags: ['Jest', 'Cypress', 'Playwright', '自动化测试'],
    },
  ];

  // 处理职位申请
  const handleApply = (jobTitle: string) => {
    // 跳转到联系页面，并带上职位信息
    navigate('/contact', { state: { subject: `应聘：${jobTitle}` } });
  };

  return (
    <div>
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
          <h1 style={{ fontSize: 48, marginBottom: 16, color: 'white' }}>加入我们</h1>
          <p style={{ fontSize: 20, opacity: 0.9 }}>
            和我们一起，打造下一代云手机平台
          </p>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
          {/* 为什么选择我们 */}
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 32, marginBottom: 16 }}>为什么选择我们</h2>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 48 }}>
              我们提供优秀的工作环境、有竞争力的薪酬福利和广阔的职业发展空间
            </p>

            {/* 公司文化 */}
            <Row gutter={[24, 24]} style={{ marginBottom: 60 }}>
              {cultureValues.map((value, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <Card hoverable style={{ height: '100%', textAlign: 'center' }}>
                    <div style={{ marginBottom: 16 }}>{value.icon}</div>
                    <h3 style={{ fontSize: 18, marginBottom: 12 }}>{value.title}</h3>
                    <p style={{ color: '#666', fontSize: 14 }}>{value.description}</p>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* 员工福利 */}
          <Card style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 28, marginBottom: 32, textAlign: 'center' }}>员工福利</h2>
            <Row gutter={[24, 24]}>
              {benefits.map((benefit, index) => (
                <Col xs={24} sm={12} md={8} key={index}>
                  <div style={{ display: 'flex', marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 32,
                        color: '#1890ff',
                        marginRight: 16,
                        flexShrink: 0,
                      }}
                    >
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>{benefit.title}</h3>
                      <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 招聘职位 */}
          <div>
            <h2 style={{ fontSize: 28, marginBottom: 32, textAlign: 'center' }}>
              热招职位
            </h2>
            <Row gutter={[24, 24]}>
              {jobPositions.map((job, index) => (
                <Col xs={24} lg={12} key={index}>
                  <Card
                    hoverable
                    style={{ height: '100%' }}
                    actions={[
                      <Button
                        type="primary"
                        onClick={() => handleApply(job.title)}
                        key="apply"
                      >
                        立即申请
                      </Button>,
                    ]}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ fontSize: 20, marginBottom: 8 }}>{job.title}</h3>
                      <div style={{ color: '#666', fontSize: 14 }}>
                        <span style={{ marginRight: 16 }}>{job.department}</span>
                        <span style={{ marginRight: 16 }}>
                          <EnvironmentOutlined /> {job.location}
                        </span>
                        <span style={{ marginRight: 16 }}>
                          <Tag color="blue">{job.type}</Tag>
                        </span>
                        <span style={{ color: '#f5222d', fontWeight: 600 }}>
                          {job.salary}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, marginBottom: 8, color: '#333' }}>
                        岗位要求：
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 20, color: '#666', fontSize: 14 }}>
                        {job.requirements.map((req, reqIndex) => (
                          <li key={reqIndex} style={{ marginBottom: 4 }}>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      {job.tags.map((tag, tagIndex) => (
                        <Tag key={tagIndex} style={{ marginBottom: 4 }}>
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* CTA 区域 */}
          <Card
            style={{
              marginTop: 60,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
            }}
          >
            <h2 style={{ fontSize: 28, marginBottom: 16, color: 'white' }}>
              没有找到合适的职位？
            </h2>
            <p style={{ fontSize: 16, marginBottom: 24, opacity: 0.9 }}>
              您可以发送简历到 hr@cloudphone.run，我们会尽快与您联系
            </p>
            <Button
              size="large"
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                marginRight: 16,
              }}
              onClick={() => navigate('/contact')}
            >
              联系我们
            </Button>
            <Button
              size="large"
              style={{
                background: 'transparent',
                color: 'white',
                borderColor: 'white',
              }}
              onClick={() => navigate('/about')}
            >
              了解更多
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Careers;
