import React, { useState, useEffect } from 'react';
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
  Spin,
  Empty,
} from 'antd';
import {
  TrophyOutlined,
  RocketOutlined,
  TeamOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getCaseStudies, type CaseStudy } from '@/services/cms';

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
// 行业图标映射
const industryIcons: Record<string, string> = {
  game: '🎮',
  testing: '💻',
  automation: '📊',
  marketing: '📱',
  ecommerce: '🛒',
  social: '💬',
  default: '🏢',
};

// 行业名称映射
const industryNames: Record<string, string> = {
  game: '游戏行业',
  testing: '测试行业',
  automation: '数据行业',
  marketing: '营销行业',
  ecommerce: '电商行业',
  social: '社交行业',
};

const CaseStudies: React.FC = () => {
  const navigate = useNavigate();
  const [activeIndustry, setActiveIndustry] = useState('all');
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  // 从 CMS API 加载客户案例
  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);
        const data = await getCaseStudies();
        setCases(data);
      } catch (error) {
        console.error('Failed to load case studies:', error);
        setCases([]);
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, []);

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
      : cases.filter((c: CaseStudy) => c.industry === activeIndustry);

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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
            <p style={{ marginTop: 16, color: '#666' }}>正在加载案例...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <Empty description="暂无客户案例" style={{ padding: '60px 0' }} />
        ) : (
          <Row gutter={[24, 24]}>
            {filteredCases.map((caseItem: CaseStudy) => (
              <Col xs={24} key={caseItem.id}>
                <Card
                  hoverable
                  style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                >
                  <Row gutter={[32, 32]}>
                    <Col xs={24} md={8}>
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div style={{ textAlign: 'center' }}>
                          {caseItem.logoUrl ? (
                            <img
                              src={caseItem.logoUrl}
                              alt={caseItem.companyName}
                              style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }}
                            />
                          ) : (
                            <div style={{ fontSize: 80, marginBottom: 16 }}>
                              {industryIcons[caseItem.industry] || industryIcons.default}
                            </div>
                          )}
                          <Title level={4}>{caseItem.companyName}</Title>
                          <Tag color="blue">{industryNames[caseItem.industry] || caseItem.industry}</Tag>
                        </div>
                      </Space>
                    </Col>

                    <Col xs={24} md={16}>
                      <Space direction="vertical" size="large" style={{ width: '100%' }}>
                        <div>
                          <Title level={3} style={{ marginBottom: 8 }}>
                            {caseItem.title}
                          </Title>
                        </div>

                        <div>
                          <Title level={5}>挑战</Title>
                          <Paragraph style={{ color: '#666' }}>{caseItem.challenge}</Paragraph>
                        </div>

                        <div>
                          <Title level={5}>解决方案</Title>
                          <Paragraph style={{ color: '#666' }}>{caseItem.solution}</Paragraph>
                        </div>

                        {caseItem.results && Object.keys(caseItem.results).length > 0 && (
                          <div>
                            <Title level={5}>效果数据</Title>
                            <Row gutter={[16, 16]}>
                              {Array.isArray(caseItem.results) ? (
                                caseItem.results.map((result: any, i: number) => (
                                  <Col span={8} key={i}>
                                    <Card
                                      size="small"
                                      style={{ textAlign: 'center', background: '#f0f7ff' }}
                                    >
                                      <Statistic
                                        title={result.metric || result.label}
                                        value={result.value}
                                        valueStyle={{ color: '#1890ff', fontSize: 24 }}
                                      />
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        {result.description || result.desc}
                                      </Text>
                                    </Card>
                                  </Col>
                                ))
                              ) : (
                                Object.entries(caseItem.results).map(([key, value], i) => (
                                  <Col span={8} key={i}>
                                    <Card
                                      size="small"
                                      style={{ textAlign: 'center', background: '#f0f7ff' }}
                                    >
                                      <Statistic
                                        title={key}
                                        value={String(value)}
                                        valueStyle={{ color: '#1890ff', fontSize: 24 }}
                                      />
                                    </Card>
                                  </Col>
                                ))
                              )}
                            </Row>
                          </div>
                        )}

                        {caseItem.testimonial && (
                          <Card
                            style={{ background: '#fafafa', borderLeft: '4px solid #1890ff' }}
                          >
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              <div>
                                <Rate disabled value={5} />
                              </div>
                              <Paragraph
                                italic
                                style={{ fontSize: 15, marginBottom: 8, color: '#333' }}
                              >
                                "{caseItem.testimonial.quote}"
                              </Paragraph>
                              <div>
                                <Text strong>{caseItem.testimonial.author}</Text>
                                <Text type="secondary"> · {caseItem.testimonial.title}</Text>
                              </div>
                            </Space>
                          </Card>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Card
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            textAlign: 'center',
          }}
          styles={{ body: { padding: 48 } }}
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
