import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Row,
  Col,
  Typography,
  Space,
  List,
  Tag,
  Button,
  Divider,
  Spin,
  Empty,
} from 'antd';
import {
  SearchOutlined,
  BookOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  CustomerServiceOutlined,
  RightOutlined,
  EyeOutlined,
  LikeOutlined,
  FireOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  getHelpCategories,
  getPopularArticles,
  getLatestArticles,
  getFAQs,
  type HelpCategory,
  type HelpArticle,
  type FAQ,
} from '@/services/help';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// 分类图标映射
const categoryIcons: Record<string, React.ReactNode> = {
  'getting-started': <BookOutlined />,
  account: <BookOutlined />,
  device: <BookOutlined />,
  app: <BookOutlined />,
  billing: <BookOutlined />,
  technical: <BookOutlined />,
  security: <BookOutlined />,
};

// 分类颜色映射
const categoryColors: Record<string, string> = {
  'getting-started': '#1890ff',
  account: '#52c41a',
  device: '#faad14',
  app: '#13c2c2',
  billing: '#eb2f96',
  technical: '#722ed1',
  security: '#f5222d',
};

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [popularArticles, setPopularArticles] = useState<HelpArticle[]>([]);
  const [latestArticles, setLatestArticles] = useState<HelpArticle[]>([]);
  const [popularFAQs, setPopularFAQs] = useState<FAQ[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categoriesData, popularData, latestData, faqsData] = await Promise.all([
        getHelpCategories(),
        getPopularArticles(6),
        getLatestArticles(6),
        getFAQs({ page: 1, pageSize: 5 }),
      ]);

      setCategories(categoriesData);
      setPopularArticles(popularData);
      setLatestArticles(latestData);
      setPopularFAQs(faqsData.items);
    } catch (error) {
      console.error('加载帮助中心数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索
  const handleSearch = (value: string) => {
    if (value.trim()) {
      navigate(`/help/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  // 跳转到分类
  const goToCategory = (categoryId: string) => {
    navigate(`/help/articles?category=${categoryId}`);
  };

  // 跳转到文章详情
  const goToArticle = (articleId: string) => {
    navigate(`/help/articles/${articleId}`);
  };

  // 跳转到 FAQ 详情
  const goToFAQ = (faqId: string) => {
    navigate(`/help/faqs/${faqId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 顶部搜索区 */}
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
        }}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>
            帮助中心
          </Title>
          <Paragraph style={{ color: '#fff', fontSize: 16, marginBottom: 32 }}>
            我们随时为您提供帮助和支持
          </Paragraph>

          <Search
            placeholder="搜索帮助文档、常见问题..."
            size="large"
            enterButton={
              <Button type="primary" size="large" icon={<SearchOutlined />}>
                搜索
              </Button>
            }
            onSearch={handleSearch}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ maxWidth: 600 }}
          />
        </div>
      </Card>

      {/* 快速入口 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/help/articles')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <FileTextOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
              帮助文档
            </Title>
            <Text type="secondary">查看详细的产品使用文档</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/help/faqs')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <QuestionCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
              常见问题
            </Title>
            <Text type="secondary">快速找到常见问题的答案</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/help/tutorials')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <BookOutlined style={{ fontSize: 48, color: '#faad14' }} />
            <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
              视频教程
            </Title>
            <Text type="secondary">通过视频学习产品功能</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => navigate('/tickets')}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <CustomerServiceOutlined style={{ fontSize: 48, color: '#722ed1' }} />
            <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
              联系客服
            </Title>
            <Text type="secondary">提交工单获得专业支持</Text>
          </Card>
        </Col>
      </Row>

      {/* 帮助分类 */}
      {categories.length > 0 && (
        <Card title="浏览分类" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            {categories.map((category) => {
              const icon = categoryIcons[category.icon] || <BookOutlined />;
              const color = categoryColors[category.icon] || '#1890ff';

              return (
                <Col key={category.id} xs={24} sm={12} lg={8}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => goToCategory(category.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Space>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '8px',
                            background: `${color}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            color,
                          }}
                        >
                          {icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>{category.name}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {category.articleCount} 篇文章
                          </Text>
                        </div>
                      </Space>
                      <RightOutlined style={{ color: '#999' }} />
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      <Row gutter={16}>
        {/* 热门文章 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: '#ff4d4f' }} />
                <span>热门文章</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/help/articles')}>
                查看全部 <RightOutlined />
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            {popularArticles.length > 0 ? (
              <List
                dataSource={popularArticles}
                renderItem={(article) => (
                  <List.Item
                    key={article.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => goToArticle(article.id)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{article.title}</span>
                          <Tag color="blue">{article.categoryName}</Tag>
                        </Space>
                      }
                      description={
                        <Space size="large" style={{ fontSize: 12 }}>
                          <Space size="small">
                            <EyeOutlined />
                            <span>{article.views}</span>
                          </Space>
                          <Space size="small">
                            <LikeOutlined />
                            <span>{article.likes}</span>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无热门文章" />
            )}
          </Card>
        </Col>

        {/* 最新文章 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                <span>最新文章</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/help/articles')}>
                查看全部 <RightOutlined />
              </Button>
            }
            style={{ marginBottom: 16 }}
          >
            {latestArticles.length > 0 ? (
              <List
                dataSource={latestArticles}
                renderItem={(article) => (
                  <List.Item
                    key={article.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => goToArticle(article.id)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{article.title}</span>
                          <Tag color="green">{article.categoryName}</Tag>
                        </Space>
                      }
                      description={
                        <Space size="large" style={{ fontSize: 12 }}>
                          <Text type="secondary">{dayjs(article.createdAt).fromNow()}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无最新文章" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 常见问题 */}
      {popularFAQs.length > 0 && (
        <Card
          title={
            <Space>
              <QuestionCircleOutlined style={{ color: '#52c41a' }} />
              <span>常见问题</span>
            </Space>
          }
          extra={
            <Button type="link" onClick={() => navigate('/help/faqs')}>
              查看全部 <RightOutlined />
            </Button>
          }
        >
          <List
            dataSource={popularFAQs}
            renderItem={(faq, index) => (
              <List.Item key={faq.id} style={{ cursor: 'pointer' }} onClick={() => goToFAQ(faq.id)}>
                <List.Item.Meta
                  avatar={
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#52c41a20',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        color: '#52c41a',
                      }}
                    >
                      {index + 1}
                    </div>
                  }
                  title={faq.question}
                  description={
                    <Space size="large" style={{ fontSize: 12 }}>
                      <Space size="small">
                        <EyeOutlined />
                        <span>{faq.views} 次浏览</span>
                      </Space>
                      <Space size="small">
                        <LikeOutlined />
                        <span>{faq.helpfulCount} 人觉得有用</span>
                      </Space>
                    </Space>
                  }
                />
                <RightOutlined style={{ color: '#999' }} />
              </List.Item>
            )}
          />
        </Card>
      )}

      <Divider />

      {/* 底部提示 */}
      <Card style={{ textAlign: 'center', background: '#fafafa' }}>
        <Space direction="vertical" size="middle">
          <CustomerServiceOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <div>
            <Title level={4} style={{ marginBottom: 8 }}>
              找不到您需要的帮助？
            </Title>
            <Paragraph type="secondary">我们的客服团队随时准备为您提供帮助</Paragraph>
          </div>
          <Space>
            <Button type="primary" size="large" onClick={() => navigate('/tickets')}>
              提交工单
            </Button>
            <Button size="large" onClick={() => navigate('/help/faqs')}>
              查看 FAQ
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default HelpCenter;
