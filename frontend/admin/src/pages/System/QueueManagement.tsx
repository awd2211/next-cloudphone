import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, message, Tabs, Tag, Popconfirm, Modal, Descriptions } from 'antd';
import { DatabaseOutlined, ReloadOutlined, DeleteOutlined, SendOutlined, EyeOutlined } from '@ant-design/icons';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const QueueManagement = () => {
  const [stats, setStats] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [dlxMessages, setDlxMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('queues');

  const loadStats = async () => {
    try {
      const res = await request.get('/system/queue/stats');
      setStats(res);
    } catch (error) {
      message.error('加载统计失败');
    }
  };

  const loadQueues = async () => {
    setLoading(true);
    try {
      const res = await request.get('/system/queue/queues');
      setQueues(res);
    } catch (error) {
      message.error('加载队列失败');
    } finally {
      setLoading(false);
    }
  };

  const loadExchanges = async () => {
    try {
      const res = await request.get('/system/queue/exchanges');
      setExchanges(res);
    } catch (error) {
      message.error('加载交换机失败');
    }
  };

  const loadDLX = async () => {
    try {
      const res = await request.get('/system/queue/dlx');
      setDlxMessages(res);
    } catch (error) {
      message.error('加载死信失败');
    }
  };

  useEffect(() => {
    loadStats();
    loadQueues();
    loadExchanges();
    loadDLX();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePurge = async (queueName: string) => {
    try {
      await request.post(`/system/queue/queues/${queueName}/purge`);
      message.success('队列已清空');
      loadQueues();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleRequeue = async (messageId: string) => {
    try {
      await request.post(`/system/queue/messages/${messageId}/requeue`);
      message.success('消息已重新投递');
      loadDLX();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const viewMessageDetail = (msg: any) => {
    setSelectedMessage(msg);
    setDetailVisible(true);
  };

  const queueColumns = [
    { title: '队列名称', dataIndex: 'name', key: 'name', width: 250 },
    { title: '消息数', dataIndex: 'messageCount', key: 'messageCount', width: 100, render: (c: number) => <Tag color="blue">{c}</Tag> },
    { title: '消费者', dataIndex: 'consumers', key: 'consumers', width: 100 },
    { title: '状态', dataIndex: 'state', key: 'state', width: 100, render: (s: string) => <Tag color={s === 'running' ? 'green' : 'red'}>{s}</Tag> },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <Popconfirm title="确定清空队列？" onConfirm={() => handlePurge(record.name)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>清空</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const exchangeColumns = [
    { title: '交换机名称', dataIndex: 'name', key: 'name', width: 250 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 120, render: (t: string) => <Tag>{t}</Tag> },
    { title: '持久化', dataIndex: 'durable', key: 'durable', width: 100, render: (d: boolean) => d ? '是' : '否' },
    { title: '消息速率', dataIndex: 'messageRate', key: 'messageRate', width: 120, render: (r: number) => `${r}/s` },
  ];

  const dlxColumns = [
    { title: '消息ID', dataIndex: 'messageId', key: 'messageId', width: 150, render: (id: string) => id.substring(0, 12) },
    { title: '队列', dataIndex: 'queue', key: 'queue', width: 180 },
    { title: '失败原因', dataIndex: 'reason', key: 'reason', width: 200 },
    { title: '重试次数', dataIndex: 'retryCount', key: 'retryCount', width: 100 },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 160, render: (t: string) => dayjs(t).format('MM-DD HH:mm:ss') },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => viewMessageDetail(record)}>查看</Button>
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleRequeue(record.messageId)}>重试</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card><Statistic title="总队列数" value={stats?.queueCount || 0} prefix={<DatabaseOutlined />} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="总消息数" value={stats?.totalMessages || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="消息速率" value={stats?.messageRate || 0} suffix="/s" /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="死信数量" value={dlxMessages.length} valueStyle={{ color: '#ff4d4f' }} /></Card>
          </Col>
        </Row>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="队列列表" key="queues">
              <Button icon={<ReloadOutlined />} onClick={loadQueues} style={{ marginBottom: '16px' }}>刷新</Button>
              <Table columns={queueColumns} dataSource={queues} rowKey="name" loading={loading} pagination={{ pageSize: 10 }} />
            </TabPane>

            <TabPane tab="交换机" key="exchanges">
              <Button icon={<ReloadOutlined />} onClick={loadExchanges} style={{ marginBottom: '16px' }}>刷新</Button>
              <Table columns={exchangeColumns} dataSource={exchanges} rowKey="name" pagination={{ pageSize: 10 }} />
            </TabPane>

            <TabPane tab={`死信队列 (${dlxMessages.length})`} key="dlx">
              <Button icon={<ReloadOutlined />} onClick={loadDLX} style={{ marginBottom: '16px' }}>刷新</Button>
              <Table columns={dlxColumns} dataSource={dlxMessages} rowKey="messageId" pagination={{ pageSize: 10 }} />
            </TabPane>
          </Tabs>
        </Card>
      </Space>

      <Modal title="消息详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={700}>
        {selectedMessage && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="消息ID">{selectedMessage.messageId}</Descriptions.Item>
            <Descriptions.Item label="队列">{selectedMessage.queue}</Descriptions.Item>
            <Descriptions.Item label="失败原因">{selectedMessage.reason}</Descriptions.Item>
            <Descriptions.Item label="重试次数">{selectedMessage.retryCount}</Descriptions.Item>
            <Descriptions.Item label="消息内容">
              <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
                {JSON.stringify(selectedMessage.payload, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default QueueManagement;
