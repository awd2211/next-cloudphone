import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Space,
  Typography,
  Alert,
  Tooltip,
  Empty,
  DatePicker,
  Select,
  Button,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  LaptopOutlined,
  MobileOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getLoginHistory } from '@/services/auth';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface LoginRecord {
  id: string;
  loginTime: string;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  success: boolean;
  failureReason?: string;
}

/**
 * 登录历史组件
 *
 * 功能：
 * 1. 显示登录记录列表
 * 2. 按时间范围筛选
 * 3. 按状态筛选（成功/失败）
 * 4. 显示设备、浏览器、IP地址等信息
 */
export const LoginHistory: React.FC = React.memo(() => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LoginRecord[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>(
    'all'
  );

  useEffect(() => {
    fetchLoginHistory();
  }, [dateRange, statusFilter]);

  const fetchLoginHistory = async () => {
    setLoading(true);
    try {
      const params: any = {};

      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      if (statusFilter !== 'all') {
        params.success = statusFilter === 'success';
      }

      const records = await getLoginHistory(params);
      setData(records);
    } catch (error) {
      console.error('Failed to fetch login history:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取设备图标
  const getDeviceIcon = (device: string) => {
    const lowerDevice = device.toLowerCase();
    if (lowerDevice.includes('mobile') || lowerDevice.includes('android') || lowerDevice.includes('ios')) {
      return <MobileOutlined style={{ color: '#1890ff' }} />;
    }
    return <LaptopOutlined style={{ color: '#52c41a' }} />;
  };

  const columns: ColumnsType<LoginRecord> = [
    {
      title: '登录时间',
      dataIndex: 'loginTime',
      key: 'loginTime',
      width: 180,
      render: (time: string) => (
        <Text>{dayjs(time).format('YYYY-MM-DD HH:mm:ss')}</Text>
      ),
      sorter: (a, b) => dayjs(a.loginTime).unix() - dayjs(b.loginTime).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 100,
      render: (success: boolean, record) => {
        if (success) {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              成功
            </Tag>
          );
        }
        return (
          <Tooltip title={record.failureReason || '登录失败'}>
            <Tag icon={<CloseCircleOutlined />} color="error">
              失败
            </Tag>
          </Tooltip>
        );
      },
      filters: [
        { text: '成功', value: true },
        { text: '失败', value: false },
      ],
      onFilter: (value, record) => record.success === value,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 150,
      render: (ip: string) => (
        <Text code copyable>
          {ip}
        </Text>
      ),
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      width: 180,
      render: (location: string) => (
        <Space size={4}>
          <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
          <Text>{location || '未知'}</Text>
        </Space>
      ),
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      width: 200,
      render: (device: string) => (
        <Space size={4}>
          {getDeviceIcon(device)}
          <Text>{device}</Text>
        </Space>
      ),
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      key: 'browser',
      width: 150,
      render: (browser: string) => <Text>{browser}</Text>,
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Alert
        message="登录历史记录"
        description="这里显示了您账户的所有登录活动记录。如果发现异常登录，请立即修改密码并启用双因素认证。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Space
        style={{
          width: '100%',
          marginBottom: 16,
          justifyContent: 'space-between',
        }}
      >
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) =>
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)
            }
            placeholder={['开始日期', '结束日期']}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '登录成功', value: 'success' },
              { label: '登录失败', value: 'failed' },
            ]}
          />
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchLoginHistory}>
          刷新
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        locale={{
          emptyText: (
            <Empty
              description="暂无登录记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        scroll={{ x: 1100 }}
      />

      <Alert
        message="安全提示"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
            <li>定期检查登录记录，确保没有异常登录</li>
            <li>如果发现可疑活动，请立即修改密码</li>
            <li>建议启用双因素认证以增强账户安全</li>
            <li>不要在公共设备上保持登录状态</li>
          </ul>
        }
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />
    </div>
  );
});

LoginHistory.displayName = 'LoginHistory';
