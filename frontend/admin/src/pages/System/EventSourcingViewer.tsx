import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Input, Select, DatePicker, message, Tag, Modal, Descriptions, Timeline } from 'antd';
import { SearchOutlined, ReloadOutlined, PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const EventSourcingViewer = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aggregateId, setAggregateId] = useState('');
  const [eventType, setEventType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [replayVisible, setReplayVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('events');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, pageSize: 100 };
      if (aggregateId) params.aggregateId = aggregateId;
      if (eventType) params.eventType = eventType;
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      const res = await request.get('/events', { params });
      setEvents(res.data || res);
    } catch (error) {
      message.error('加载事件失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = async () => {
    try {
      const res = await request.get('/events/snapshots');
      setSnapshots(res);
    } catch (error) {
      message.error('加载快照失败');
    }
  };

  useEffect(() => {
    loadEvents();
    loadSnapshots();
  }, [aggregateId, eventType, dateRange]);

  const handleReplay = async (toEventId?: string) => {
    try {
      await request.post('/events/replay', { aggregateId, toEventId });
      message.success('事件重放已开始');
      setReplayVisible(false);
    } catch (error) {
      message.error('重放失败');
    }
  };

  const viewEventDetail = (event: any) => {
    setSelectedEvent(event);
    setDetailVisible(true);
  };

  const getEventTypeColor = (type: string) => {
    if (type.includes('Created')) return 'green';
    if (type.includes('Updated')) return 'blue';
    if (type.includes('Deleted')) return 'red';
    return 'default';
  };

  const eventColumns = [
    { title: '事件ID', dataIndex: 'id', key: 'id', width: 150, render: (id: string) => id.substring(0, 12) },
    { title: '聚合ID', dataIndex: 'aggregateId', key: 'aggregateId', width: 150, render: (id: string) => id.substring(0, 12) },
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 200,
      render: (type: string) => <Tag color={getEventTypeColor(type)}>{type}</Tag>,
    },
    { title: '版本', dataIndex: 'version', key: 'version', width: 80, align: 'center' as const },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 160, render: (t: string) => dayjs(t).format('MM-DD HH:mm:ss') },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: any) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => viewEventDetail(record)}>
          查看
        </Button>
      ),
    },
  ];

  const snapshotColumns = [
    { title: '快照ID', dataIndex: 'id', key: 'id', width: 150, render: (id: string) => id.substring(0, 12) },
    { title: '聚合ID', dataIndex: 'aggregateId', key: 'aggregateId', width: 150, render: (id: string) => id.substring(0, 12) },
    { title: '版本', dataIndex: 'version', key: 'version', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (t: string) => dayjs(t).format('MM-DD HH:mm:ss') },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Input
              placeholder="聚合ID"
              style={{ width: 200 }}
              prefix={<SearchOutlined />}
              value={aggregateId}
              onChange={(e) => setAggregateId(e.target.value)}
            />
            <Select placeholder="事件类型" style={{ width: 200 }} allowClear value={eventType} onChange={setEventType}>
              <Option value="UserCreated">UserCreated</Option>
              <Option value="UserUpdated">UserUpdated</Option>
              <Option value="DeviceCreated">DeviceCreated</Option>
              <Option value="DeviceDeleted">DeviceDeleted</Option>
            </Select>
            <RangePicker showTime onChange={setDateRange} />
            <Button icon={<ReloadOutlined />} onClick={loadEvents}>刷新</Button>
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setReplayVisible(true)} disabled={!aggregateId}>
              重放事件
            </Button>
          </Space>

          {activeTab === 'events' ? (
            <Table
              columns={eventColumns}
              dataSource={events}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          ) : (
            <Table
              columns={snapshotColumns}
              dataSource={snapshots}
              rowKey="id"
              pagination={{ pageSize: 20 }}
            />
          )}
        </Space>
      </Card>

      <Modal title="事件详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={700}>
        {selectedEvent && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="事件ID">{selectedEvent.id}</Descriptions.Item>
            <Descriptions.Item label="聚合ID">{selectedEvent.aggregateId}</Descriptions.Item>
            <Descriptions.Item label="事件类型">
              <Tag color={getEventTypeColor(selectedEvent.eventType)}>{selectedEvent.eventType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="版本">{selectedEvent.version}</Descriptions.Item>
            <Descriptions.Item label="时间戳">{dayjs(selectedEvent.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="事件数据">
              <pre style={{ maxHeight: '400px', overflow: 'auto', background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                {JSON.stringify(selectedEvent.data, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="事件重放"
        open={replayVisible}
        onCancel={() => setReplayVisible(false)}
        onOk={() => handleReplay()}
        okText="确认重放"
      >
        <Alert message={`将重放聚合 ${aggregateId} 的所有事件`} type="warning" showIcon style={{ marginBottom: '16px' }} />
        <p>此操作将重建聚合状态，请确认操作。</p>
      </Modal>
    </div>
  );
};

export default EventSourcingViewer;
