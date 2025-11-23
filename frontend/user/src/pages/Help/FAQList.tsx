import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Card,
  Collapse,
  Input,
  Select,
  Space,
  Tag,
  Button,
  Empty,
  Spin,
  Typography,
  Pagination,
  message,
} from 'antd';
import {
  QuestionCircleOutlined,
  SearchOutlined,
  LikeOutlined,
  DislikeOutlined,
  EyeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getFAQs,
  markHelpful,
  recordFAQView,
  FAQCategory,
  type FAQ,
  type FAQListQuery,
} from '@/services/help';

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// FAQ 分类配置
const faqCategoryConfig: Record<FAQCategory, { label: string; color: string }> = {
  [FAQCategory.GENERAL]: { label: '常见问题', color: 'blue' },
  [FAQCategory.ACCOUNT]: { label: '账户相关', color: 'green' },
  [FAQCategory.BILLING]: { label: '计费相关', color: 'orange' },
  [FAQCategory.DEVICE]: { label: '设备相关', color: 'cyan' },
  [FAQCategory.APP]: { label: '应用相关', color: 'purple' },
  [FAQCategory.TECHNICAL]: { label: '技术问题', color: 'red' },
  [FAQCategory.SECURITY]: { label: '安全问题', color: 'volcano' },
};

const FAQList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [total, setTotal] = useState(0);
  const [helpfulFAQs, setHelpfulFAQs] = useState<Set<string>>(new Set());

  // 查询参数
  const [query, setQuery] = useState<FAQListQuery>({
    page: 1,
    pageSize: 20,
    category: (searchParams.get('category') as FAQCategory) || undefined,
  });

  // 加载 FAQ 列表
  const loadFAQs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getFAQs(query);
      setFaqs(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载 FAQ 列表失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadFAQs();
  }, [loadFAQs]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        loadFAQs().then(() => {
          message.success('数据已刷新');
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadFAQs]);

  // 搜索
  const handleSearch = (value: string) => {
    setQuery({ ...query, keyword: value || undefined, page: 1 });
  };

  // 分类筛选
  const handleCategoryChange = (value: FAQCategory | 'all') => {
    setQuery({
      ...query,
      category: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  // 分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    setQuery({ ...query, page, pageSize: pageSize || query.pageSize });
  };

  // 展开 FAQ 时记录浏览
  const handlePanelChange = (keys: string | string[]) => {
    const activeKeys = Array.isArray(keys) ? keys : [keys];
    const newKey = activeKeys[activeKeys.length - 1];

    if (newKey) {
      recordFAQView(newKey).catch(() => {
        // 忽略错误
      });
    }
  };

  // 标记有帮助
  const handleMarkHelpful = async (faqId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (helpfulFAQs.has(faqId)) {
      message.info('您已经标记过了');
      return;
    }

    try {
      await markHelpful(faqId, 'faq');
      setHelpfulFAQs(new Set(helpfulFAQs).add(faqId));
      message.success('感谢您的反馈！');

      // 刷新列表
      loadFAQs();
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <ErrorBoundary>
      <div>
        {/* 页头 */}
        <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ textAlign: 'center' }}>
            <QuestionCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Title level={2} style={{ marginBottom: 8 }}>
              常见问题
            </Title>
            <Paragraph type="secondary">快速找到常见问题的答案</Paragraph>
          </div>

          {/* 搜索和筛选 */}
          <Space wrap style={{ width: '100%', justifyContent: 'center' }}>
            <Search
              placeholder="搜索问题..."
              onSearch={handleSearch}
              style={{ width: 400 }}
              allowClear
              enterButton={<SearchOutlined />}
            />

            <Select
              placeholder="选择分类"
              style={{ width: 150 }}
              value={query.category || 'all'}
              onChange={handleCategoryChange}
            >
              <Option value="all">全部分类</Option>
              {Object.entries(faqCategoryConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>

            <Button onClick={() => navigate('/help')}>返回帮助中心</Button>
          </Space>

          {/* 分类标签 */}
          <div style={{ textAlign: 'center' }}>
            <Space wrap>
              <Tag
                color={!query.category ? 'blue' : 'default'}
                style={{ cursor: 'pointer', padding: '4px 12px' }}
                onClick={() => handleCategoryChange('all')}
              >
                全部
              </Tag>
              {Object.entries(faqCategoryConfig).map(([key, config]) => (
                <Tag
                  key={key}
                  color={query.category === key ? config.color : 'default'}
                  style={{ cursor: 'pointer', padding: '4px 12px' }}
                  onClick={() => handleCategoryChange(key as FAQCategory)}
                >
                  {config.label}
                </Tag>
              ))}
            </Space>
          </div>
        </Space>
      </Card>

      {/* FAQ 列表 */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : faqs.length > 0 ? (
          <>
            <Collapse accordion onChange={handlePanelChange} expandIconPosition="end">
              {faqs.map((faq) => {
                const categoryConfig = faqCategoryConfig[faq.category];

                return (
                  <Panel
                    key={faq.id}
                    header={
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <QuestionCircleOutlined style={{ color: categoryConfig.color }} />
                          <span style={{ fontWeight: 500 }}>{faq.question}</span>
                          <Tag color={categoryConfig.color}>{categoryConfig.label}</Tag>
                        </Space>
                        <Space
                          size="large"
                          style={{ fontSize: 12 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Space size="small">
                            <EyeOutlined />
                            <span>{faq.views}</span>
                          </Space>
                          <Space size="small">
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <span>{faq.helpfulCount}</span>
                          </Space>
                        </Space>
                      </Space>
                    }
                  >
                    <div style={{ padding: '16px 0' }}>
                      {/* 答案内容 */}
                      <div
                        style={{
                          padding: '16px',
                          background: '#f5f5f5',
                          borderRadius: '4px',
                          marginBottom: '16px',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {faq.answer}
                      </div>

                      {/* 标签 */}
                      {faq.tags && faq.tags.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <Space wrap>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              标签:
                            </Text>
                            {faq.tags.map((tag) => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                          </Space>
                        </div>
                      )}

                      {/* 反馈按钮 */}
                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                        <Space>
                          <Text type="secondary">这个回答对您有帮助吗？</Text>
                          <Button
                            type={helpfulFAQs.has(faq.id) ? 'primary' : 'default'}
                            size="small"
                            icon={<LikeOutlined />}
                            onClick={(e) => handleMarkHelpful(faq.id, e)}
                            disabled={helpfulFAQs.has(faq.id)}
                          >
                            {helpfulFAQs.has(faq.id) ? '已标记有帮助' : '有帮助'}
                          </Button>
                          <Button
                            size="small"
                            icon={<DislikeOutlined />}
                            onClick={() => navigate('/tickets')}
                          >
                            没有帮助
                          </Button>
                        </Space>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </Collapse>

            {/* 分页 */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Pagination
                current={query.page}
                pageSize={query.pageSize}
                total={total}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 个问题`}
                onChange={handlePageChange}
              />
            </div>
          </>
        ) : (
          <Empty description="暂无相关问题" />
        )}
      </Card>

        {/* 底部提示 */}
        <Card style={{ marginTop: 24, textAlign: 'center', background: '#fafafa' }}>
          <Space direction="vertical">
            <Text>还没有找到答案？</Text>
            <Space>
              <Button type="primary" onClick={() => navigate('/tickets')}>
                提交工单
              </Button>
              <Button onClick={() => navigate('/help')}>返回帮助中心</Button>
            </Space>
          </Space>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default FAQList;
