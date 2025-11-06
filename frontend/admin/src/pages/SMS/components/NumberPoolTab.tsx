import { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  Modal,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface VirtualNumber {
  id: string;
  provider: string;
  phoneNumber: string;
  countryCode: string;
  countryName: string;
  serviceCode: string;
  serviceName: string;
  status: string;
  cost: number;
  deviceId?: string;
  userId?: string;
  activatedAt: string;
  expiresAt?: string;
  smsReceivedAt?: string;
  fromPool: boolean;
}

/**
 * 号码池管理标签页
 *
 * 功能：
 * - 查看所有虚拟号码及状态
 * - 按状态、平台、国家筛选
 * - 取消号码（退款）
 * - 查看号码详情和收到的短信
 */
const NumberPoolTab: React.FC = () => {
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    provider: undefined as string | undefined,
    phone: '',
    page: 1,
    limit: 20,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<VirtualNumber | null>(null);
  const queryClient = useQueryClient();

  // 查询号码列表
  const { data, isLoading } = useQuery({
    queryKey: ['sms-numbers', filters],
    queryFn: async () => {
      const params: any = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.provider) params.provider = filters.provider;
      if (filters.phone) params.phone = filters.phone;

      const response = await request.get('/sms/numbers', { params });
      return response;
    },
  });

  // 取消号码
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return await request.delete(`/sms/numbers/${id}`);
    },
    onSuccess: () => {
      message.success('号码已取消并退款');
      queryClient.invalidateQueries({ queryKey: ['sms-numbers'] });
    },
    onError: () => {
      message.error('取消号码失败');
    },
  });

  const handleCancelNumber = (record: VirtualNumber) => {
    Modal.confirm({
      title: '确认取消号码',
      content: `确定要取消号码 ${record.phoneNumber} 吗？将申请退款 $${record.cost}`,
      onOk: () => cancelMutation.mutate(record.id),
    });
  };

  const handleViewDetail = async (record: VirtualNumber) => {
    // 查询该号码收到的短信
    try {
      const messages = await request.get(`/sms/numbers/${record.id}/messages`);
      setSelectedNumber({ ...record, messages });
      setDetailModalVisible(true);
    } catch (error) {
      message.error('获取短信详情失败');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      active: { color: 'blue', text: '激活中' },
      waiting_sms: { color: 'orange', text: '等待短信' },
      received: { color: 'success', text: '已接收' },
      cancelled: { color: 'default', text: '已取消' },
      expired: { color: 'error', text: '已过期' },
      failed: { color: 'error', text: '失败' },
    };
    return configs[status] || { color: 'default', text: status };
  };

  const columns: ColumnsType<VirtualNumber> = [
    {
      title: '号码',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 150,
      render: (phone, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{phone}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {record.countryName} ({record.countryCode})
          </div>
        </div>
      ),
    },
    {
      title: '平台',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider) => <Tag color="blue">{provider}</Tag>,
    },
    {
      title: '服务',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const config = getStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      render: (cost) => `$${cost.toFixed(4)}`,
    },
    {
      title: '来源',
      dataIndex: 'fromPool',
      key: 'fromPool',
      width: 100,
      render: (fromPool) => (
        <Badge
          status={fromPool ? 'success' : 'default'}
          text={fromPool ? '号码池' : '实时'}
        />
      ),
    },
    {
      title: '激活时间',
      dataIndex: 'activatedAt',
      key: 'activatedAt',
      width: 180,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '短信接收时间',
      dataIndex: 'smsReceivedAt',
      key: 'smsReceivedAt',
      width: 180,
      render: (time) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          {['active', 'waiting_sms'].includes(record.status) && (
            <Tooltip title="取消号码">
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleCancelNumber(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 筛选区域 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 150 }}
            placeholder="状态"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
          >
            <Select.Option value="active">激活中</Select.Option>
            <Select.Option value="waiting_sms">等待短信</Select.Option>
            <Select.Option value="received">已接收</Select.Option>
            <Select.Option value="cancelled">已取消</Select.Option>
            <Select.Option value="expired">已过期</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
          </Select>
          <Select
            style={{ width: 150 }}
            placeholder="平台"
            allowClear
            value={filters.provider}
            onChange={(value) => setFilters({ ...filters, provider: value, page: 1 })}
          >
            <Select.Option value="sms-activate">SMS-Activate</Select.Option>
            <Select.Option value="5sim">5SIM</Select.Option>
            <Select.Option value="smshub">SMS-Hub</Select.Option>
          </Select>
          <Input
            style={{ width: 200 }}
            placeholder="搜索号码"
            prefix={<SearchOutlined />}
            value={filters.phone}
            onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
          />
          <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['sms-numbers'] })}>
            刷新
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 1400 }}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: data?.meta?.total || 0,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个号码`,
          onChange: (page, pageSize) => {
            setFilters({ ...filters, page, limit: pageSize });
          },
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title={`号码详情: ${selectedNumber?.phoneNumber}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedNumber && (
          <div>
            <p><strong>国家：</strong>{selectedNumber.countryName}</p>
            <p><strong>平台：</strong>{selectedNumber.provider}</p>
            <p><strong>服务：</strong>{selectedNumber.serviceName}</p>
            <p><strong>状态：</strong><Tag color={getStatusConfig(selectedNumber.status).color}>{getStatusConfig(selectedNumber.status).text}</Tag></p>
            <p><strong>成本：</strong>${selectedNumber.cost.toFixed(4)}</p>
            <p><strong>设备ID：</strong>{selectedNumber.deviceId || '-'}</p>
            <p><strong>用户ID：</strong>{selectedNumber.userId || '-'}</p>

            <h4 style={{ marginTop: 24 }}>收到的短信：</h4>
            {selectedNumber.messages && selectedNumber.messages.length > 0 ? (
              <ul>
                {selectedNumber.messages.map((msg: any) => (
                  <li key={msg.id}>
                    <div><strong>验证码：</strong><Tag color="blue">{msg.verificationCode}</Tag></div>
                    <div><strong>发送者：</strong>{msg.sender}</div>
                    <div><strong>内容：</strong>{msg.messageText}</div>
                    <div><strong>时间：</strong>{dayjs(msg.receivedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#999' }}>暂无短信</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NumberPoolTab;
