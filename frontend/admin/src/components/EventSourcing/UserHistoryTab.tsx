import { memo } from 'react';
import { Space, Input, Button, Table, Tag, Alert } from 'antd';
import {
  SearchOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { UserEvent } from '@/types';
import dayjs from 'dayjs';

interface UserHistoryTabProps {
  selectedUserId: string;
  onUserIdChange: (userId: string) => void;
  onLoadHistory: () => void;
  onReplay: () => void;
  onReplayToVersion: () => void;
  onTimeTravel: () => void;
  onViewDetail: (event: UserEvent) => void;
  onSetVersionForReplay: (version: number) => void;
  userEvents: UserEvent[];
  loading: boolean;
  getEventTypeColor: (type: string) => string;
}

/**
 * 用户事件历史Tab组件
 * 包含用户ID搜索、重放按钮、用户事件表格
 */
export const UserHistoryTab = memo<UserHistoryTabProps>(
  ({
    selectedUserId,
    onUserIdChange,
    onLoadHistory,
    onReplay,
    onReplayToVersion,
    onTimeTravel,
    onViewDetail,
    onSetVersionForReplay,
    userEvents,
    loading,
    getEventTypeColor,
  }) => {
    const columns = [
      {
        title: '事件ID',
        dataIndex: 'id',
        key: 'id',
        width: 120,
        render: (id: string) => id.substring(0, 12),
      },
      {
        title: '事件类型',
        dataIndex: 'eventType',
        key: 'eventType',
        width: 180,
        render: (type: string) => <Tag color={getEventTypeColor(type)}>{type}</Tag>,
      },
      {
        title: '版本',
        dataIndex: 'version',
        key: 'version',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 200,
        render: (_: any, record: UserEvent) => (
          <Space size="small">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => onViewDetail(record)}>
              查看
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                onSetVersionForReplay(record.version);
                onReplayToVersion();
              }}
            >
              重放到此
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="输入用户ID"
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
            value={selectedUserId}
            onChange={(e) => onUserIdChange(e.target.value)}
            onPressEnter={onLoadHistory}
          />

          <Button type="primary" icon={<SearchOutlined />} onClick={onLoadHistory}>
            查询历史
          </Button>

          <Button icon={<PlayCircleOutlined />} onClick={onReplay} disabled={!selectedUserId}>
            重放事件
          </Button>

          <Button
            icon={<HistoryOutlined />}
            onClick={onReplayToVersion}
            disabled={!selectedUserId || userEvents.length === 0}
          >
            重放到版本
          </Button>

          <Button icon={<ClockCircleOutlined />} onClick={onTimeTravel} disabled={!selectedUserId}>
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
          columns={columns}
          dataSource={userEvents}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </>
    );
  }
);

UserHistoryTab.displayName = 'UserHistoryTab';
