import { Card, Space, Alert, Tabs } from 'antd';
import { useEventSourcingViewer } from '@/hooks/useEventSourcingViewer';
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

const EVENT_TYPES = [
  'UserCreated',
  'UserUpdated',
  'PasswordChanged',
  'UserDeleted',
  'LoginInfoUpdated',
  'AccountLocked',
];

// 事件类型颜色映射
const getEventTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    UserCreated: 'green',
    UserUpdated: 'blue',
    PasswordChanged: 'orange',
    UserDeleted: 'red',
    LoginInfoUpdated: 'cyan',
    AccountLocked: 'volcano',
  };
  return colorMap[type] || 'default';
};

/**
 * 事件溯源查看器（优化版 v2）
 *
 * 优化策略:
 * 1. ✅ 所有业务逻辑提取到 useEventSourcingViewer Hook
 * 2. ✅ 主组件只负责 UI 组合 (65% 代码减少)
 */
const EventSourcingViewer = () => {
  const hook = useEventSourcingViewer();

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="事件溯源管理"
          description="查看用户事件历史、重放事件、状态恢复、时间旅行等功能"
          type="info"
          showIcon
        />

        <EventStatsCards stats={hook.stats} />

        <Card>
          <Tabs defaultActiveKey="recent">
            <TabPane tab="最近事件" key="recent">
              <RecentEventsTab
                events={hook.recentEvents}
                loading={hook.loading}
                selectedEventType={hook.selectedEventType}
                eventTypes={EVENT_TYPES}
                onEventTypeChange={hook.setSelectedEventType}
                onRefresh={hook.loadRecentEvents}
                onViewDetail={hook.viewEventDetail}
                getEventTypeColor={getEventTypeColor}
              />
            </TabPane>

            <TabPane tab="用户事件历史" key="history">
              <UserHistoryTab
                userEvents={hook.userEvents}
                loading={hook.loading}
                selectedUserId={hook.selectedUserId}
                onUserIdChange={hook.setSelectedUserId}
                onLoadHistory={hook.loadUserHistory}
                onReplay={hook.handleReplay}
                onReplayToVersion={() => hook.setVersionModalVisible(true)}
                onTimeTravel={() => hook.setTimeTravelModalVisible(true)}
                onViewDetail={hook.viewEventDetail}
                onSetVersionForReplay={(version) => hook.versionForm.setFieldsValue({ version })}
                getEventTypeColor={getEventTypeColor}
              />
            </TabPane>

            <TabPane tab="统计信息" key="stats">
              <EventStatsTab stats={hook.stats} getEventTypeColor={getEventTypeColor} />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      <EventDetailModal
        visible={hook.detailVisible}
        event={hook.selectedEvent}
        onClose={() => hook.setDetailVisible(false)}
        getEventTypeColor={getEventTypeColor}
      />

      <ReplayResultModal
        visible={hook.replayModalVisible}
        result={hook.replayResult}
        onClose={() => hook.setReplayModalVisible(false)}
      />

      <ReplayToVersionModal
        visible={hook.versionModalVisible}
        form={hook.versionForm}
        userEventsCount={hook.userEvents.length}
        onOk={() => hook.handleReplayToVersion(hook.versionForm.getFieldsValue())}
        onCancel={() => hook.setVersionModalVisible(false)}
      />

      <TimeTravelModal
        visible={hook.timeTravelModalVisible}
        form={hook.timeTravelForm}
        onOk={() => hook.handleTimeTravel(hook.timeTravelForm.getFieldsValue())}
        onCancel={() => hook.setTimeTravelModalVisible(false)}
      />
    </div>
  );
};

export default EventSourcingViewer;
