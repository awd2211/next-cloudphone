/**
 * 官网内容管理标签页
 * 管理首页各区块的可配置内容
 */
import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Tooltip,
  Card,
  Typography,
  Collapse,
  Descriptions,
  Alert,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  HomeOutlined,
  GlobalOutlined,
  FormatPainterOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContents, updateContent, CmsContent } from '@/services/cms';

const { Text, Title } = Typography;

// 区块名称映射
const sectionLabels: Record<string, string> = {
  'hero': 'Hero 横幅轮播',
  'features': '核心功能特性',
  'stats': '平台统计数据',
  'how-it-works': '使用流程',
  'use-cases': '应用场景',
  'cta-banner': 'CTA 行动号召',
  'faq': '常见问题',
  'seo': 'SEO 配置',
  'pricing-section': '定价区块标题',
  'header-nav': '顶部导航',
  'footer-nav': '页脚导航',
};

// 页面名称映射
const pageLabels: Record<string, string> = {
  'home': '首页',
  'global': '全局',
};

const PageContentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [currentContent, setCurrentContent] = useState<CmsContent | null>(null);
  const [form] = Form.useForm();
  const [jsonContent, setJsonContent] = useState('');

  // 获取所有内容
  const { data: contents = [], isLoading, refetch } = useQuery({
    queryKey: ['cms-page-contents'],
    queryFn: async () => {
      const homeContents = await getContents('home');
      const globalContents = await getContents('global');
      return [...homeContents, ...globalContents];
    },
  });

  // 更新内容
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CmsContent> }) =>
      updateContent(id, data),
    onSuccess: () => {
      message.success('内容更新成功');
      queryClient.invalidateQueries({ queryKey: ['cms-page-contents'] });
      setEditModalVisible(false);
    },
    onError: () => {
      message.error('更新失败');
    },
  });

  // 打开编辑弹窗
  const handleEdit = (record: CmsContent) => {
    setCurrentContent(record);
    setJsonContent(JSON.stringify(record.content, null, 2));
    form.setFieldsValue({
      title: record.title,
      isActive: record.isActive,
      sortOrder: record.sortOrder,
    });
    setEditModalVisible(true);
  };

  // 打开预览弹窗
  const handlePreview = (record: CmsContent) => {
    setCurrentContent(record);
    setPreviewModalVisible(true);
  };

  // 提交更新
  const handleSubmit = async () => {
    if (!currentContent) return;

    try {
      const values = await form.validateFields();
      let parsedContent;

      try {
        parsedContent = JSON.parse(jsonContent);
      } catch {
        message.error('JSON 格式错误，请检查');
        return;
      }

      updateMutation.mutate({
        id: currentContent.id,
        data: {
          ...values,
          content: parsedContent,
        },
      });
    } catch {
      // Form validation failed
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '页面',
      dataIndex: 'page',
      key: 'page',
      width: 100,
      render: (page: string) => (
        <Tag icon={page === 'global' ? <GlobalOutlined /> : <HomeOutlined />} color={page === 'global' ? 'purple' : 'blue'}>
          {pageLabels[page] || page}
        </Tag>
      ),
      filters: [
        { text: '首页', value: 'home' },
        { text: '全局', value: 'global' },
      ],
      onFilter: (value: React.Key | boolean, record: CmsContent) => record.page === value,
    },
    {
      title: '区块',
      dataIndex: 'section',
      key: 'section',
      width: 150,
      render: (section: string) => (
        <Text strong>{sectionLabels[section] || section}</Text>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 180,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: (a: CmsContent, b: CmsContent) => a.sortOrder - b.sortOrder,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: CmsContent) => (
        <Space>
          <Tooltip title="预览">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 渲染内容预览
  const renderContentPreview = (content: Record<string, unknown>) => {
    return (
      <Collapse defaultActiveKey={['0']}>
        {Object.entries(content).map(([key, value], index) => (
          <Collapse.Panel header={<Text strong>{key}</Text>} key={index}>
            {typeof value === 'object' ? (
              <pre style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 6,
                maxHeight: 300,
                overflow: 'auto',
                fontSize: 12,
              }}>
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              <Text>{String(value)}</Text>
            )}
          </Collapse.Panel>
        ))}
      </Collapse>
    );
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <HomeOutlined />
            <span>官网内容管理</span>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            刷新
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={2} size="small">
          <Descriptions.Item label="内容区块总数">{contents.length}</Descriptions.Item>
          <Descriptions.Item label="已启用">{contents.filter(c => c.isActive).length}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Table
        columns={columns}
        dataSource={contents}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
      />

      {/* 编辑弹窗 */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>编辑内容 - {currentContent && sectionLabels[currentContent.section]}</span>
          </Space>
        }
        open={editModalVisible}
        onOk={handleSubmit}
        onCancel={() => setEditModalVisible(false)}
        width={900}
        confirmLoading={updateMutation.isPending}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题">
            <Input placeholder="内容标题" />
          </Form.Item>

          <Form.Item label="内容 (JSON)">
            <Space style={{ marginBottom: 8 }}>
              <Button
                size="small"
                icon={<FormatPainterOutlined />}
                onClick={() => {
                  try {
                    const formatted = JSON.stringify(JSON.parse(jsonContent), null, 2);
                    setJsonContent(formatted);
                    message.success('格式化成功');
                  } catch {
                    message.error('JSON 格式错误，无法格式化');
                  }
                }}
              >
                格式化 JSON
              </Button>
            </Space>
            <Input.TextArea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              rows={18}
              style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            />
            <Alert
              message="提示：修改 JSON 内容时请确保格式正确，可点击「格式化 JSON」按钮自动格式化"
              type="info"
              showIcon
              style={{ marginTop: 8 }}
            />
          </Form.Item>

          <Space size="large">
            <Form.Item name="isActive" label="启用状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>

            <Form.Item name="sortOrder" label="排序">
              <Input type="number" style={{ width: 100 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>预览 - {currentContent && sectionLabels[currentContent.section]}</span>
          </Space>
        }
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        {currentContent && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="页面">{pageLabels[currentContent.page]}</Descriptions.Item>
              <Descriptions.Item label="区块">{sectionLabels[currentContent.section]}</Descriptions.Item>
              <Descriptions.Item label="标题">{currentContent.title}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={currentContent.isActive ? 'success' : 'default'}>
                  {currentContent.isActive ? '已启用' : '已禁用'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>内容详情</Title>
            {renderContentPreview(currentContent.content)}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PageContentsTab;
