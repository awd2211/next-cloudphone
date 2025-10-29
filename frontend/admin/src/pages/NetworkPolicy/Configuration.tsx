import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Switch, message, Tag, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, ExperimentOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface NetworkPolicy {
  id: string;
  name: string;
  description?: string;
  direction: string;
  protocol?: string;
  sourceIp?: string;
  destIp?: string;
  destPort?: string;
  action: string;
  priority: number;
  isEnabled: boolean;
  bandwidthLimit?: number;
  createdAt: string;
}

const NetworkPolicyConfiguration = () => {
  const [policies, setPolicies] = useState<NetworkPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<NetworkPolicy | null>(null);

  const [form] = Form.useForm();
  const [testForm] = Form.useForm();

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await request.get('/devices/network-policies');
      setPolicies(res);
    } catch (error) {
      message.error('加载策略失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const openModal = (policy?: NetworkPolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      form.setFieldsValue({
        name: policy.name,
        description: policy.description,
        direction: policy.direction,
        protocol: policy.protocol,
        sourceIp: policy.sourceIp,
        destIp: policy.destIp,
        destPort: policy.destPort,
        action: policy.action,
        priority: policy.priority,
        isEnabled: policy.isEnabled,
        bandwidthLimit: policy.bandwidthLimit,
      });
    } else {
      setEditingPolicy(null);
      form.resetFields();
      form.setFieldsValue({ direction: 'both', protocol: 'all', action: 'allow', priority: 100, isEnabled: true });
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingPolicy) {
        await request.put(`/devices/network-policies/${editingPolicy.id}`, values);
        message.success('策略更新成功');
      } else {
        await request.post('/devices/network-policies', values);
        message.success('策略创建成功');
      }
      setModalVisible(false);
      loadPolicies();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await request.delete(`/devices/network-policies/${id}`);
      message.success('策略删除成功');
      loadPolicies();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleToggle = async (id: string, isEnabled: boolean) => {
    try {
      await request.patch(`/devices/network-policies/${id}/toggle`, { isEnabled });
      message.success(`策略已${isEnabled ? '启用' : '停用'}`);
      loadPolicies();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleTest = async () => {
    try {
      const values = await testForm.validateFields();
      const result = await request.post('/devices/network-policies/test', values);
      Modal.success({
        title: '测试结果',
        content: (
          <div>
            <p>连通性: {result.connected ? '成功' : '失败'}</p>
            <p>延迟: {result.latency}ms</p>
            <p>带宽: {result.bandwidth} Mbps</p>
          </div>
        ),
      });
      setTestModalVisible(false);
    } catch (error) {
      message.error('测试失败');
    }
  };

  const getDirectionTag = (direction: string) => {
    const map: Record<string, { color: string; text: string }> = {
      inbound: { color: 'blue', text: '入站' },
      outbound: { color: 'green', text: '出站' },
      both: { color: 'purple', text: '双向' },
    };
    const config = map[direction] || map.both;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getActionTag = (action: string) => {
    return action === 'allow' ? (
      <Tag color="success" icon={<CheckCircleOutlined />}>
        允许
      </Tag>
    ) : (
      <Tag color="error" icon={<CloseCircleOutlined />}>
        拒绝
      </Tag>
    );
  };

  const columns: ColumnsType<NetworkPolicy> = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <strong>{name}</strong>
          {record.description && (
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      render: (dir) => getDirectionTag(dir),
    },
    {
      title: '协议',
      dataIndex: 'protocol',
      key: 'protocol',
      width: 100,
      render: (proto) => <Tag>{proto || 'all'}</Tag>,
    },
    {
      title: '源地址',
      dataIndex: 'sourceIp',
      key: 'sourceIp',
      width: 150,
      render: (ip) => ip || '*',
    },
    {
      title: '目标地址',
      key: 'dest',
      width: 180,
      render: (_, record) => {
        const dest = record.destIp || '*';
        const port = record.destPort ? `:${record.destPort}` : '';
        return `${dest}${port}`;
      },
    },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => getActionTag(action),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.priority - b.priority,
    },
    {
      title: '带宽限制',
      dataIndex: 'bandwidthLimit',
      key: 'bandwidthLimit',
      width: 120,
      render: (limit) => (limit ? `${limit} Mbps` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (enabled, record) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggle(record.id, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
              网络策略配置 ({policies.length} 条规则)
            </span>
          </Space>
          <Space>
            <Button icon={<ExperimentOutlined />} onClick={() => setTestModalVisible(true)}>
              连通性测试
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              新建策略
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={policies}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={editingPolicy ? '编辑策略' : '创建策略'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="策略名称"
            name="name"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input placeholder="例如: 允许HTTP访问" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="策略说明" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="方向" name="direction">
                <Select>
                  <Option value="inbound">入站</Option>
                  <Option value="outbound">出站</Option>
                  <Option value="both">双向</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="协议" name="protocol">
                <Select>
                  <Option value="all">全部</Option>
                  <Option value="tcp">TCP</Option>
                  <Option value="udp">UDP</Option>
                  <Option value="icmp">ICMP</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="动作" name="action">
                <Select>
                  <Option value="allow">允许</Option>
                  <Option value="deny">拒绝</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="源IP (CIDR)" name="sourceIp">
                <Input placeholder="例如: 0.0.0.0/0 或留空表示任意" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="目标IP (CIDR)" name="destIp">
                <Input placeholder="例如: 192.168.1.0/24" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="目标端口" name="destPort">
                <Input placeholder="例如: 80 或 8000-9000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="优先级" name="priority">
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="带宽限制 (Mbps)" name="bandwidthLimit">
            <InputNumber min={1} max={10000} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="启用策略" name="isEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="连通性测试"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        onOk={handleTest}
      >
        <Form form={testForm} layout="vertical">
          <Form.Item
            label="目标地址"
            name="targetIp"
            rules={[{ required: true, message: '请输入目标地址' }]}
          >
            <Input placeholder="例如: 8.8.8.8" />
          </Form.Item>
          <Form.Item label="端口" name="port">
            <InputNumber min={1} max={65535} placeholder="例如: 80" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="协议" name="protocol" initialValue="tcp">
            <Select>
              <Option value="tcp">TCP</Option>
              <Option value="udp">UDP</Option>
              <Option value="icmp">ICMP (Ping)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NetworkPolicyConfiguration;
