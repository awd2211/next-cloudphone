import React, { useEffect } from 'react';
import { Card, Space, Alert, Tabs, Tag, message } from 'antd';
import { ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
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
import { ErrorBoundary, LoadingState } from '@/components/ErrorHandling';

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
 * 事件溯源查看器内容组件
 *
 * 包含页面的核心逻辑和 UI
 */
const EventSourcingViewerContent: React.FC = () => {
  const hook = useEventSourcingViewer();

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        hook.loadRecentEvents();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hook.loadRecentEvents]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>
          <HistoryOutlined style={{ marginRight: 8 }} />
          事件溯源查看器
          <Tag
            icon={<ReloadOutlined spin={hook.loading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer' }}
            onClick={() => {
              hook.loadRecentEvents();
              message.info('正在刷新...');
            }}
          >
            Ctrl+R 刷新
          </Tag>
        </h2>
      </div>

      <LoadingState
        loading={hook.loading && !hook.stats}
        onRetry={() => hook.loadRecentEvents()}
        errorDescription="加载事件数据失败"
        loadingType="skeleton"
        skeletonRows={4}
      >
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
      </LoadingState>

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

/**
 * 事件溯源查看器（优化版 v3）
 *
 * 优化策略:
 * 1. ErrorBoundary - 包裹整个页面，捕获运行时错误
 * 2. LoadingState - 统一加载状态管理
 * 3. 快捷键支持 - Ctrl+R 刷新
 * 4. 页面标题优化 - 添加图标和刷新按钮
 */
const EventSourcingViewer: React.FC = () => {
  return (
    <ErrorBoundary>
      <EventSourcingViewerContent />
    </ErrorBoundary>
  );
};

export default EventSourcingViewer;
