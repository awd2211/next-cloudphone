import { memo, useMemo } from 'react';
import { Space, Select, Button, Table, Tag } from 'antd';
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { UserEvent } from '@/types';
import dayjs from 'dayjs';

interface RecentEventsTabProps {
  eventTypes: string[];
  selectedEventType: string;
  onEventTypeChange: (type: string) => void;
  onRefresh: () => void;
  events: UserEvent[];
  loading: boolean;
  onViewDetail: (event: UserEvent) => void;
  getEventTypeColor: (type: string) => string;
}

/**
 * 最近事件Tab组件
 * 包含事件类型筛选和最近事件表格
 */
export const RecentEventsTab = memo<RecentEventsTabProps>(
  ({
    eventTypes,
    selectedEventType,
    onEventTypeChange,
    onRefresh,
    events,
    loading,
    onViewDetail,
    getEventTypeColor,
  }) => {
    // ✅ 使用 useMemo 缓存 columns，避免每次渲染重新创建
    const columns = useMemo(
      () => [
        {
          title: '事件ID',
          dataIndex: 'id',
          key: 'id',
          width: 120,
          render: (id: string) => id.substring(0, 12),
        },
        {
          title: '用户ID',
          dataIndex: 'aggregateId',
          key: 'aggregateId',
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
          render: (t: string) => dayjs(t).format('MM-DD HH:mm:ss'),
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
              onClick={() => onViewDetail(record)}
            >
              查看
            </Button>
          ),
        },
      ],
      [getEventTypeColor, onViewDetail]
    );

    return (
      <>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="筛选事件类型"
            style={{ width: 200 }}
            allowClear
            value={selectedEventType || undefined}
            onChange={onEventTypeChange}
          >
            {eventTypes.map((type) => (
              <Select.Option key={type} value={type}>
                {type}
              </Select.Option>
            ))}
          </Select>

          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={events}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </>
    );
  }
);

RecentEventsTab.displayName = 'RecentEventsTab';
