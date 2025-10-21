import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Empty,
  Spin,
  Typography,
  Progress,
  Pagination,
  message,
} from 'antd';
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LikeOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  getTutorials,
  TutorialDifficulty,
  type Tutorial,
  type TutorialListQuery,
} from '@/services/help';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// 难度配置
const difficultyConfig: Record<TutorialDifficulty, { label: string; color: string }> = {
  [TutorialDifficulty.BEGINNER]: { label: '入门', color: 'green' },
  [TutorialDifficulty.INTERMEDIATE]: { label: '进阶', color: 'orange' },
  [TutorialDifficulty.ADVANCED]: { label: '高级', color: 'red' },
};

const TutorialList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [total, setTotal] = useState(0);

  // 查询参数
  const [query, setQuery] = useState<TutorialListQuery>({
    page: 1,
    pageSize: 12,
  });

  // 加载教程列表
  const loadTutorials = async () => {
    setLoading(true);
    try {
      const response = await getTutorials(query);
      setTutorials(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载教程列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutorials();
  }, [query]);

  // 搜索
  const handleSearch = (value: string) => {
    setQuery({ ...query, keyword: value || undefined, page: 1 });
  };

  // 难度筛选
  const handleDifficultyChange = (value: TutorialDifficulty | 'all') => {
    setQuery({
      ...query,
      difficulty: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  // 分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setQuery({ ...query, page, pageSize: pageSize || query.pageSize });
  };

  // 跳转到教程详情
  const goToTutorial = (tutorialId: string) => {
    navigate(`/help/tutorials/${tutorialId}`);
  };

  return (
    <div>
      {/* 页头 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <BookOutlined style={{ fontSize: 48, color: '#faad14', marginBottom: 16 }} />
            <Title level={2} style={{ marginBottom: 8 }}>
              视频教程
            </Title>
            <Paragraph type="secondary">
              通过视频快速学习产品功能
            </Paragraph>
          </div>

          {/* 搜索和筛选 */}
          <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
            <Search
              placeholder="搜索教程..."
              onSearch={handleSearch}
              style={{ width: 400 }}
              allowClear
              enterButton={<SearchOutlined />}
            />

            <Select
              placeholder="难度等级"
              style={{ width: 150 }}
              value={query.difficulty || 'all'}
              onChange={handleDifficultyChange}
            >
              <Option value="all">全部难度</Option>
              {Object.entries(difficultyConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>

            <Button onClick={() => navigate('/help')}>
              返回帮助中心
            </Button>
          </Space>

          {/* 难度标签 */}
          <div style={{ textAlign: 'center' }}>
            <Space wrap>
              <Tag
                color={!query.difficulty ? 'blue' : 'default'}
                style={{ cursor: 'pointer', padding: '4px 12px' }}
                onClick={() => handleDifficultyChange('all')}
              >
                全部难度
              </Tag>
              {Object.entries(difficultyConfig).map(([key, config]) => (
                <Tag
                  key={key}
                  color={query.difficulty === key ? config.color : 'default'}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => handleDifficultyChange(key as TutorialDifficulty)}
                >
                  {config.label}
                </Tag>
              ))}
            </Space>
          </div>
        </Space>
      </Card>

      {/* 教程列表 */}
      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        </Card>
      ) : tutorials.length > 0 ? (
        <>
          <Row gutter={[16, 16]}>
            {tutorials.map((tutorial) => {
              const diffConfig = difficultyConfig[tutorial.difficulty];

              return (
                <Col key={tutorial.id} xs={24} sm={12} lg={8} xl={6}>
                  <Card
                    hoverable
                    cover={
                      <div
                        style={{
                          position: 'relative',
                          paddingTop: '56.25%',
                          background: tutorial.coverImage
                            ? `url(${tutorial.coverImage}) center/cover`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          cursor: 'pointer',
                        }}
                        onClick={() => goToTutorial(tutorial.id)}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <PlayCircleOutlined
                            style={{
                              fontSize: 64,
                              color: '#fff',
                              opacity: 0.9,
                            }}
                          />
                        </div>
                        <Tag
                          color={diffConfig.color}
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                          }}
                        >
                          {diffConfig.label}
                        </Tag>
                      </div>
                    }
                    onClick={() => goToTutorial(tutorial.id)}
                  >
                    <Card.Meta
                      title={
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tutorial.title}
                        </div>
                      }
                      description={
                        <div
                          style={{
                            height: 40,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            marginBottom: 12,
                          }}
                        >
                          {tutorial.summary}
                        </div>
                      }
                    />

                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space size="small">
                          <ClockCircleOutlined />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {tutorial.duration} 分钟
                          </Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {tutorial.steps.length} 个步骤
                        </Text>
                      </Space>

                      <Space style={{ width: '100%', justifyContent: 'space-between', fontSize: 12 }}>
                        <Space size="large">
                          <Space size="small">
                            <EyeOutlined />
                            <span>{tutorial.views}</span>
                          </Space>
                          <Space size="small">
                            <LikeOutlined />
                            <span>{tutorial.likes}</span>
                          </Space>
                        </Space>
                        <Space size="small">
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <span>{tutorial.completedCount} 人完成</span>
                        </Space>
                      </Space>

                      {tutorial.tags && tutorial.tags.length > 0 && (
                        <Space wrap size="small">
                          {tutorial.tags.slice(0, 3).map((tag) => (
                            <Tag key={tag} style={{ fontSize: 11 }}>
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* 分页 */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Pagination
              current={query.page}
              pageSize={query.pageSize}
              total={total}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 个教程`}
              onChange={handlePageChange}
              pageSizeOptions={['12', '24', '48']}
            />
          </div>
        </>
      ) : (
        <Card>
          <Empty description="暂无教程" />
        </Card>
      )}

      {/* 底部提示 */}
      <Card style={{ marginTop: 24, textAlign: 'center', background: '#fafafa' }}>
        <Space direction="vertical">
          <Text>需要更多帮助？</Text>
          <Space>
            <Button type="primary" onClick={() => navigate('/help/faqs')}>
              查看 FAQ
            </Button>
            <Button onClick={() => navigate('/help')}>
              返回帮助中心
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default TutorialList;
