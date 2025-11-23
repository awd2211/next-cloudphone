/**
 * LiveChat 排队配置管理页面
 *
 * 功能:
 * - 管理排队策略配置
 * - 设置路由策略 (Round Robin, Least Busy, Skill-based, Priority, Random)
 * - 配置最大等待时间
 * - 设置优先级权重
 * - 关联客服分组
 */
import React, { useState } from 'react';
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
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Statistic,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getQueueConfigs,
  createQueueConfig,
  updateQueueConfig,
  deleteQueueConfig,
  getQueueStats,
  getAgentGroups,
  type QueueConfig,
  type RoutingStrategy,
} from '@/services/livechat';

const { TextArea } = Input;
const { Option } = Select;

// 路由策略配置
const routingStrategies: { value: RoutingStrategy; label: string; description: string }[] = [
  { value: 'ROUND_ROBIN', label: '轮询分配', description: '按顺序依次分配给客服' },
  { value: 'LEAST_BUSY', label: '最空闲优先', description: '分配给当前会话最少的客服' },
  { value: 'SKILL_BASED', label: '技能匹配', description: '根据访客需求匹配具有相应技能的客服' },
  { value: 'PRIORITY', label: '优先级分配', description: '根据客服优先级权重分配' },
  { value: 'RANDOM', label: '随机分配', description: '随机分配给可用客服' },
];

const QueueConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // 状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<QueueConfig | null>(null);

  // 获取排队配置列表
  const { data: configs = [], isLoading, refetch } = useQuery({
    queryKey: ['livechat-queue-configs'],
    queryFn: getQueueConfigs,
  });

  // 获取排队统计
  const { data: stats } = useQuery({
    queryKey: ['livechat-queue-stats'],
    queryFn: getQueueStats,
    refetchInterval: 30000, // 30秒刷新一次
  });

  // 获取客服分组
  const { data: groups = [] } = useQuery({
    queryKey: ['livechat-agent-groups'],
    queryFn: getAgentGroups,
  });

  // 创建配置
  const createMutation = useMutation({
    mutationFn: createQueueConfig,
    onSuccess: () => {
      message.success('配置创建成功');
      setModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-queue-configs'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QueueConfig> }) =>
      updateQueueConfig(id, data),
    onSuccess: () => {
      message.success('配置更新成功');
      setModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['livechat-queue-configs'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: deleteQueueConfig,
    onSuccess: () => {
      message.success('配置删除成功');
      queryClient.invalidateQueries({ queryKey: ['livechat-queue-configs'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 打开新建/编辑弹窗
  const handleOpenModal = (config?: QueueConfig) => {
    if (config) {
      setEditingConfig(config);
      form.setFieldsValue({
        name: config.name,
        description: config.description,
        routingStrategy: config.routingStrategy,
        maxWaitTime: config.maxWaitTime,
        priority: config.priority,
        groupId: config.groupId,
        isDefault: config.isDefault,
      });
    } else {
      setEditingConfig(null);
      form.resetFields();
      form.setFieldsValue({
        routingStrategy: 'ROUND_ROBIN',
        maxWaitTime: 300,
        priority: 1,
      });
    }
    setModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (editingConfig) {
      await updateMutation.mutateAsync({ id: editingConfig.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  // 路由策略标签
  const renderStrategyTag = (strategy: RoutingStrategy) => {
    const colorMap: Record<RoutingStrategy, string> = {
      ROUND_ROBIN: 'blue',
      LEAST_BUSY: 'green',
      SKILL_BASED: 'purple',
      PRIORITY: 'orange',
      RANDOM: 'default',
    };
    const strategyInfo = routingStrategies.find((s) => s.value === strategy);
    return (
      <Tooltip title={strategyInfo?.description}>
        <Tag color={colorMap[strategy]}>{strategyInfo?.label || strategy}</Tag>
      </Tooltip>
    );
  };

  // 表格列定义
  const columns: ColumnsType<QueueConfig> = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record) => (
        <Space>
          <SettingOutlined />
          <span style={{ fontWeight: 500 }}>{name}</span>
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '路由策略',
      dataIndex: 'routingStrategy',
      key: 'routingStrategy',
      width: 140,
      filters: routingStrategies.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.routingStrategy === value,
      render: (strategy: RoutingStrategy) => renderStrategyTag(strategy),
    },
    {
      title: '最大等待时间',
      dataIndex: 'maxWaitTime',
      key: 'maxWaitTime',
      width: 140,
      sorter: (a, b) => a.maxWaitTime - b.maxWaitTime,
      render: (time: number) => (
        <Space>
          <ClockCircleOutlined />
          {time}秒 ({Math.floor(time / 60)}分钟)
        </Space>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: (a, b) => a.priority - b.priority,
      render: (priority: number) => (
        <Tag color={priority >= 5 ? 'red' : priority >= 3 ? 'orange' : 'default'}>
          {priority}
        </Tag>
      ),
    },
    {
      title: '关联分组',
      dataIndex: 'groupId',
      key: 'groupId',
      width: 150,
      render: (groupId: string) => {
        const group = groups.find((g) => g.id === groupId);
        return group ? <Tag>{group.name}</Tag> : '-';
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-',
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
            title="确定要删除该配置吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={deleteMutation.isPending || record.isDefault}
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
        <SettingOutlined style={{ marginRight: 8 }} />
        排队配置管理
      </h2>

      {/* 实时统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="当前等待人数"
              value={stats?.waitingCount || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: stats?.waitingCount! > 10 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="平均等待时间"
              value={stats?.avgWaitTime || 0}
              suffix="秒"
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="最长等待时间"
              value={stats?.maxWaitTime || 0}
              suffix="秒"
              valueStyle={{ color: stats?.maxWaitTime! > 300 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {stats?.waitingCount! > 10 && (
        <Alert
          message="排队人数较多"
          description="当前等待人数超过10人，建议增加在线客服或调整路由策略"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            新建配置
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 新建/编辑弹窗 */}
      <Modal
        title={editingConfig ? '编辑排队配置' : '新建排队配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          >
            <Input placeholder="如：VIP客户队列、技术支持队列" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="配置说明" />
          </Form.Item>

          <Form.Item
            name="routingStrategy"
            label="路由策略"
            rules={[{ required: true, message: '请选择路由策略' }]}
          >
            <Select>
              {routingStrategies.map((strategy) => (
                <Option key={strategy.value} value={strategy.value}>
                  <div>
                    <div>{strategy.label}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{strategy.description}</div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="maxWaitTime"
                label="最大等待时间（秒）"
                rules={[{ required: true, message: '请输入最大等待时间' }]}
              >
                <InputNumber
                  min={60}
                  max={3600}
                  style={{ width: '100%' }}
                  addonAfter="秒"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                tooltip="数值越高优先级越高"
                rules={[{ required: true, message: '请输入优先级' }]}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="groupId" label="关联客服分组">
            <Select placeholder="选择关联的客服分组" allowClear>
              {groups.map((group) => (
                <Option key={group.id} value={group.id}>
                  {group.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isDefault" label="设为默认配置" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QueueConfigPage;
