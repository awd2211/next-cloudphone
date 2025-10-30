import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  message,
  Tag,
  Modal,
  Descriptions,
  Timeline,
  Alert,
  Form,
  Tabs
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import {
  getUserEventHistory,
  replayUserEvents,
  replayToVersion,
  timeTravel,
  getEventStats,
  getRecentEvents
} from '@/services/events';
import type { UserEvent, EventStats } from '@/types';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const EventSourcingViewer = () => {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<UserEvent[]>([]);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<UserEvent | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [replayModalVisible, setReplayModalVisible] = useState(false);
  const [versionModalVisible, setVersionModalVisible] = useState(false);
  const [timeTravelModalVisible, setTimeTravelModalVisible] = useState(false);
  const [replayResult, setReplayResult] = useState<any>(null);

  const [versionForm] = Form.useForm();
  const [timeTravelForm] = Form.useForm();

  // 事件类型列表
  const eventTypes = [
    'UserCreated',
    'UserUpdated',
    'PasswordChanged',
    'UserDeleted',
    'LoginInfoUpdated',
    'AccountLocked'
  ];

  // 加载事件统计
  const loadStats = async () => {
    try {
      const res = await getEventStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      message.error('加载统计失败');
    }
  };

  // 加载最近事件
  const loadRecentEvents = async () => {
    setLoading(true);
    try {
      const res = await getRecentEvents(selectedEventType || undefined, 50);
      if (res.success) {
        setRecentEvents(res.data);
      }
    } catch (error) {
      message.error('加载最近事件失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载用户事件历史
  const loadUserHistory = async () => {
    if (!selectedUserId) {
      message.warning('请输入用户ID');
      return;
    }

    setLoading(true);
    try {
      const res = await getUserEventHistory(selectedUserId);
      if (res.success) {
        setUserEvents(res.data.events);
        message.success(`找到 ${res.data.totalEvents} 个事件`);
      }
    } catch (error) {
      message.error('加载用户事件历史失败');
      setUserEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // 重放用户事件
  const handleReplay = async () => {
    if (!selectedUserId) {
      message.warning('请输入用户ID');
      return;
    }

    try {
      const res = await replayUserEvents(selectedUserId);
      if (res.success) {
        setReplayResult(res.data);
        message.success('事件重放成功');
        setReplayModalVisible(true);
      }
    } catch (error) {
      message.error('事件重放失败');
    }
  };

  // 重放到特定版本
  const handleReplayToVersion = async () => {
    try {
      const values = await versionForm.validateFields();
      const res = await replayToVersion(selectedUserId, values.version);
      if (res.success) {
        setReplayResult(res.data);
        message.success(`已重放到版本 ${values.version}`);
        versionForm.resetFields();
        setVersionModalVisible(false);
        setReplayModalVisible(true);
      }
    } catch (error) {
      message.error('重放到版本失败');
    }
  };

  // 时间旅行
  const handleTimeTravel = async () => {
    try {
      const values = await timeTravelForm.validateFields();
      const timestamp = values.timestamp.toISOString();
      const res = await timeTravel(selectedUserId, timestamp);
      if (res.success) {
        setReplayResult(res.data);
        message.success(`已时间旅行到 ${values.timestamp.format('YYYY-MM-DD HH:mm:ss')}`);
        timeTravelForm.resetFields();
        setTimeTravelModalVisible(false);
        setReplayModalVisible(true);
      }
    } catch (error) {
      message.error('时间旅行失败');
    }
  };

  useEffect(() => {
    loadStats();
    loadRecentEvents();
    const interval = setInterval(loadStats, 30000); // 每30秒刷新统计
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedEventType) {
      loadRecentEvents();
    }
  }, [selectedEventType]);

  const getEventTypeColor = (type: string) => {
    if (type.includes('Created')) return 'green';
    if (type.includes('Updated')) return 'blue';
    if (type.includes('Deleted') || type.includes('Locked')) return 'red';
    if (type.includes('Password')) return 'orange';
    return 'default';
  };

  // 最近事件表格列
  const recentEventColumns = [
    {
      title: '事件ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => id.substring(0, 12)
    },
    {
      title: '用户ID',
      dataIndex: 'aggregateId',
      key: 'aggregateId',
      width: 120,
      render: (id: string) => id.substring(0, 12)
    },
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 180,
      render: (type: string) => (
        <Tag color={getEventTypeColor(type)}>{type}</Tag>
      )
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center' as const
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: UserEvent) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedEvent(record);
            setDetailVisible(true);
          }}
        >
          查看
        </Button>
      )
    }
  ];

  // 用户事件历史表格列
  const userEventColumns = [
    {
      title: '事件ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => id.substring(0, 12)
    },
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 180,
      render: (type: string) => (
        <Tag color={getEventTypeColor(type)}>{type}</Tag>
      )
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      align: 'center' as const
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: UserEvent) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedEvent(record);
              setDetailVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              versionForm.setFieldsValue({ version: record.version });
              setVersionModalVisible(true);
            }}
          >
            重放到此
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="事件溯源查看器"
          description="基于 CQRS + Event Sourcing 模式的事件管理系统。支持事件历史查询、时间旅行、版本重放等功能。"
          type="info"
          showIcon
        />

        {/* 统计信息 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总事件数"
                value={stats?.totalEvents || 0}
                prefix={<LineChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="UserCreated"
                value={stats?.eventsByType?.UserCreated || 0}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="UserUpdated"
                value={stats?.eventsByType?.UserUpdated || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="UserDeleted"
                value={stats?.eventsByType?.UserDeleted || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 主要功能区 */}
        <Card>
          <Tabs>
            <TabPane tab="最近事件" key="recent">
              <Space style={{ marginBottom: 16 }} wrap>
                <Select
                  placeholder="筛选事件类型"
                  style={{ width: 200 }}
                  allowClear
                  value={selectedEventType || undefined}
                  onChange={setSelectedEventType}
                >
                  {eventTypes.map(type => (
                    <Select.Option key={type} value={type}>
                      {type}
                    </Select.Option>
                  ))}
                </Select>

                <Button icon={<ReloadOutlined />} onClick={loadRecentEvents}>
                  刷新
                </Button>
              </Space>

              <Table
                columns={recentEventColumns}
                dataSource={recentEvents}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
              />
            </TabPane>

            <TabPane tab="用户事件历史" key="user">
              <Space style={{ marginBottom: 16 }} wrap>
                <Input
                  placeholder="输入用户ID"
                  style={{ width: 250 }}
                  prefix={<SearchOutlined />}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  onPressEnter={loadUserHistory}
                />

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={loadUserHistory}
                >
                  查询历史
                </Button>

                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={handleReplay}
                  disabled={!selectedUserId}
                >
                  重放事件
                </Button>

                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => setVersionModalVisible(true)}
                  disabled={!selectedUserId || userEvents.length === 0}
                >
                  重放到版本
                </Button>

                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={() => setTimeTravelModalVisible(true)}
                  disabled={!selectedUserId}
                >
                  时间旅行
                </Button>
              </Space>

              {userEvents.length > 0 && (
                <Alert
                  message={`当前查看用户: ${selectedUserId}`}
                  description={`共 ${userEvents.length} 个事件，版本范围: 1 - ${userEvents[userEvents.length - 1]?.version}`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Table
                columns={userEventColumns}
                dataSource={userEvents}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 20 }}
              />
            </TabPane>

            <TabPane tab="事件统计" key="stats">
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="按类型统计">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {stats && Object.entries(stats.eventsByType).map(([type, count]) => (
                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                          <Tag color={getEventTypeColor(type)}>{type}</Tag>
                          <strong>{count}</strong>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="系统说明">
                    <Space direction="vertical">
                      <div><strong>Event Sourcing (事件溯源)</strong></div>
                      <div>• 所有状态变更都保存为事件</div>
                      <div>• 可以重放事件重建任意时间点的状态</div>
                      <div>• 提供完整的审计日志</div>
                      <div>• 支持时间旅行查看历史状态</div>
                      <div style={{ marginTop: 16 }}><strong>功能说明</strong></div>
                      <div>• <strong>重放事件</strong>: 重建用户当前完整状态</div>
                      <div>• <strong>重放到版本</strong>: 查看用户在特定版本的状态</div>
                      <div>• <strong>时间旅行</strong>: 查看用户在特定时间点的状态</div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 事件详情 Modal */}
      <Modal
        title="事件详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedEvent && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="事件ID">{selectedEvent.id}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{selectedEvent.aggregateId}</Descriptions.Item>
            <Descriptions.Item label="事件类型">
              <Tag color={getEventTypeColor(selectedEvent.eventType)}>
                {selectedEvent.eventType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="版本">{selectedEvent.version}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedEvent.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="事件数据">
              <pre style={{
                maxHeight: '400px',
                overflow: 'auto',
                background: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                margin: 0
              }}>
                {JSON.stringify(selectedEvent.eventData, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 重放结果 Modal */}
      <Modal
        title="重放结果"
        open={replayModalVisible}
        onCancel={() => setReplayModalVisible(false)}
        footer={null}
        width={800}
      >
        {replayResult && (
          <>
            <Alert
              message="重放成功"
              description="已通过事件重放重建用户状态"
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered column={1}>
              <Descriptions.Item label="用户状态">
                <pre style={{
                  maxHeight: '500px',
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  margin: 0
                }}>
                  {JSON.stringify(replayResult, null, 2)}
                </pre>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      {/* 重放到版本 Modal */}
      <Modal
        title="重放到特定版本"
        open={versionModalVisible}
        onOk={handleReplayToVersion}
        onCancel={() => {
          setVersionModalVisible(false);
          versionForm.resetFields();
        }}
        okText="重放"
        cancelText="取消"
      >
        <Form form={versionForm} layout="vertical">
          <Form.Item
            name="version"
            label="目标版本号"
            rules={[
              { required: true, message: '请输入版本号' },
              { type: 'number', min: 1, message: '版本号必须大于0' }
            ]}
          >
            <Input type="number" placeholder="例如: 5" />
          </Form.Item>
          <Alert
            message="提示"
            description={`当前用户有 ${userEvents.length} 个事件。重放到指定版本将显示用户在该版本时的状态。`}
            type="info"
            showIcon
          />
        </Form>
      </Modal>

      {/* 时间旅行 Modal */}
      <Modal
        title="时间旅行"
        open={timeTravelModalVisible}
        onOk={handleTimeTravel}
        onCancel={() => {
          setTimeTravelModalVisible(false);
          timeTravelForm.resetFields();
        }}
        okText="开始旅行"
        cancelText="取消"
      >
        <Form form={timeTravelForm} layout="vertical">
          <Form.Item
            name="timestamp"
            label="目标时间点"
            rules={[{ required: true, message: '请选择时间点' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择日期和时间"
              format="YYYY-MM-DD HH:mm:ss"
            />
          </Form.Item>
          <Alert
            message="时间旅行"
            description="选择一个历史时间点，系统将重放该时间点之前的所有事件，显示用户在那个时间的状态。"
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    </div>
  );
};

export default EventSourcingViewer;
