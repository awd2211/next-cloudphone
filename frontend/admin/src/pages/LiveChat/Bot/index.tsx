/**
 * 智能机器人管理页面
 * 管理机器人配置、意图和会话记录
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
  InputNumber,
  Switch,
  Select,
  Tabs,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  List,
  Badge,
  Drawer,
  Tooltip,
  Progress,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  Bot,
  BotIntent,
  BotConversation,
  BotStats,
  IntentMatchType,
  IntentResponseType,
  getBots,
  getBot,
  createBot,
  updateBot,
  deleteBot,
  getIntents,
  createIntent,
  updateIntent,
  deleteIntent,
  getBotConversations,
  getBotStats,
} from '@/services/livechat';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// 意图匹配类型选项
const matchTypeOptions = [
  { value: 'keyword', label: '关键词匹配' },
  { value: 'regex', label: '正则表达式' },
  { value: 'exact', label: '精确匹配' },
  { value: 'similarity', label: '相似度匹配' },
];

// 回复类型选项
const responseTypeOptions = [
  { value: 'text', label: '纯文本' },
  { value: 'quick_replies', label: '快捷回复' },
  { value: 'card', label: '卡片消息' },
  { value: 'transfer', label: '转人工' },
  { value: 'knowledge_base', label: '知识库' },
];

const BotManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('bots');
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [botModalVisible, setBotModalVisible] = useState(false);
  const [intentModalVisible, setIntentModalVisible] = useState(false);
  const [intentDrawerVisible, setIntentDrawerVisible] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [editingIntent, setEditingIntent] = useState<BotIntent | null>(null);
  const [botForm] = Form.useForm();
  const [intentForm] = Form.useForm();

  // 获取机器人列表
  const { data: botsData, isLoading: botsLoading } = useQuery({
    queryKey: ['bots'],
    queryFn: () => getBots(),
  });

  // 获取选中机器人的意图列表
  const { data: intentsData, isLoading: intentsLoading } = useQuery({
    queryKey: ['intents', selectedBot?.id],
    queryFn: () => getIntents(selectedBot!.id),
    enabled: !!selectedBot,
  });

  // 获取机器人统计
  const { data: statsData } = useQuery({
    queryKey: ['botStats', selectedBot?.id],
    queryFn: () => getBotStats(selectedBot?.id),
    enabled: activeTab === 'stats',
  });

  // 获取机器人会话记录
  const { data: conversationsData } = useQuery({
    queryKey: ['botConversations', selectedBot?.id],
    queryFn: () => getBotConversations({ botId: selectedBot?.id, pageSize: 50 }),
    enabled: activeTab === 'conversations' && !!selectedBot,
  });

  // 创建/更新机器人
  const botMutation = useMutation({
    mutationFn: (data: Partial<Bot>) =>
      editingBot ? updateBot(editingBot.id, data) : createBot(data),
    onSuccess: () => {
      message.success(editingBot ? '机器人更新成功' : '机器人创建成功');
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      setBotModalVisible(false);
      setEditingBot(null);
      botForm.resetFields();
    },
    onError: () => {
      message.error(editingBot ? '更新失败' : '创建失败');
    },
  });

  // 删除机器人
  const deleteBotMutation = useMutation({
    mutationFn: deleteBot,
    onSuccess: () => {
      message.success('机器人已删除');
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      if (selectedBot) {
        setSelectedBot(null);
      }
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 创建/更新意图
  const intentMutation = useMutation({
    mutationFn: (data: Partial<BotIntent>) =>
      editingIntent
        ? updateIntent(editingIntent.id, data)
        : createIntent(selectedBot!.id, data),
    onSuccess: () => {
      message.success(editingIntent ? '意图更新成功' : '意图创建成功');
      queryClient.invalidateQueries({ queryKey: ['intents', selectedBot?.id] });
      setIntentModalVisible(false);
      setEditingIntent(null);
      intentForm.resetFields();
    },
    onError: () => {
      message.error(editingIntent ? '更新失败' : '创建失败');
    },
  });

  // 删除意图
  const deleteIntentMutation = useMutation({
    mutationFn: deleteIntent,
    onSuccess: () => {
      message.success('意图已删除');
      queryClient.invalidateQueries({ queryKey: ['intents', selectedBot?.id] });
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 机器人表格列
  const botColumns: ColumnsType<Bot> = [
    {
      title: '机器人名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>{name}</span>
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (isEnabled) => (
        <Tag color={isEnabled ? 'success' : 'default'}>
          {isEnabled ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '意图数',
      key: 'intentsCount',
      render: (_, record) => record.intents?.length || 0,
    },
    {
      title: '最大轮数',
      dataIndex: 'maxBotRounds',
      key: 'maxBotRounds',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="管理意图">
            <Button
              type="link"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setSelectedBot(record);
                setIntentDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingBot(record);
                botForm.setFieldsValue(record);
                setBotModalVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此机器人？"
            onConfirm={() => deleteBotMutation.mutate(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 意图表格列
  const intentColumns: ColumnsType<BotIntent> = [
    {
      title: '意图名称',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name, record) => (
        <Space>
          <MessageOutlined />
          <span>{name}</span>
          {!record.isEnabled && <Tag color="default">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '匹配类型',
      dataIndex: 'matchType',
      key: 'matchType',
      render: (type) => {
        const option = matchTypeOptions.find((o) => o.value === type);
        return <Tag>{option?.label || type}</Tag>;
      },
    },
    {
      title: '匹配规则',
      dataIndex: 'matchRules',
      key: 'matchRules',
      render: (rules) => (
        <Space wrap>
          {rules?.slice(0, 3).map((rule: string, idx: number) => (
            <Tag key={idx}>{rule}</Tag>
          ))}
          {rules?.length > 3 && <Tag>+{rules.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '回复类型',
      dataIndex: 'responseType',
      key: 'responseType',
      render: (type) => {
        const option = responseTypeOptions.find((o) => o.value === type);
        return <Tag color="blue">{option?.label || type}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      sorter: (a, b) => b.priority - a.priority,
    },
    {
      title: '命中次数',
      dataIndex: 'hitCount',
      key: 'hitCount',
      sorter: (a, b) => b.hitCount - a.hitCount,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingIntent(record);
              intentForm.setFieldsValue({
                ...record,
                matchRules: record.matchRules?.join('\n'),
                responseContent:
                  typeof record.responseContent === 'string'
                    ? record.responseContent
                    : JSON.stringify(record.responseContent, null, 2),
              });
              setIntentModalVisible(true);
            }}
          />
          <Popconfirm
            title="确定删除此意图？"
            onConfirm={() => deleteIntentMutation.mutate(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 会话记录列
  const conversationColumns: ColumnsType<BotConversation> = [
    {
      title: '会话ID',
      dataIndex: 'conversationId',
      key: 'conversationId',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          bot_handling: { color: 'processing', text: '机器人处理中' },
          transferred: { color: 'warning', text: '已转人工' },
          bot_resolved: { color: 'success', text: '机器人解决' },
          user_ended: { color: 'default', text: '用户结束' },
          timeout: { color: 'error', text: '超时' },
        };
        const s = statusMap[status] || { color: 'default', text: status };
        return <Badge status={s.color as any} text={s.text} />;
      },
    },
    {
      title: '机器人轮数',
      dataIndex: 'botRounds',
      key: 'botRounds',
    },
    {
      title: '命中意图',
      dataIndex: 'matchedIntents',
      key: 'matchedIntents',
      render: (intents) => intents?.length || 0,
    },
    {
      title: '满意度',
      dataIndex: 'satisfactionScore',
      key: 'satisfactionScore',
      render: (score) => (score ? `${score}/5` : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString(),
    },
  ];

  // 处理机器人表单提交
  const handleBotSubmit = async () => {
    try {
      const values = await botForm.validateFields();
      botMutation.mutate(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 处理意图表单提交
  const handleIntentSubmit = async () => {
    try {
      const values = await intentForm.validateFields();
      // 处理匹配规则（将换行分隔的字符串转为数组）
      const matchRules = values.matchRules
        ?.split('\n')
        .map((r: string) => r.trim())
        .filter(Boolean);
      // 处理回复内容
      let responseContent = values.responseContent;
      if (values.responseType !== 'text') {
        try {
          responseContent = JSON.parse(values.responseContent);
        } catch {
          // 保持原样
        }
      }
      intentMutation.mutate({
        ...values,
        matchRules,
        responseContent,
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 机器人列表 */}
          <TabPane
            tab={
              <span>
                <RobotOutlined />
                机器人管理
              </span>
            }
            key="bots"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingBot(null);
                  botForm.resetFields();
                  setBotModalVisible(true);
                }}
              >
                创建机器人
              </Button>
            </div>
            <Table
              columns={botColumns}
              dataSource={botsData?.items || []}
              rowKey="id"
              loading={botsLoading}
              pagination={{
                total: botsData?.total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </TabPane>

          {/* 统计分析 */}
          <TabPane
            tab={
              <span>
                <BarChartOutlined />
                统计分析
              </span>
            }
            key="stats"
          >
            {statsData ? (
              <>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="总会话数"
                        value={statsData.totalConversations}
                        prefix={<MessageOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="机器人解决"
                        value={statsData.botResolvedCount}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="转人工数"
                        value={statsData.transferredCount}
                        prefix={<SyncOutlined />}
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="解决率"
                        value={statsData.resolutionRate}
                        precision={1}
                        suffix="%"
                        valueStyle={{
                          color: statsData.resolutionRate >= 50 ? '#52c41a' : '#ff4d4f',
                        }}
                      />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Card title="平均轮数">
                      <Statistic value={statsData.avgBotRounds} precision={1} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="平均满意度">
                      <Statistic
                        value={statsData.avgSatisfactionScore}
                        precision={1}
                        suffix="/ 5"
                      />
                    </Card>
                  </Col>
                </Row>
                <Card title="热门意图 TOP 10" style={{ marginTop: 16 }}>
                  <List
                    dataSource={statsData.topIntents}
                    renderItem={(item, index) => (
                      <List.Item>
                        <Space style={{ width: '100%' }}>
                          <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
                          <Text>{item.intentName}</Text>
                          <Progress
                            percent={Math.round(
                              (item.hitCount /
                                (statsData.topIntents[0]?.hitCount || 1)) *
                                100
                            )}
                            size="small"
                            style={{ width: 200 }}
                          />
                          <Text type="secondary">{item.hitCount} 次</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </>
            ) : (
              <Empty description="暂无统计数据" />
            )}
          </TabPane>

          {/* 会话记录 */}
          <TabPane
            tab={
              <span>
                <MessageOutlined />
                会话记录
              </span>
            }
            key="conversations"
          >
            <div style={{ marginBottom: 16 }}>
              <Select
                placeholder="选择机器人"
                style={{ width: 200 }}
                value={selectedBot?.id}
                onChange={(value) => {
                  const bot = botsData?.items.find((b) => b.id === value);
                  setSelectedBot(bot || null);
                }}
                allowClear
              >
                {botsData?.items.map((bot) => (
                  <Select.Option key={bot.id} value={bot.id}>
                    {bot.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <Table
              columns={conversationColumns}
              dataSource={conversationsData?.items || []}
              rowKey="id"
              pagination={{
                total: conversationsData?.total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 机器人编辑弹窗 */}
      <Modal
        title={editingBot ? '编辑机器人' : '创建机器人'}
        open={botModalVisible}
        onOk={handleBotSubmit}
        onCancel={() => {
          setBotModalVisible(false);
          setEditingBot(null);
          botForm.resetFields();
        }}
        width={700}
        confirmLoading={botMutation.isPending}
      >
        <Form form={botForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="机器人名称"
                rules={[{ required: true, message: '请输入机器人名称' }]}
              >
                <Input placeholder="如：智能客服小助手" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="avatar" label="头像URL">
                <Input placeholder="机器人头像链接" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="机器人描述" />
          </Form.Item>
          <Form.Item
            name="welcomeMessage"
            label="欢迎语"
            rules={[{ required: true, message: '请输入欢迎语' }]}
          >
            <TextArea rows={2} placeholder="用户首次发起会话时的自动回复" />
          </Form.Item>
          <Form.Item
            name="fallbackMessage"
            label="兜底回复"
            rules={[{ required: true, message: '请输入兜底回复' }]}
          >
            <TextArea rows={2} placeholder="无法识别用户意图时的回复" />
          </Form.Item>
          <Form.Item name="transferMessage" label="转人工提示语">
            <Input placeholder="正在为您转接人工客服，请稍候..." />
          </Form.Item>
          <Form.Item name="offlineMessage" label="离线提示语">
            <Input placeholder="当前客服不在线，请留言或稍后再试。" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="maxBotRounds" label="最大轮数" initialValue={5}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="idleTimeout" label="超时时间(秒)" initialValue={300}>
                <InputNumber min={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="isEnabled" label="启用" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="isDefault" label="默认" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 意图管理抽屉 */}
      <Drawer
        title={`${selectedBot?.name || ''} - 意图管理`}
        open={intentDrawerVisible}
        onClose={() => setIntentDrawerVisible(false)}
        width={900}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingIntent(null);
              intentForm.resetFields();
              setIntentModalVisible(true);
            }}
          >
            添加意图
          </Button>
        }
      >
        <Table
          columns={intentColumns}
          dataSource={intentsData || []}
          rowKey="id"
          loading={intentsLoading}
          pagination={false}
        />
      </Drawer>

      {/* 意图编辑弹窗 */}
      <Modal
        title={editingIntent ? '编辑意图' : '创建意图'}
        open={intentModalVisible}
        onOk={handleIntentSubmit}
        onCancel={() => {
          setIntentModalVisible(false);
          setEditingIntent(null);
          intentForm.resetFields();
        }}
        width={700}
        confirmLoading={intentMutation.isPending}
      >
        <Form form={intentForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="意图标识"
                rules={[{ required: true, message: '请输入意图标识' }]}
              >
                <Input placeholder="如：ask_price" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="displayName"
                label="显示名称"
                rules={[{ required: true, message: '请输入显示名称' }]}
              >
                <Input placeholder="如：咨询价格" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input placeholder="意图描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="matchType"
                label="匹配类型"
                rules={[{ required: true }]}
                initialValue="keyword"
              >
                <Select options={matchTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="responseType"
                label="回复类型"
                rules={[{ required: true }]}
                initialValue="text"
              >
                <Select options={responseTypeOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="matchRules"
            label={
              <Space>
                匹配规则
                <Tooltip title="每行一个关键词或正则表达式">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            rules={[{ required: true, message: '请输入匹配规则' }]}
          >
            <TextArea rows={4} placeholder="每行一个关键词或正则表达式" />
          </Form.Item>
          <Form.Item
            name="responseContent"
            label={
              <Space>
                回复内容
                <Tooltip title="纯文本直接输入，其他类型请使用 JSON 格式">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
            rules={[{ required: true, message: '请输入回复内容' }]}
          >
            <TextArea rows={4} placeholder="回复内容" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="priority" label="优先级" initialValue={0}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="similarityThreshold"
                label="相似度阈值"
                initialValue={0.7}
              >
                <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="isEnabled"
                label="启用"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default BotManagement;
