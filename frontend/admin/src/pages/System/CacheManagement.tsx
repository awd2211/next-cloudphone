import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Input, message, Popconfirm, Tag, Progress } from 'antd';
import { DatabaseOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
import request from '@/utils/request';
import dayjs from 'dayjs';

const CacheManagement = () => {
  const [stats, setStats] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPattern, setSearchPattern] = useState('');

  const loadStats = async () => {
    try {
      const res = await request.get('/system/cache/stats');
      setStats(res);
    } catch (error) {
      message.error('加载统计失败');
    }
  };

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await request.get('/system/cache/keys', {
        params: { pattern: searchPattern || '*', limit: 100 }
      });
      setKeys(res);
    } catch (error) {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadKeys();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [searchPattern]);

  const handleDelete = async (key: string) => {
    try {
      await request.delete(`/system/cache/keys/${encodeURIComponent(key)}`);
      message.success('删除成功');
      loadKeys();
      loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleClearAll = async () => {
    try {
      await request.post('/system/cache/clear');
      message.success('缓存已清空');
      loadKeys();
      loadStats();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: 'Key', dataIndex: 'key', key: 'key', width: 300 },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 100, render: (t: string) => <Tag>{t}</Tag> },
    { title: 'TTL', dataIndex: 'ttl', key: 'ttl', width: 120, render: (ttl: number) => ttl > 0 ? `${ttl}s` : '永久' },
    { title: 'Size', dataIndex: 'size', key: 'size', width: 100, render: (s: number) => `${s} bytes` },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.key)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const memoryUsagePercent = stats ? (stats.usedMemory / stats.maxMemory) * 100 : 0;

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card><Statistic title="总Key数" value={stats?.keyCount || 0} prefix={<DatabaseOutlined />} /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="命中率" value={stats?.hitRate || 0} precision={2} suffix="%" /></Card>
          </Col>
          <Col span={6}>
            <Card><Statistic title="连接数" value={stats?.connections || 0} /></Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="内存使用" value={memoryUsagePercent.toFixed(1)} suffix="%" />
              <Progress percent={Math.round(memoryUsagePercent)} size="small" status={memoryUsagePercent > 80 ? 'exception' : 'normal'} />
            </Card>
          </Col>
        </Row>

        <Card>
          <Space style={{ marginBottom: '16px' }}>
            <Input.Search
              placeholder="搜索Key (支持通配符)"
              onSearch={(val) => setSearchPattern(val)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            <Button icon={<ReloadOutlined />} onClick={loadKeys}>刷新</Button>
            <Popconfirm title="确定清空所有缓存？" onConfirm={handleClearAll}>
              <Button danger icon={<ClearOutlined />}>清空缓存</Button>
            </Popconfirm>
          </Space>

          <Table
            columns={columns}
            dataSource={keys}
            rowKey="key"
            loading={loading}
            pagination={{ pageSize: 20 }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default CacheManagement;
