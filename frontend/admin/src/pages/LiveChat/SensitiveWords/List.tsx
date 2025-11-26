/**
 * LiveChat 敏感词管理页面
 *
 * 功能:
 * - 管理敏感词列表
 * - 设置敏感等级 (低/中/高)
 * - 设置替换文本
 * - 启用/禁用敏感词
 * - 批量导入敏感词
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Statistic,
  Upload,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  getSensitiveWords,
  createSensitiveWord,
  updateSensitiveWord,
  deleteSensitiveWord,
  checkSensitiveWords,
  type SensitiveWord,
} from '@/services/livechat';
import { SEMANTIC, PRIMARY, NEUTRAL_LIGHT } from '@/theme';

const { TextArea } = Input;
const { Option } = Select;

// 敏感等级配置
const sensitivityLevels = [
  { value: 'low', label: '低', color: 'default', description: '仅记录，不拦截' },
  { value: 'medium', label: '中', color: 'warning', description: '自动替换' },
  { value: 'high', label: '高', color: 'error', description: '阻止发送并告警' },
];

const SensitiveWordsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [editingWord, setEditingWord] = useState<SensitiveWord | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | undefined>();
  const [testResult, setTestResult] = useState<{
    hasSensitiveWords: boolean;
    words: string[];
    filteredContent: string;
  } | null>(null);

  // 获取敏感词列表
  const { data: words = [], isLoading, error, refetch } = useQuery({
    queryKey: ['livechat-sensitive-words'],
    queryFn: getSensitiveWords,
  });

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleOpenModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  // 统计数据
  const stats = useMemo(() => {
    const total = words.length;
    const active = words.filter((w) => w.isActive).length;
    const high = words.filter((w) => w.level === 'high').length;
    const medium = words.filter((w) => w.level === 'medium').length;
    const low = words.filter((w) => w.level === 'low').length;
    return { total, active, high, medium, low };
  }, [words]);

  // 过滤后的数据
  const filteredWords = useMemo(() => {
    if (!levelFilter) return words;
    return words.filter((w) => w.level === levelFilter);
  }, [words, levelFilter]);

  // 创建敏感词
  const createMutation = useMutation({
    mutationFn: createSensitiveWord,
    onSuccess: () => {
      message.success('敏感词添加成功');
      setModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-sensitive-words'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '添加失败');
    },
  });

  // 更新敏感词
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SensitiveWord> }) =>
      updateSensitiveWord(id, data),
    onSuccess: () => {
      message.success('敏感词更新成功');
      setModalVisible(false);
      setEditingWord(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-sensitive-words'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  // 删除敏感词
  const deleteMutation = useMutation({
    mutationFn: deleteSensitiveWord,
    onSuccess: () => {
      message.success('敏感词删除成功');
      queryClient.invalidateQueries({ queryKey: ['livechat-sensitive-words'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 检测敏感词
  const checkMutation = useMutation({
    mutationFn: checkSensitiveWords,
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '检测失败');
    },
  });

  // 切换启用状态
  const handleToggleActive = async (word: SensitiveWord) => {
    await updateMutation.mutateAsync({
      id: word.id,
      data: { isActive: !word.isActive },
    });
  };

  // 打开新建/编辑弹窗
  const handleOpenModal = (word?: SensitiveWord) => {
    if (word) {
      setEditingWord(word);
      form.setFieldsValue({
        word: word.word,
        level: word.level,
        replacement: word.replacement,
        isActive: word.isActive,
      });
    } else {
      setEditingWord(null);
      form.resetFields();
      form.setFieldsValue({
        level: 'medium',
        isActive: true,
        replacement: '***',
      });
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (editingWord) {
      await updateMutation.mutateAsync({ id: editingWord.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  // 测试敏感词检测
  const handleTestCheck = async (values: { content: string }) => {
    await checkMutation.mutateAsync(values.content);
  };

  // 敏感等级标签
  const renderLevelTag = (level: string) => {
    const config = sensitivityLevels.find((l) => l.value === level);
    return (
      <Tooltip title={config?.description}>
        <Tag color={config?.color}>{config?.label || level}</Tag>
      </Tooltip>
    );
  };

  // 表格列定义
  const columns: ColumnsType<SensitiveWord> = [
    {
      title: '敏感词',
      dataIndex: 'word',
      key: 'word',
      width: 180,
      render: (word: string) => (
        <span style={{ fontWeight: 500 }}>{word}</span>
      ),
    },
    {
      title: '敏感等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      filters: sensitivityLevels.map((l) => ({ text: l.label, value: l.value })),
      onFilter: (value, record) => record.level === value,
      render: (level: string) => renderLevelTag(level),
    },
    {
      title: '替换文本',
      dataIndex: 'replacement',
      key: 'replacement',
      width: 120,
      render: (replacement: string) => (
        <Tag color="blue">{replacement || '***'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      filters: [
        { text: '启用', value: true },
        { text: '禁用', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          loading={updateMutation.isPending}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<StopOutlined />}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除该敏感词吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={deleteMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ErrorBoundary boundaryName="SensitiveWordsPage">
    <div>
      <h2>
        <SafetyCertificateOutlined style={{ marginRight: 8 }} />
        敏感词管理
        <Tag
          icon={<ReloadOutlined spin={isLoading} />}
          color="processing"
          style={{ marginLeft: 12, cursor: 'pointer' }}
          onClick={() => refetch()}
        >
          Ctrl+R 刷新
        </Tag>
      </h2>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="总数" value={stats.total} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已启用"
              value={stats.active}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="高危"
              value={stats.high}
              valueStyle={{ color: SEMANTIC.error.main }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="中等"
              value={stats.medium}
              valueStyle={{ color: SEMANTIC.warning.main }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="低危" value={stats.low} />
          </Card>
        </Col>
        <Col span={4}>
          <Card
            size="small"
            hoverable
            onClick={() => setTestModalVisible(true)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ textAlign: 'center' }}>
              <SafetyCertificateOutlined style={{ fontSize: 24, color: PRIMARY.main }} />
              <div style={{ marginTop: 4, color: PRIMARY.main }}>测试检测</div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            添加敏感词
          </Button>
          <Select
            placeholder="按等级筛选"
            allowClear
            style={{ width: 120 }}
            value={levelFilter}
            onChange={setLevelFilter}
          >
            {sensitivityLevels.map((level) => (
              <Option key={level.value} value={level.value}>
                {level.label}
              </Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>

        <LoadingState
          loading={isLoading}
          error={error}
          empty={!isLoading && !error && filteredWords.length === 0}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无敏感词"
        >
          <Table
            columns={columns}
            dataSource={filteredWords}
            rowKey="id"
            loading={false}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </LoadingState>
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingWord ? '编辑敏感词' : '添加敏感词'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingWord(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="word"
            label="敏感词"
            rules={[{ required: true, message: '请输入敏感词' }]}
          >
            <Input placeholder="输入敏感词" disabled={!!editingWord} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="level"
                label="敏感等级"
                rules={[{ required: true, message: '请选择敏感等级' }]}
              >
                <Select>
                  {sensitivityLevels.map((level) => (
                    <Option key={level.value} value={level.value}>
                      <Space>
                        <Tag color={level.color}>{level.label}</Tag>
                        <span style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>
                          {level.description}
                        </span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="replacement"
                label="替换文本"
                tooltip="敏感词被检测到后替换为该文本"
              >
                <Input placeholder="如：***" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* 测试敏感词检测弹窗 */}
      <Modal
        title="敏感词检测测试"
        open={testModalVisible}
        onCancel={() => {
          setTestModalVisible(false);
          testForm.resetFields();
          setTestResult(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setTestModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="check"
            type="primary"
            loading={checkMutation.isPending}
            onClick={() => testForm.submit()}
          >
            检测
          </Button>,
        ]}
        width={560}
      >
        <Form form={testForm} layout="vertical" onFinish={handleTestCheck}>
          <Form.Item
            name="content"
            label="测试内容"
            rules={[{ required: true, message: '请输入测试内容' }]}
          >
            <TextArea rows={4} placeholder="输入要检测的文本内容" />
          </Form.Item>
        </Form>

        {testResult && (
          <div style={{ marginTop: 16 }}>
            {testResult.hasSensitiveWords ? (
              <Alert
                message="检测到敏感词"
                description={
                  <div>
                    <div>
                      敏感词: {testResult.words.map((w) => (
                        <Tag key={w} color="red" style={{ marginRight: 4 }}>
                          {w}
                        </Tag>
                      ))}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      过滤后: <code>{testResult.filteredContent}</code>
                    </div>
                  </div>
                }
                type="warning"
                showIcon
              />
            ) : (
              <Alert
                message="未检测到敏感词"
                description="内容安全，未发现敏感词"
                type="success"
                showIcon
              />
            )}
          </div>
        )}
      </Modal>
    </div>
    </ErrorBoundary>
  );
};

export default SensitiveWordsPage;
