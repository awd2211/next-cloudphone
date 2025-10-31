import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  DatePicker,
  Modal,
  Form,
  message,
  Drawer,
  Descriptions,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  SendOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

interface SMSRecord {
  id: string;
  phone: string;
  content: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  provider: string;
  userId?: string;
  userName?: string;
  templateCode?: string;
  variables?: Record<string, any>;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

const SMSManagement: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    status: undefined as string | undefined,
    provider: undefined as string | undefined,
    phone: '',
    dateRange: null as any,
    page: 1,
    limit: 10,
  });
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SMSRecord | null>(null);
  const [sendForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询 SMS 记录
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sms-records', searchParams],
    queryFn: async () => {
      const params: any = {
        page: searchParams.page,
        limit: searchParams.limit,
      };

      if (searchParams.status) params.status = searchParams.status;
      if (searchParams.provider) params.provider = searchParams.provider;
      if (searchParams.phone) params.phone = searchParams.phone;
      if (searchParams.dateRange) {
        params.startDate = searchParams.dateRange[0].toISOString();
        params.endDate = searchParams.dateRange[1].toISOString();
      }

      const response = await request.get('/sms', { params });
      return response;
    },
  });

  // 查询统计数据
  const { data: stats } = useQuery({
    queryKey: ['sms-stats'],
    queryFn: async () => {
      const response = await request.get('/sms/stats');
      return response;
    },
  });

  // 发送 SMS
  const sendMutation = useMutation({
    mutationFn: async (values: any) => {
      return await request.post('/sms/send', values);
    },
    onSuccess: () => {
      message.success('短信发送成功');
      setSendModalVisible(false);
      sendForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['sms-records'] });
      queryClient.invalidateQueries({ queryKey: ['sms-stats'] });
    },
    onError: () => {
      message.error('短信发送失败');
    },
  });

  const columns: ColumnsType<SMSRecord> = [
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'default', text: '等待发送' },
          sent: { color: 'processing', text: '已发送' },
          delivered: { color: 'success', text: '已送达' },
          failed: { color: 'error', text: '发送失败' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '供应商',
      dataIndex: 'provider',
      key: 'provider',
      width: 100,
      render: (provider: string) => {
        const providerMap: Record<string, string> = {
          aliyun: '阿里云',
          tencent: '腾讯云',
          twilio: 'Twilio',
        };
        return providerMap[provider] || provider;
      },
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 120,
    },
    {
      title: '模板代码',
      dataIndex: 'templateCode',
      key: 'templateCode',
      width: 120,
    },
    {
      title: '发送时间',
      dataIndex: 'sentAt',
      key: 'sentAt',
      width: 160,
      render: (sentAt: string) => sentAt || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: SMSRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedRecord(record);
              setDetailDrawerVisible(true);
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  const handleSearch = () => {
    setSearchParams({ ...searchParams, page: 1 });
  };

  const handleReset = () => {
    setSearchParams({
      status: undefined,
      provider: undefined,
      phone: '',
      dateRange: null,
      page: 1,
      limit: 10,
    });
  };

  const handleSend = () => {
    sendForm.validateFields().then((values) => {
      sendMutation.mutate(values);
    });
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="今日发送" value={stats?.today || 0} suffix="条" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月发送"
              value={stats?.thisMonth || 0}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="发送成功率"
              value={stats?.successRate || 0}
              suffix="%"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总发送量" value={stats?.total || 0} suffix="条" />
          </Card>
        </Col>
      </Row>

      {/* 搜索区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="手机号"
            value={searchParams.phone}
            onChange={(e) =>
              setSearchParams({ ...searchParams, phone: e.target.value })
            }
            style={{ width: 150 }}
          />
          <Select
            placeholder="状态"
            value={searchParams.status}
            onChange={(value) =>
              setSearchParams({ ...searchParams, status: value })
            }
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="pending">等待发送</Select.Option>
            <Select.Option value="sent">已发送</Select.Option>
            <Select.Option value="delivered">已送达</Select.Option>
            <Select.Option value="failed">发送失败</Select.Option>
          </Select>
          <Select
            placeholder="供应商"
            value={searchParams.provider}
            onChange={(value) =>
              setSearchParams({ ...searchParams, provider: value })
            }
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="aliyun">阿里云</Select.Option>
            <Select.Option value="tencent">腾讯云</Select.Option>
            <Select.Option value="twilio">Twilio</Select.Option>
          </Select>
          <RangePicker
            value={searchParams.dateRange}
            onChange={(dates) =>
              setSearchParams({ ...searchParams, dateRange: dates })
            }
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setSendModalVisible(true)}
          >
            发送短信
          </Button>
          <Button icon={<SettingOutlined />}>供应商配置</Button>
        </Space>
      </Card>

      {/* 表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={data?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{
            current: searchParams.page,
            pageSize: searchParams.limit,
            total: data?.meta?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setSearchParams({ ...searchParams, page, limit: pageSize });
            },
          }}
        />
      </Card>

      {/* 发送短信弹窗 */}
      <Modal
        title="发送短信"
        open={sendModalVisible}
        onOk={handleSend}
        onCancel={() => setSendModalVisible(false)}
        confirmLoading={sendMutation.isPending}
      >
        <Form form={sendForm} layout="vertical">
          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            label="短信内容"
            name="content"
            rules={[{ required: true, message: '请输入短信内容' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入短信内容" />
          </Form.Item>
          <Form.Item label="供应商" name="provider" initialValue="aliyun">
            <Select>
              <Select.Option value="aliyun">阿里云</Select.Option>
              <Select.Option value="tencent">腾讯云</Select.Option>
              <Select.Option value="twilio">Twilio</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="模板代码" name="templateCode">
            <Input placeholder="可选，使用模板时填写" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情抽屉 */}
      <Drawer
        title="短信详情"
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={600}
      >
        {selectedRecord && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="手机号">
              {selectedRecord.phone}
            </Descriptions.Item>
            <Descriptions.Item label="内容">
              {selectedRecord.content}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag
                color={
                  selectedRecord.status === 'delivered'
                    ? 'success'
                    : selectedRecord.status === 'failed'
                      ? 'error'
                      : 'processing'
                }
              >
                {selectedRecord.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="供应商">
              {selectedRecord.provider}
            </Descriptions.Item>
            <Descriptions.Item label="用户">
              {selectedRecord.userName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="模板代码">
              {selectedRecord.templateCode || '-'}
            </Descriptions.Item>
            {selectedRecord.variables && (
              <Descriptions.Item label="模板变量">
                <pre>{JSON.stringify(selectedRecord.variables, null, 2)}</pre>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="发送时间">
              {selectedRecord.sentAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="送达时间">
              {selectedRecord.deliveredAt || '-'}
            </Descriptions.Item>
            {selectedRecord.errorMessage && (
              <Descriptions.Item label="错误信息">
                <span style={{ color: 'red' }}>
                  {selectedRecord.errorMessage}
                </span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {selectedRecord.createdAt}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default SMSManagement;

