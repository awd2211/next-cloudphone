/**
 * LiveChat 客服管理列表页面
 *
 * 功能:
 * - 查看所有客服列表
 * - 添加/编辑/删除客服
 * - 管理客服状态 (在线/离线/忙碌/离开)
 * - 设置最大并发会话数
 * - 管理客服技能标签
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
  InputNumber,
  message,
  Popconfirm,
  Avatar,
  Badge,
  Tooltip,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAgents,
  getAgentGroups,
  createAgent,
  updateAgent,
  type Agent,
  type AgentGroup,
  type AgentStatus,
} from '@/services/livechat';

const { Option } = Select;

const AgentListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [statusFilter, setStatusFilter] = useState<AgentStatus | undefined>();

  // 获取客服列表
  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['livechat-agents', statusFilter],
    queryFn: () => getAgents({ status: statusFilter }),
  });

  // 获取客服分组列表 (用于选择)
  const { data: groups = [] } = useQuery({
    queryKey: ['livechat-agent-groups'],
    queryFn: getAgentGroups,
  });

  // 创建客服
  const createMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      message.success('客服创建成功');
      setModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-agents'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  // 更新客服
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) => updateAgent(id, data),
    onSuccess: () => {
      message.success('客服更新成功');
      setModalVisible(false);
      setEditingAgent(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-agents'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  // 统计数据
  const stats = useMemo(() => {
    const total = agents.length;
    const online = agents.filter((a) => a.status === 'online').length;
    const busy = agents.filter((a) => a.status === 'busy').length;
    const offline = agents.filter((a) => a.status === 'offline').length;
    return { total, online, busy, offline };
  }, [agents]);

  // 打开新建/编辑弹窗
  const handleOpenModal = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      form.setFieldsValue({
        userId: agent.userId,
        displayName: agent.displayName,
        groupId: agent.groupId,
        maxConcurrentChats: agent.maxConcurrentChats,
        skills: agent.skills,
      });
    } else {
      setEditingAgent(null);
      form.resetFields();
      form.setFieldsValue({
        maxConcurrentChats: 5,
        skills: [],
      });
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (editingAgent) {
      await updateMutation.mutateAsync({ id: editingAgent.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  // 状态标签渲染
  const renderStatusTag = (status: AgentStatus) => {
    const statusMap: Record<AgentStatus, { color: string; text: string }> = {
      online: { color: 'success', text: '在线' },
      offline: { color: 'default', text: '离线' },
      busy: { color: 'warning', text: '忙碌' },
      away: { color: 'processing', text: '离开' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Badge status={config.color as any} text={config.text} />;
  };

  // 表格列定义
  const columns: ColumnsType<Agent> = [
    {
      title: '客服',
      key: 'agent',
      width: 200,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar
            src={record.avatar}
            icon={<UserOutlined />}
            style={{ backgroundColor: record.isOnline ? '#52c41a' : '#d9d9d9' }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.displayName}</div>
            <div style={{ fontSize: 12, color: '#999' }}>ID: {record.userId?.slice(0, 8)}...</div>
          </div>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: '在线', value: 'online' },
        { text: '离线', value: 'offline' },
        { text: '忙碌', value: 'busy' },
        { text: '离开', value: 'away' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: AgentStatus) => renderStatusTag(status),
    },
    {
      title: '分组',
      dataIndex: 'group',
      key: 'group',
      width: 120,
      render: (group: AgentGroup | undefined) =>
        group ? <Tag icon={<TeamOutlined />}>{group.name}</Tag> : '-',
    },
    {
      title: '当前会话',
      key: 'chats',
      width: 120,
      render: (_, record) => (
        <Tooltip title={`最大并发: ${record.maxConcurrentChats}`}>
          <span>
            {record.currentChats} / {record.maxConcurrentChats}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '技能标签',
      dataIndex: 'skills',
      key: 'skills',
      width: 200,
      render: (skills: string[]) => (
        <Space wrap size={[0, 4]}>
          {skills?.slice(0, 3).map((skill) => (
            <Tag key={skill} color="blue">
              {skill}
            </Tag>
          ))}
          {skills?.length > 3 && <Tag>+{skills.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      sorter: (a, b) => a.rating - b.rating,
      render: (rating: number, record) => (
        <Tooltip title={`${record.totalRatings} 次评价`}>
          <span style={{ color: rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f' }}>
            ⭐ {rating.toFixed(1)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '最后活跃',
      dataIndex: 'lastActiveAt',
      key: 'lastActiveAt',
      width: 160,
      sorter: (a, b) =>
        new Date(a.lastActiveAt || 0).getTime() - new Date(b.lastActiveAt || 0).getTime(),
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
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
            title="确定要删除该客服吗？"
            description="删除后无法恢复"
            onConfirm={() => message.info('删除功能待实现')}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>
        <CustomerServiceOutlined style={{ marginRight: 8 }} />
        客服管理
      </h2>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="客服总数"
              value={stats.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="在线"
              value={stats.online}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="忙碌"
              value={stats.busy}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="离线"
              value={stats.offline}
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 工具栏 */}
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            添加客服
          </Button>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="online">在线</Option>
            <Option value="offline">离线</Option>
            <Option value="busy">忙碌</Option>
            <Option value="away">离开</Option>
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>

        {/* 客服列表 */}
        <Table
          columns={columns}
          dataSource={agents}
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
        title={editingAgent ? '编辑客服' : '添加客服'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingAgent(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="userId"
            label="关联用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="输入系统用户ID" disabled={!!editingAgent} />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="客服显示名称" />
          </Form.Item>

          <Form.Item name="groupId" label="所属分组">
            <Select placeholder="选择客服分组" allowClear>
              {groups.map((group) => (
                <Option key={group.id} value={group.id}>
                  {group.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="maxConcurrentChats"
            label="最大并发会话数"
            rules={[{ required: true, message: '请输入最大并发数' }]}
          >
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="skills" label="技能标签">
            <Select
              mode="tags"
              placeholder="输入技能标签，回车确认"
              tokenSeparators={[',']}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AgentListPage;
