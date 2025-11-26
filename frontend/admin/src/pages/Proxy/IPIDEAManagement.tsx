import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tabs,
  Tag,
  Progress,
  Divider,
  List,
  InputNumber,
} from 'antd';
import {
  SyncOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';
import type { ColumnsType } from 'antd/es/table';

const { TabPane } = Tabs;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:30000';

interface FlowStats {
  flowLeftMB: number;
  flowLeftGB: number;
  totalFlowMB?: number;
  usedFlowMB?: number;
  usagePercentage?: number;
}

interface Account {
  id: string;
  account: string;
  password: string;
  flowLimit?: number;
  flowUsed?: number;
  flowRemaining?: number;
  region?: string;
  status?: string;
  createdAt: string;
}

const IPIDEAManagementPage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const [loading, setLoading] = useState(false);
  const [flowStats, setFlowStats] = useState<FlowStats | null>(null);
  const [whitelistIPs, setWhitelistIPs] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [regions, setRegions] = useState<any[]>([]);

  const [addIPModalVisible, setAddIPModalVisible] = useState(false);
  const [setWarningModalVisible, setSetWarningModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [warningForm] = Form.useForm();

  // 获取流量统计
  const fetchFlowStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE}/proxy/ipidea/${providerId}/flow/remaining`
      );
      setFlowStats(response.data);
    } catch (error) {
      message.error('获取流量信息失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 获取白名单
  const fetchWhitelist = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/proxy/ipidea/${providerId}/whitelist`
      );
      setWhitelistIPs(response.data);
    } catch (error) {
      message.error('获取白名单失败');
      console.error(error);
    }
  };

  // 获取账户列表
  const fetchAccounts = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/proxy/ipidea/${providerId}/accounts`
      );
      setAccounts(response.data.accounts || []);
    } catch (error) {
      message.error('获取账户列表失败');
      console.error(error);
    }
  };

  // 获取区域列表
  const fetchRegions = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/proxy/ipidea/${providerId}/regions`
      );
      setRegions(response.data);
    } catch (error) {
      console.error('获取区域列表失败', error);
    }
  };

  useEffect(() => {
    if (providerId) {
      fetchFlowStats();
      fetchWhitelist();
      fetchAccounts();
      fetchRegions();
    }
  }, [providerId]);

  // 添加白名单IP
  const handleAddIP = async () => {
    try {
      const values = await form.validateFields();
      const response = await axios.post(
        `${API_BASE}/proxy/ipidea/${providerId}/whitelist`,
        { ip: values.ip }
      );

      if (response.data.success) {
        message.success('IP 添加成功');
        setAddIPModalVisible(false);
        form.resetFields();
        fetchWhitelist();
      } else {
        message.error(response.data.message);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加失败');
    }
  };

  // 删除白名单IP
  const handleDeleteIP = (ip: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 IP ${ip} 吗？`,
      onOk: async () => {
        try {
          const response = await axios.delete(
            `${API_BASE}/proxy/ipidea/${providerId}/whitelist/${ip}`
          );

          if (response.data.success) {
            message.success('删除成功');
            fetchWhitelist();
          } else {
            message.error(response.data.message);
          }
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 设置流量预警
  const handleSetWarning = async () => {
    try {
      const values = await warningForm.validateFields();
      const response = await axios.post(
        `${API_BASE}/proxy/ipidea/${providerId}/flow/warning`,
        { thresholdMB: values.thresholdMB }
      );

      if (response.data.success) {
        message.success('流量预警设置成功');
        setSetWarningModalVisible(false);
        warningForm.resetFields();
      } else {
        message.error(response.data.message);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '设置失败');
    }
  };

  // 账户表格列
  const accountColumns: ColumnsType<Account> = [
    {
      title: '账户名',
      dataIndex: 'account',
      key: 'account',
    },
    {
      title: '密码',
      dataIndex: 'password',
      key: 'password',
      render: (password: string) => <Tag>{password}</Tag>,
    },
    {
      title: '流量限制',
      dataIndex: 'flowLimit',
      key: 'flowLimit',
      render: (limit?: number) =>
        limit ? `${(limit / 1024).toFixed(2)} GB` : '-',
    },
    {
      title: '已使用',
      dataIndex: 'flowUsed',
      key: 'flowUsed',
      render: (used?: number) =>
        used ? `${(used / 1024).toFixed(2)} GB` : '-',
    },
    {
      title: '剩余流量',
      dataIndex: 'flowRemaining',
      key: 'flowRemaining',
      render: (remaining?: number) =>
        remaining ? (
          <span style={{ color: remaining < 1000 ? SEMANTIC.error.main : SEMANTIC.success.main }}>
            {(remaining / 1024).toFixed(2)} GB
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '地区',
      dataIndex: 'region',
      key: 'region',
      render: (region?: string) => region || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status?: string) => {
        const color = status === 'active' ? 'green' : 'default';
        return <Tag color={color}>{status || '未知'}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="IPIDEA 代理管理"
        extra={
          <Button icon={<SyncOutlined />} onClick={() => {
            fetchFlowStats();
            fetchWhitelist();
            fetchAccounts();
          }}>
            刷新全部
          </Button>
        }
      >
        {/* 流量统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="剩余流量"
                value={flowStats?.flowLeftGB || 0}
                precision={2}
                suffix="GB"
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: (flowStats?.flowLeftGB || 0) < 1 ? SEMANTIC.error.main : SEMANTIC.success.main }}
              />
              {flowStats?.usagePercentage && (
                <Progress
                  percent={flowStats.usagePercentage}
                  status={flowStats.usagePercentage > 80 ? 'exception' : 'normal'}
                  style={{ marginTop: 8 }}
                />
              )}
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="白名单 IP 数量"
                value={whitelistIPs.length}
                prefix={<GlobalOutlined />}
              />
              <Button
                type="link"
                size="small"
                onClick={() => setAddIPModalVisible(true)}
                style={{ marginTop: 8 }}
              >
                添加 IP
              </Button>
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="认证账户数量"
                value={accounts.length}
                prefix={<TeamOutlined />}
              />
              <Button
                type="link"
                size="small"
                onClick={() => setSetWarningModalVisible(true)}
                style={{ marginTop: 8 }}
              >
                设置预警
              </Button>
            </Card>
          </Col>
        </Row>

        <Tabs defaultActiveKey="1">
          {/* 白名单管理 */}
          <TabPane tab="IP 白名单" key="1">
            <Space style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddIPModalVisible(true)}
              >
                添加 IP
              </Button>
            </Space>
            <List
              bordered
              dataSource={whitelistIPs}
              renderItem={(ip) => (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteIP(ip)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <Tag color="blue">{ip}</Tag>
                </List.Item>
              )}
            />
          </TabPane>

          {/* 认证账户 */}
          <TabPane tab="认证账户" key="2">
            <Table
              columns={accountColumns}
              dataSource={accounts}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          {/* 支持区域 */}
          <TabPane tab="支持区域" key="3">
            <Row gutter={[16, 16]}>
              {regions.map((region) => (
                <Col span={6} key={region.country}>
                  <Card size="small">
                    <div style={{ fontWeight: 'bold' }}>{region.countryName}</div>
                    <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.secondary }}>
                      代码: {region.country}
                    </div>
                    {region.costPerGB && (
                      <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.secondary, marginTop: 4 }}>
                        成本: ${region.costPerGB}/GB
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 添加 IP 模态框 */}
      <Modal
        title="添加 IP 白名单"
        open={addIPModalVisible}
        onOk={handleAddIP}
        onCancel={() => {
          setAddIPModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="ip"
            label="IP 地址"
            rules={[
              { required: true, message: '请输入 IP 地址' },
              {
                pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                message: '请输入有效的 IPv4 地址',
              },
            ]}
          >
            <Input placeholder="例如: 192.168.1.100" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 设置流量预警模态框 */}
      <Modal
        title="设置流量预警"
        open={setWarningModalVisible}
        onOk={handleSetWarning}
        onCancel={() => {
          setSetWarningModalVisible(false);
          warningForm.resetFields();
        }}
      >
        <Form form={warningForm} layout="vertical">
          <Form.Item
            name="thresholdMB"
            label="预警阈值 (MB)"
            rules={[{ required: true, message: '请输入预警阈值' }]}
            extra="当剩余流量低于此值时，系统将发送预警通知"
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="例如: 1000"
              addonAfter="MB"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IPIDEAManagementPage;
