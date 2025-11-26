/**
 * 知识库管理页面
 *
 * 功能:
 * - 文章列表展示和搜索
 * - 分类管理（树形结构）
 * - 文章创建/编辑/删除
 * - 批量发布/归档
 * - 统计数据展示
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Tree,
  Drawer,
  Form,
  Tabs,
  Badge,
  Dropdown,
  Popconfirm,
  Typography,
  Empty,
} from 'antd';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BookOutlined,
  FolderOutlined,
  FileTextOutlined,
  StarOutlined,
  PushpinOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  MoreOutlined,
  SearchOutlined,
  SendOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import dayjs from 'dayjs';
import {
  getCategories,
  searchArticles,
  createCategory,
  updateCategory,
  deleteCategory,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticles,
  archiveArticles,
  getKnowledgeStats,
  type KnowledgeCategory,
  type KnowledgeArticle,
  type ArticleStatus,
  type ArticleVisibility,
  type SearchArticlesParams,
} from '@/services/knowledgeBase';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const KnowledgeBasePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // 状态
  const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');
  const [searchParams, setSearchParams] = useState<SearchArticlesParams>({
    page: 1,
    limit: 20,
  });
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [articleDrawerVisible, setArticleDrawerVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [editingCategory, setEditingCategory] = useState<KnowledgeCategory | null>(null);
  const [previewArticle, setPreviewArticle] = useState<KnowledgeArticle | null>(null);

  // 获取分类
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['kb-categories'],
    queryFn: () => getCategories(true),
  });

  // 获取文章
  const { data: articlesResult, isLoading: articlesLoading, error: articlesError, refetch: refetchArticles } = useQuery({
    queryKey: ['kb-articles', searchParams, selectedCategory],
    queryFn: () => searchArticles({ ...searchParams, categoryId: selectedCategory }),
  });

  // 获取统计
  const { data: stats } = useQuery({
    queryKey: ['kb-stats'],
    queryFn: () => getKnowledgeStats(),
  });

  // 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetchArticles();
        refetchCategories();
        message.info('正在刷新...');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateArticle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      message.success('分类创建成功');
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '创建失败'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCategory(id, data),
    onSuccess: () => {
      message.success('分类更新成功');
      setCategoryModalVisible(false);
      categoryForm.resetFields();
      setEditingCategory(null);
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '更新失败'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      message.success('分类删除成功');
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '删除失败'),
  });

  const createArticleMutation = useMutation({
    mutationFn: createArticle,
    onSuccess: () => {
      message.success('文章创建成功');
      setArticleDrawerVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-stats'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '创建失败'),
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateArticle(id, data),
    onSuccess: () => {
      message.success('文章更新成功');
      setArticleDrawerVisible(false);
      form.resetFields();
      setEditingArticle(null);
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '更新失败'),
  });

  const deleteArticleMutation = useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      message.success('文章删除成功');
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-stats'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '删除失败'),
  });

  const publishMutation = useMutation({
    mutationFn: publishArticles,
    onSuccess: (result) => {
      message.success(`已发布 ${result.published} 篇文章`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '发布失败'),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveArticles,
    onSuccess: (result) => {
      message.success(`已归档 ${result.archived} 篇文章`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    },
    onError: (err: any) => message.error(err?.response?.data?.message || '归档失败'),
  });

  // 分类树数据转换
  const categoryTreeData: DataNode[] = useMemo(() => {
    const convert = (cats: KnowledgeCategory[]): DataNode[] => {
      return cats.map((cat) => ({
        key: cat.id,
        title: (
          <Space>
            <span>{cat.name}</span>
            <Badge count={cat.articleCount} size="small" style={{ backgroundColor: SEMANTIC.success.main }} />
            {!cat.isActive && <Tag color="default">已禁用</Tag>}
          </Space>
        ),
        icon: <FolderOutlined />,
        children: cat.children?.length ? convert(cat.children) : undefined,
      }));
    };
    return convert(categories);
  }, [categories]);

  // 分类选项（扁平化）
  const categoryOptions = useMemo(() => {
    const flatten = (cats: KnowledgeCategory[], level = 0): { id: string; name: string; level: number }[] => {
      return cats.reduce((acc, cat) => {
        acc.push({ id: cat.id, name: cat.name, level });
        if (cat.children?.length) {
          acc.push(...flatten(cat.children, level + 1));
        }
        return acc;
      }, [] as { id: string; name: string; level: number }[]);
    };
    return flatten(categories);
  }, [categories]);

  // 处理函数
  const handleCreateArticle = () => {
    setEditingArticle(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
      visibility: 'internal',
      tags: [],
      keywords: [],
    });
    setArticleDrawerVisible(true);
  };

  const handleEditArticle = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    form.setFieldsValue({
      ...article,
      tags: article.tags || [],
      keywords: article.keywords || [],
    });
    setArticleDrawerVisible(true);
  };

  const handleSubmitArticle = async () => {
    try {
      const values = await form.validateFields();
      if (editingArticle) {
        updateArticleMutation.mutate({ id: editingArticle.id, data: values });
      } else {
        createArticleMutation.mutate(values);
      }
    } catch (error) {
      // 表单验证失败
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (category: KnowledgeCategory) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue(category);
    setCategoryModalVisible(true);
  };

  const handleSubmitCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      if (editingCategory) {
        updateCategoryMutation.mutate({ id: editingCategory.id, data: values });
      } else {
        createCategoryMutation.mutate(values);
      }
    } catch (error) {
      // 表单验证失败
    }
  };

  // 状态标签
  const renderStatusTag = (status: ArticleStatus) => {
    const config: Record<ArticleStatus, { color: string; text: string; icon: React.ReactNode }> = {
      draft: { color: 'default', text: '草稿', icon: <ClockCircleOutlined /> },
      published: { color: 'success', text: '已发布', icon: <CheckCircleOutlined /> },
      archived: { color: 'warning', text: '已归档', icon: <InboxOutlined /> },
    };
    const c = config[status];
    return <Tag color={c.color} icon={c.icon}>{c.text}</Tag>;
  };

  // 可见性标签
  const renderVisibilityTag = (visibility: ArticleVisibility) => {
    const config: Record<ArticleVisibility, { color: string; text: string }> = {
      public: { color: 'green', text: '公开' },
      internal: { color: 'blue', text: '内部' },
      private: { color: 'red', text: '私有' },
    };
    const c = config[visibility];
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  // 表格列
  const columns: ColumnsType<KnowledgeArticle> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 280,
      render: (title, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            {record.isPinned && <PushpinOutlined style={{ color: SEMANTIC.error.main }} />}
            {record.isFeatured && <StarOutlined style={{ color: SEMANTIC.warning.main }} />}
            <Text
              strong
              ellipsis
              style={{ maxWidth: 200, cursor: 'pointer' }}
              onClick={() => setPreviewArticle(record)}
            >
              {title}
            </Text>
          </Space>
          {record.summary && (
            <Text type="secondary" ellipsis style={{ maxWidth: 250, fontSize: 12 }}>
              {record.summary}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 120,
      render: (name) => name ? <Tag icon={<FolderOutlined />}>{name}</Tag> : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '草稿', value: 'draft' },
        { text: '已发布', value: 'published' },
        { text: '已归档', value: 'archived' },
      ],
      render: renderStatusTag,
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 80,
      render: renderVisibilityTag,
    },
    {
      title: '浏览/使用',
      key: 'stats',
      width: 100,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text><EyeOutlined /> {record.viewCount}</Text>
          <Text><SendOutlined /> {record.useCount}</Text>
        </Space>
      ),
    },
    {
      title: '作者',
      dataIndex: 'authorName',
      key: 'authorName',
      width: 100,
      render: (name) => name || '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      sorter: true,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEditArticle(record)} />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'preview',
                  icon: <EyeOutlined />,
                  label: '预览',
                  onClick: () => setPreviewArticle(record),
                },
                {
                  key: 'copy',
                  icon: <CopyOutlined />,
                  label: '复制内容',
                  onClick: () => {
                    navigator.clipboard.writeText(record.content);
                    message.success('已复制到剪贴板');
                  },
                },
                { type: 'divider' },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除',
                  danger: true,
                  onClick: () => {
                    Modal.confirm({
                      title: '确认删除',
                      content: `确定要删除文章「${record.title}」吗？`,
                      onOk: () => deleteArticleMutation.mutate(record.id),
                    });
                  },
                },
              ],
            }}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <ErrorBoundary boundaryName="KnowledgeBasePage">
      <div>
        <h2>
          <BookOutlined style={{ marginRight: 8 }} />
          知识库管理
          <Tag icon={<ReloadOutlined spin={articlesLoading || categoriesLoading} />} color="processing" style={{ marginLeft: 12, cursor: 'pointer' }} onClick={() => { refetchArticles(); refetchCategories(); }}>
            Ctrl+R 刷新
          </Tag>
        </h2>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="分类数" value={stats?.categoryCount || 0} prefix={<FolderOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="已发布" value={stats?.articleStats?.published || 0} valueStyle={{ color: SEMANTIC.success.main }} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="总浏览" value={stats?.totalViews || 0} prefix={<EyeOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="总使用" value={stats?.totalUses || 0} prefix={<SendOutlined />} />
            </Card>
          </Col>
        </Row>

        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'articles' | 'categories')}
            tabBarExtraContent={
              activeTab === 'articles' ? (
                <Space>
                  {selectedRowKeys.length > 0 && (
                    <>
                      <Button onClick={() => publishMutation.mutate(selectedRowKeys)} loading={publishMutation.isPending}>
                        批量发布 ({selectedRowKeys.length})
                      </Button>
                      <Button onClick={() => archiveMutation.mutate(selectedRowKeys)} loading={archiveMutation.isPending}>
                        批量归档
                      </Button>
                    </>
                  )}
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateArticle}>
                    新建文章
                  </Button>
                </Space>
              ) : (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCategory}>
                  新建分类
                </Button>
              )
            }
            items={[
              {
                key: 'articles',
                label: <><FileTextOutlined /> 文章管理</>,
                children: (
                  <Row gutter={16}>
                    {/* 左侧分类树 */}
                    <Col span={6}>
                      <Card size="small" title="分类筛选">
                        <div style={{ marginBottom: 8 }}>
                          <Button type="link" size="small" onClick={() => setSelectedCategory(undefined)} disabled={!selectedCategory}>
                            清除筛选
                          </Button>
                        </div>
                        {categoriesLoading ? (
                          <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
                        ) : categoryTreeData.length === 0 ? (
                          <Empty description="暂无分类" />
                        ) : (
                          <Tree
                            showIcon
                            defaultExpandAll
                            treeData={categoryTreeData}
                            selectedKeys={selectedCategory ? [selectedCategory] : []}
                            onSelect={(keys) => setSelectedCategory(keys[0] as string)}
                          />
                        )}
                      </Card>
                    </Col>

                    {/* 右侧文章列表 */}
                    <Col span={18}>
                      <Space style={{ marginBottom: 16 }}>
                        <Input.Search
                          placeholder="搜索标题/内容"
                          allowClear
                          style={{ width: 240 }}
                          onSearch={(value) => setSearchParams((prev) => ({ ...prev, keyword: value, page: 1 }))}
                        />
                        <Select
                          placeholder="状态筛选"
                          allowClear
                          style={{ width: 120 }}
                          onChange={(value) => setSearchParams((prev) => ({ ...prev, status: value, page: 1 }))}
                        >
                          <Option value="draft">草稿</Option>
                          <Option value="published">已发布</Option>
                          <Option value="archived">已归档</Option>
                        </Select>
                        <Select
                          placeholder="可见性"
                          allowClear
                          style={{ width: 100 }}
                          onChange={(value) => setSearchParams((prev) => ({ ...prev, visibility: value, page: 1 }))}
                        >
                          <Option value="public">公开</Option>
                          <Option value="internal">内部</Option>
                          <Option value="private">私有</Option>
                        </Select>
                      </Space>

                      <LoadingState
                        loading={articlesLoading}
                        error={articlesError}
                        empty={!articlesLoading && !articlesError && (articlesResult?.items.length || 0) === 0}
                        onRetry={refetchArticles}
                        loadingType="skeleton"
                        skeletonRows={5}
                        emptyDescription="暂无文章"
                      >
                        <Table
                          columns={columns}
                          dataSource={articlesResult?.items || []}
                          rowKey="id"
                          rowSelection={{
                            selectedRowKeys,
                            onChange: (keys) => setSelectedRowKeys(keys as string[]),
                          }}
                          scroll={{ x: 1200 }}
                          pagination={{
                            current: searchParams.page,
                            pageSize: searchParams.limit,
                            total: articlesResult?.total || 0,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => `共 ${total} 条`,
                            onChange: (page, pageSize) => setSearchParams((prev) => ({ ...prev, page, limit: pageSize })),
                          }}
                        />
                      </LoadingState>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'categories',
                label: <><FolderOutlined /> 分类管理</>,
                children: (
                  <LoadingState
                    loading={categoriesLoading}
                    empty={!categoriesLoading && categoryTreeData.length === 0}
                    onRetry={refetchCategories}
                    emptyDescription="暂无分类"
                  >
                    <Tree
                      showIcon
                      defaultExpandAll
                      treeData={categoryTreeData}
                      titleRender={(node) => (
                        <Space>
                          {node.title}
                          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
                            const cat = categories.find((c) => c.id === node.key) || categories.flatMap((c) => c.children || []).find((c) => c.id === node.key);
                            if (cat) handleEditCategory(cat);
                          }} />
                          <Popconfirm
                            title="确认删除此分类？"
                            onConfirm={() => deleteCategoryMutation.mutate(node.key as string)}
                          >
                            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      )}
                    />
                  </LoadingState>
                ),
              },
            ]}
          />
        </Card>

        {/* 文章编辑抽屉 */}
        <Drawer
          title={editingArticle ? '编辑文章' : '新建文章'}
          placement="right"
          width={720}
          open={articleDrawerVisible}
          onClose={() => { setArticleDrawerVisible(false); setEditingArticle(null); form.resetFields(); }}
          extra={
            <Space>
              <Button onClick={() => setArticleDrawerVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleSubmitArticle} loading={createArticleMutation.isPending || updateArticleMutation.isPending}>
                保存
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical">
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="文章标题" maxLength={200} showCount />
            </Form.Item>
            <Form.Item name="summary" label="摘要">
              <TextArea rows={2} placeholder="文章摘要（可选）" maxLength={500} showCount />
            </Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
              <TextArea rows={12} placeholder="支持 Markdown 格式" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="categoryId" label="分类">
                  <Select placeholder="选择分类" allowClear>
                    {categoryOptions.map((cat) => (
                      <Option key={cat.id} value={cat.id}>
                        {'　'.repeat(cat.level)}{cat.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="status" label="状态">
                  <Select>
                    <Option value="draft">草稿</Option>
                    <Option value="published">发布</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="visibility" label="可见性">
                  <Select>
                    <Option value="public">公开</Option>
                    <Option value="internal">内部</Option>
                    <Option value="private">私有</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="tags" label="标签">
                  <Select mode="tags" placeholder="输入标签后回车" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="keywords" label="关键词">
                  <Select mode="tags" placeholder="输入关键词后回车（用于搜索匹配）" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="isPinned" label="置顶" valuePropName="checked">
                  <Select>
                    <Option value={true}>是</Option>
                    <Option value={false}>否</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="isFeatured" label="精选" valuePropName="checked">
                  <Select>
                    <Option value={true}>是</Option>
                    <Option value={false}>否</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="sortOrder" label="排序">
                  <Input type="number" min={0} placeholder="0" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>

        {/* 分类编辑弹窗 */}
        <Modal
          title={editingCategory ? '编辑分类' : '新建分类'}
          open={categoryModalVisible}
          onCancel={() => { setCategoryModalVisible(false); setEditingCategory(null); categoryForm.resetFields(); }}
          onOk={handleSubmitCategory}
          confirmLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
        >
          <Form form={categoryForm} layout="vertical">
            <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
              <Input placeholder="分类名称" maxLength={100} />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <TextArea rows={2} placeholder="分类描述（可选）" />
            </Form.Item>
            <Form.Item name="parentId" label="父分类">
              <Select placeholder="选择父分类（可选）" allowClear>
                {categoryOptions.filter((c) => c.id !== editingCategory?.id).map((cat) => (
                  <Option key={cat.id} value={cat.id}>
                    {'　'.repeat(cat.level)}{cat.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="icon" label="图标">
                  <Input placeholder="图标名称（可选）" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="sortOrder" label="排序">
                  <Input type="number" min={0} placeholder="0" />
                </Form.Item>
              </Col>
            </Row>
            {editingCategory && (
              <Form.Item name="isActive" label="状态">
                <Select>
                  <Option value={true}>启用</Option>
                  <Option value={false}>禁用</Option>
                </Select>
              </Form.Item>
            )}
          </Form>
        </Modal>

        {/* 文章预览弹窗 */}
        <Modal
          title={previewArticle?.title}
          open={!!previewArticle}
          onCancel={() => setPreviewArticle(null)}
          footer={null}
          width={800}
        >
          {previewArticle && (
            <div>
              <Space style={{ marginBottom: 16 }}>
                {renderStatusTag(previewArticle.status)}
                {renderVisibilityTag(previewArticle.visibility)}
                {previewArticle.category && <Tag icon={<FolderOutlined />}>{previewArticle.category.name}</Tag>}
              </Space>
              {previewArticle.summary && (
                <p style={{ color: NEUTRAL_LIGHT.text.secondary, fontStyle: 'italic' }}>{previewArticle.summary}</p>
              )}
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  background: NEUTRAL_LIGHT.bg.layout,
                  padding: 16,
                  borderRadius: 8,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {previewArticle.content}
              </div>
              {previewArticle.tags?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">标签：</Text>
                  {previewArticle.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                </div>
              )}
              <div style={{ marginTop: 16, color: NEUTRAL_LIGHT.text.tertiary, fontSize: 12 }}>
                <Space split={<span>·</span>}>
                  <span>作者：{previewArticle.authorName || '未知'}</span>
                  <span>浏览：{previewArticle.viewCount}</span>
                  <span>使用：{previewArticle.useCount}</span>
                  <span>版本：v{previewArticle.version}</span>
                  <span>更新：{dayjs(previewArticle.updatedAt).format('YYYY-MM-DD HH:mm')}</span>
                </Space>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default KnowledgeBasePage;
