/**
 * LiveChat 快捷回复管理页面
 *
 * 功能:
 * - 管理预设回复模板
 * - 设置快捷键触发
 * - 分类管理
 * - 使用统计
 */
import React, { useState, useMemo } from 'react';
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
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  ThunderboltOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  getAgentGroups,
  type CannedResponse,
} from '@/services/livechat';

const { TextArea } = Input;
const { Option } = Select;
const { Paragraph } = Typography;

// 预设分类
const defaultCategories = [
  '问候语',
  '结束语',
  '常见问题',
  '技术支持',
  '账单相关',
  '设备问题',
  '其他',
];

const CannedResponsesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  // 获取快捷回复列表
  const { data: responses = [], isLoading, refetch } = useQuery({
    queryKey: ['livechat-canned-responses'],
    queryFn: getCannedResponses,
  });

  // 获取客服分组
  const { data: groups = [] } = useQuery({
    queryKey: ['livechat-agent-groups'],
    queryFn: getAgentGroups,
  });

  // 过滤后的数据
  const filteredResponses = useMemo(() => {
    if (!categoryFilter) return responses;
    return responses.filter((r) => r.category === categoryFilter);
  }, [responses, categoryFilter]);

  // 获取所有分类（包括预设和已使用的）
  const allCategories = useMemo(() => {
    const usedCategories = [...new Set(responses.map((r) => r.category).filter(Boolean))];
    return [...new Set([...defaultCategories, ...usedCategories])];
  }, [responses]);

  // 创建快捷回复
  const createMutation = useMutation({
    mutationFn: createCannedResponse,
    onSuccess: () => {
      message.success('快捷回复创建成功');
      setModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-canned-responses'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  // 更新快捷回复
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CannedResponse> }) =>
      updateCannedResponse(id, data),
    onSuccess: () => {
      message.success('快捷回复更新成功');
      setModalVisible(false);
      setEditingResponse(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-canned-responses'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  // 删除快捷回复
  const deleteMutation = useMutation({
    mutationFn: deleteCannedResponse,
    onSuccess: () => {
      message.success('快捷回复删除成功');
      queryClient.invalidateQueries({ queryKey: ['livechat-canned-responses'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 打开新建/编辑弹窗
  const handleOpenModal = (response?: CannedResponse) => {
    if (response) {
      setEditingResponse(response);
      form.setFieldsValue({
        title: response.title,
        content: response.content,
        shortcut: response.shortcut,
        category: response.category,
        groupId: response.groupId,
      });
    } else {
      setEditingResponse(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 复制内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (editingResponse) {
      await updateMutation.mutateAsync({ id: editingResponse.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  // 表格列定义
  const columns: ColumnsType<CannedResponse> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title: string) => (
        <Space>
          <MessageOutlined />
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Space>
      ),
    },
    {
      title: '快捷键',
      dataIndex: 'shortcut',
      key: 'shortcut',
      width: 100,
      render: (shortcut: string) =>
        shortcut ? (
          <Tag icon={<ThunderboltOutlined />} color="blue">
            /{shortcut}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ margin: 0, maxWidth: 300 }}
            copyable={{ text: content }}
          >
            {content}
          </Paragraph>
        </Tooltip>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: allCategories.map((c) => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
      render: (category: string) => (category ? <Tag>{category}</Tag> : '-'),
    },
    {
      title: '所属分组',
      dataIndex: 'groupId',
      key: 'groupId',
      width: 120,
      render: (groupId: string) => {
        if (!groupId) return <Tag color="green">全局</Tag>;
        const group = groups.find((g) => g.id === groupId);
        return group ? <Tag>{group.name}</Tag> : '-';
      },
    },
    {
      title: '使用次数',
      dataIndex: 'useCount',
      key: 'useCount',
      width: 100,
      sorter: (a, b) => a.useCount - b.useCount,
      render: (count: number) => <span>{count}</span>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      sorter: (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="复制内容">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record.content)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除该快捷回复吗？"
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
    <div>
      <h2>
        <MessageOutlined style={{ marginRight: 8 }} />
        快捷回复管理
      </h2>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
              新建快捷回复
            </Button>
          </Col>
          <Col>
            <Select
              placeholder="按分类筛选"
              allowClear
              style={{ width: 150 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              {allCategories.map((cat) => (
                <Option key={cat} value={cat}>
                  {cat}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              刷新
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredResponses}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingResponse ? '编辑快捷回复' : '新建快捷回复'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingResponse(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="如：问候语-上午" />
          </Form.Item>

          <Form.Item
            name="content"
            label="回复内容"
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="您好，很高兴为您服务！请问有什么可以帮助您的？"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="shortcut"
                label="快捷键"
                tooltip="输入后在聊天框中键入 /快捷键 即可快速插入"
              >
                <Input addonBefore="/" placeholder="hello" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="分类">
                <Select placeholder="选择分类" allowClear>
                  {allCategories.map((cat) => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="groupId"
            label="所属分组"
            tooltip="留空表示所有客服可用"
          >
            <Select placeholder="选择客服分组（留空为全局）" allowClear>
              {groups.map((group) => (
                <Option key={group.id} value={group.id}>
                  {group.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CannedResponsesPage;
