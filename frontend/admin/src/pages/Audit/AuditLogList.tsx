import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, DatePicker, Select, Input, Tooltip } from 'antd';
import { DownloadOutlined, SearchOutlined, FilterOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceType: 'user' | 'device' | 'plan' | 'quota' | 'billing' | 'ticket' | 'apikey' | 'system';
  resourceId?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  details?: string;
  changes?: any;
  createdAt: string;
}

const AuditLogList: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: 'log-001',
      userId: 'admin-001',
      userName: '李管理员',
      action: '更新用户配额',
      resource: 'quotas',
      resourceType: 'quota',
      resourceId: 'quota-123',
      method: 'PUT',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      status: 'success',
      details: '将用户 张三 的设备配额从 10 增加到 20',
      changes: { maxDevices: { from: 10, to: 20 } },
      createdAt: '2025-10-20 14:30:25',
    },
    {
      id: 'log-002',
      userId: 'admin-002',
      userName: '赵管理员',
      action: '创建新用户',
      resource: 'users',
      resourceType: 'user',
      resourceId: 'user-456',
      method: 'POST',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'success',
      details: '创建新用户: wangwu@example.com',
      createdAt: '2025-10-20 13:15:42',
    },
    {
      id: 'log-003',
      userId: 'user-001',
      userName: '张三',
      action: '启动设备',
      resource: 'devices',
      resourceType: 'device',
      resourceId: 'device-789',
      method: 'POST',
      ipAddress: '58.220.45.123',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      status: 'success',
      details: '成功启动设备 DEV-12345',
      createdAt: '2025-10-20 12:45:10',
    },
    {
      id: 'log-004',
      userId: 'admin-001',
      userName: '李管理员',
      action: '删除 API 密钥',
      resource: 'apikeys',
      resourceType: 'apikey',
      resourceId: 'key-321',
      method: 'DELETE',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      status: 'success',
      details: '删除 API 密钥: ak_test_xxxx',
      createdAt: '2025-10-20 11:20:33',
    },
    {
      id: 'log-005',
      userId: 'user-002',
      userName: '王五',
      action: '账户充值',
      resource: 'billing',
      resourceType: 'billing',
      resourceId: 'txn-654',
      method: 'POST',
      ipAddress: '112.80.248.75',
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B)',
      status: 'success',
      details: '充值金额: ¥5000.00',
      createdAt: '2025-10-20 10:10:05',
    },
    {
      id: 'log-006',
      userId: 'admin-002',
      userName: '赵管理员',
      action: '修改系统配置',
      resource: 'system',
      resourceType: 'system',
      method: 'PUT',
      ipAddress: '192.168.1.105',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      status: 'warning',
      details: '修改系统邮件配置',
      createdAt: '2025-10-20 09:35:50',
    },
    {
      id: 'log-007',
      userId: 'user-003',
      userName: '李四',
      action: '删除设备',
      resource: 'devices',
      resourceType: 'device',
      resourceId: 'device-999',
      method: 'DELETE',
      ipAddress: '61.140.25.180',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status: 'failed',
      details: '删除设备失败: 设备正在运行中',
      createdAt: '2025-10-20 08:50:15',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(logs);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  const getResourceTypeTag = (type: AuditLog['resourceType']) => {
    const typeConfig = {
      user: { color: 'blue', text: '用户' },
      device: { color: 'green', text: '设备' },
      plan: { color: 'purple', text: '套餐' },
      quota: { color: 'orange', text: '配额' },
      billing: { color: 'gold', text: '账单' },
      ticket: { color: 'cyan', text: '工单' },
      apikey: { color: 'magenta', text: 'API密钥' },
      system: { color: 'red', text: '系统' },
    };
    const config = typeConfig[type];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getMethodTag = (method: AuditLog['method']) => {
    const methodConfig = {
      GET: { color: 'default', text: 'GET' },
      POST: { color: 'green', text: 'POST' },
      PUT: { color: 'blue', text: 'PUT' },
      DELETE: { color: 'red', text: 'DELETE' },
      PATCH: { color: 'orange', text: 'PATCH' },
    };
    const config = methodConfig[method];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusTag = (status: AuditLog['status']) => {
    const statusConfig = {
      success: { color: 'success', text: '成功' },
      failed: { color: 'error', text: '失败' },
      warning: { color: 'warning', text: '警告' },
    };
    const config = statusConfig[status];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns: ColumnsType<AuditLog> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '操作人',
      dataIndex: 'userName',
      key: 'userName',
      width: 100,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      ellipsis: true,
    },
    {
      title: '资源类型',
      dataIndex: 'resourceType',
      key: 'resourceType',
      width: 100,
      render: (type: AuditLog['resourceType']) => getResourceTypeTag(type),
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method: AuditLog['method']) => getMethodTag(method),
    },
    {
      title: 'IP 地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: AuditLog['status']) => getStatusTag(status),
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: { showTitle: false },
      render: (details?: string) => (
        <Tooltip placement="topLeft" title={details}>
          {details}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="查看详情">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => console.log('查看详情:', record)}
          />
        </Tooltip>
      ),
    },
  ];

  // 过滤逻辑
  React.useEffect(() => {
    let filtered = logs;

    if (resourceTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.resourceType === resourceTypeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(log => log.method === methodFilter);
    }

    if (searchText) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchText.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchText.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [resourceTypeFilter, statusFilter, methodFilter, searchText, logs]);

  const handleExport = () => {
    console.log('导出审计日志');
    // TODO: 实现导出功能
  };

  const handleReset = () => {
    setResourceTypeFilter('all');
    setStatusFilter('all');
    setMethodFilter('all');
    setSearchText('');
  };

  return (
    <Card
      title="审计日志"
      extra={
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          导出日志
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker />
        <Select
          style={{ width: 120 }}
          value={resourceTypeFilter}
          onChange={setResourceTypeFilter}
          placeholder="资源类型"
        >
          <Option value="all">全部类型</Option>
          <Option value="user">用户</Option>
          <Option value="device">设备</Option>
          <Option value="plan">套餐</Option>
          <Option value="quota">配额</Option>
          <Option value="billing">账单</Option>
          <Option value="ticket">工单</Option>
          <Option value="apikey">API密钥</Option>
          <Option value="system">系统</Option>
        </Select>
        <Select
          style={{ width: 100 }}
          value={methodFilter}
          onChange={setMethodFilter}
          placeholder="方法"
        >
          <Option value="all">全部方法</Option>
          <Option value="GET">GET</Option>
          <Option value="POST">POST</Option>
          <Option value="PUT">PUT</Option>
          <Option value="DELETE">DELETE</Option>
          <Option value="PATCH">PATCH</Option>
        </Select>
        <Select
          style={{ width: 100 }}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="状态"
        >
          <Option value="all">全部状态</Option>
          <Option value="success">成功</Option>
          <Option value="failed">失败</Option>
          <Option value="warning">警告</Option>
        </Select>
        <Input
          placeholder="搜索操作、操作人或详情"
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <Button icon={<FilterOutlined />} onClick={handleReset}>
          重置
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredLogs}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条日志`,
          showSizeChanger: true,
        }}
        scroll={{ x: 1300 }}
      />
    </Card>
  );
};

export default AuditLogList;
