import { useState, useEffect } from 'react';
import { Card, Space, Alert, Form, Tabs, message } from 'antd';
import {
  getUserEventHistory,
  replayUserEvents,
  replayToVersion,
  timeTravel,
  getEventStats,
  getRecentEvents,
} from '@/services/events';
import type { UserEvent, EventStats } from '@/types';
import {
  EventStatsCards,
  RecentEventsTab,
  UserHistoryTab,
  EventStatsTab,
  EventDetailModal,
  ReplayResultModal,
  ReplayToVersionModal,
  TimeTravelModal,
} from '@/components/EventSourcing';

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
    'AccountLocked',
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
        <EventStatsCards stats={stats} />

        {/* 主要功能区 */}
        <Card>
          <Tabs>
            <TabPane tab="最近事件" key="recent">
              <RecentEventsTab
                eventTypes={eventTypes}
                selectedEventType={selectedEventType}
                onEventTypeChange={setSelectedEventType}
                onRefresh={loadRecentEvents}
                events={recentEvents}
                loading={loading}
                onViewDetail={(event) => {
                  setSelectedEvent(event);
                  setDetailVisible(true);
                }}
                getEventTypeColor={getEventTypeColor}
              />
            </TabPane>

            <TabPane tab="用户事件历史" key="user">
              <UserHistoryTab
                selectedUserId={selectedUserId}
                onUserIdChange={setSelectedUserId}
                onLoadHistory={loadUserHistory}
                onReplay={handleReplay}
                onReplayToVersion={() => setVersionModalVisible(true)}
                onTimeTravel={() => setTimeTravelModalVisible(true)}
                onViewDetail={(event) => {
                  setSelectedEvent(event);
                  setDetailVisible(true);
                }}
                onSetVersionForReplay={(version) => {
                  versionForm.setFieldsValue({ version });
                }}
                userEvents={userEvents}
                loading={loading}
                getEventTypeColor={getEventTypeColor}
              />
            </TabPane>

            <TabPane tab="事件统计" key="stats">
              <EventStatsTab stats={stats} getEventTypeColor={getEventTypeColor} />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      {/* 事件详情 Modal */}
      <EventDetailModal
        visible={detailVisible}
        event={selectedEvent}
        onClose={() => setDetailVisible(false)}
        getEventTypeColor={getEventTypeColor}
      />

      {/* 重放结果 Modal */}
      <ReplayResultModal
        visible={replayModalVisible}
        result={replayResult}
        onClose={() => setReplayModalVisible(false)}
      />

      {/* 重放到版本 Modal */}
      <ReplayToVersionModal
        visible={versionModalVisible}
        form={versionForm}
        userEventsCount={userEvents.length}
        onOk={handleReplayToVersion}
        onCancel={() => {
          setVersionModalVisible(false);
          versionForm.resetFields();
        }}
      />

      {/* 时间旅行 Modal */}
      <TimeTravelModal
        visible={timeTravelModalVisible}
        form={timeTravelForm}
        onOk={handleTimeTravel}
        onCancel={() => {
          setTimeTravelModalVisible(false);
          timeTravelForm.resetFields();
        }}
      />
    </div>
  );
};

export default EventSourcingViewer;
