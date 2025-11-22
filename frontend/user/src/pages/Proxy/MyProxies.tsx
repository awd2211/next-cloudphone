import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Select,
  Progress,
  Tooltip,
} from 'antd';
import {
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useMyProxies,
  useMyProxyStats,
  useAcquireProxy,
  useReleaseProxy,
} from '@/hooks/queries/useProxy';
import type { ProxyRecord } from '@/services/proxy';

/**
 * 我的代理IP页面 - 用户端
 *
 * 功能：
 * 1. 查看当前分配的代理
 * 2. 申请新代理
 * 3. 释放代理
 * 4. 查看代理使用统计
 */
const MyProxies: React.FC = () => {
  const [acquireModalVisible, setAcquireModalVisible] = useState(false);
  const [acquireForm] = Form.useForm();

  // 使用自定义 React Query Hooks
  const { data, isLoading } = useMyProxies();
  const { data: stats } = useMyProxyStats(); // 自动30秒刷新
  const acquireMutation = useAcquireProxy();
  const releaseMutation = useReleaseProxy();

  const handleAcquire = () => {
    acquireForm.validateFields().then((values) => {
      acquireMutation.mutate(values, {
        onSuccess: () => {
          setAcquireModalVisible(false);
          acquireForm.resetFields();
        },
      });
    });
  };

  const handleRelease = (record: ProxyRecord) => {
    Modal.confirm({
      title: '确认释放',
      content: `确定要释放代理 ${record.host}:${record.port} 吗？`,
      onOk: () => releaseMutation.mutate(record.id),
    });
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'success';
    if (quality >= 70) return 'normal';
    if (quality >= 50) return 'exception';
    return 'exception';
  };

  const columns: ColumnsType<ProxyRecord> = [
    {
      title: '代理地址',
      key: 'address',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.host}:{record.port}
          </div>
          <Tag color="blue" style={{ marginTop: 4 }}>
            {record.protocol.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: '位置',
      key: 'location',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.country}</div>
          {record.city && (
            <div style={{ fontSize: 12, color: '#999' }}>{record.city}</div>
          )}
        </div>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
    },
    {
      title: '质量',
      dataIndex: 'quality',
      key: 'quality',
      width: 150,
      sorter: (a, b) => a.quality - b.quality,
      render: (quality: number) => (
        <Tooltip title={`质量评分: ${quality}/100`}>
          <Progress
            percent={quality}
            size="small"
            status={getQualityColor(quality) as any}
          />
        </Tooltip>
      ),
    },
    {
      title: '延迟',
      dataIndex: 'latency',
      key: 'latency',
      width: 100,
      sorter: (a, b) => (a.latency ?? 0) - (b.latency ?? 0),
      render: (latency?: number) => (
        <span style={{ color: (latency ?? 0) > 1000 ? '#ff4d4f' : '#52c41a' }}>
          {latency ?? '-'}ms
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          available: { text: '可用', color: 'success' },
          in_use: { text: '使用中', color: 'processing' },
          unavailable: { text: '不可用', color: 'default' },
        };
        const config = statusMap[status] || { text: '未知', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '获取时间',
      dataIndex: 'acquiredAt',
      key: 'acquiredAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => handleRelease(record)}
        >
          释放
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="当前代理数"
              value={stats?.total || 0}
              prefix={<GlobalOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃代理"
              value={stats?.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已过期"
              value={stats?.expired || 0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总带宽消耗"
              value={stats?.totalBandwidthUsed || 0}
              suffix="MB"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#722ed1' }}
              precision={0}
            />
          </Card>
        </Col>
      </Row>

      {/* 代理列表 */}
      <Card
        title="我的代理"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAcquireModalVisible(true)}
            >
              申请代理
            </Button>
            <Button icon={<ReloadOutlined />}>刷新</Button>
          </Space>
        }
      >
        <Table<ProxyRecord>
          columns={columns}
          dataSource={data?.data ?? []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 申请代理弹窗 */}
      <Modal
        title="申请代理"
        open={acquireModalVisible}
        onOk={handleAcquire}
        onCancel={() => setAcquireModalVisible(false)}
        confirmLoading={acquireMutation.isPending}
      >
        <Form form={acquireForm} layout="vertical">
          <Form.Item
            label="国家"
            name="country"
            rules={[{ required: true, message: '请选择国家' }]}
          >
            <Select placeholder="请选择国家">
              <Select.Option value="US">美国</Select.Option>
              <Select.Option value="GB">英国</Select.Option>
              <Select.Option value="DE">德国</Select.Option>
              <Select.Option value="FR">法国</Select.Option>
              <Select.Option value="JP">日本</Select.Option>
              <Select.Option value="SG">新加坡</Select.Option>
              <Select.Option value="HK">香港</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="协议" name="protocol">
            <Select placeholder="请选择协议（可选）">
              <Select.Option value="http">HTTP</Select.Option>
              <Select.Option value="https">HTTPS</Select.Option>
              <Select.Option value="socks5">SOCKS5</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="最低质量" name="minQuality">
            <Select placeholder="请选择最低质量要求（可选）">
              <Select.Option value={90}>优秀 (90+)</Select.Option>
              <Select.Option value={70}>良好 (70+)</Select.Option>
              <Select.Option value={50}>一般 (50+)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyProxies;
