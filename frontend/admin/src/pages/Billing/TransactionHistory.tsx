import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, DatePicker, Select, Input, Badge } from 'antd';
import { DownloadOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Transaction {
  id: string;
  type: 'recharge' | 'consumption' | 'refund' | 'freeze' | 'unfreeze';
  amount: number;
  balance: number;
  description: string;
  status: 'success' | 'pending' | 'failed';
  createdAt: string;
  orderId?: string;
  paymentMethod?: string;
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'txn-001',
      type: 'recharge',
      amount: 5000.0,
      balance: 15620.5,
      description: '在线充值',
      status: 'success',
      createdAt: '2025-10-20 14:30:25',
      orderId: 'ORD20251020143025',
      paymentMethod: '支付宝',
    },
    {
      id: 'txn-002',
      type: 'consumption',
      amount: -320.5,
      balance: 10620.5,
      description: '设备租赁费用',
      status: 'success',
      createdAt: '2025-10-19 10:15:42',
    },
    {
      id: 'txn-003',
      type: 'freeze',
      amount: -500.0,
      balance: 10941.0,
      description: '资源预留冻结',
      status: 'success',
      createdAt: '2025-10-18 16:20:10',
    },
    {
      id: 'txn-004',
      type: 'consumption',
      amount: -1250.0,
      balance: 11441.0,
      description: 'CPU 和内存使用费',
      status: 'success',
      createdAt: '2025-10-17 09:45:33',
    },
    {
      id: 'txn-005',
      type: 'refund',
      amount: 150.0,
      balance: 12691.0,
      description: '服务退款',
      status: 'success',
      createdAt: '2025-10-16 11:22:18',
    },
    {
      id: 'txn-006',
      type: 'recharge',
      amount: 3000.0,
      balance: 12541.0,
      description: '在线充值',
      status: 'success',
      createdAt: '2025-10-15 13:10:05',
      orderId: 'ORD20251015131005',
      paymentMethod: '微信支付',
    },
    {
      id: 'txn-007',
      type: 'consumption',
      amount: -680.0,
      balance: 9541.0,
      description: '存储费用',
      status: 'success',
      createdAt: '2025-10-14 15:35:50',
    },
    {
      id: 'txn-008',
      type: 'unfreeze',
      amount: 500.0,
      balance: 10221.0,
      description: '解冻预留资源',
      status: 'success',
      createdAt: '2025-10-13 08:50:15',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(transactions);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  const getTypeTag = (type: Transaction['type']) => {
    const typeConfig = {
      recharge: { color: 'green', text: '充值' },
      consumption: { color: 'red', text: '消费' },
      refund: { color: 'blue', text: '退款' },
      freeze: { color: 'orange', text: '冻结' },
      unfreeze: { color: 'cyan', text: '解冻' },
    };
    const config = typeConfig[type];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusBadge = (status: Transaction['status']) => {
    const statusConfig = {
      success: { status: 'success', text: '成功' },
      pending: { status: 'processing', text: '处理中' },
      failed: { status: 'error', text: '失败' },
    };
    const config = statusConfig[status] as any;
    return <Badge status={config.status} text={config.text} />;
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: '交易时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: '交易类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: Transaction['type']) => getTypeTag(type),
    },
    {
      title: '交易金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount: number) => (
        <span style={{ color: amount > 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
          {amount > 0 ? '+' : ''}¥{Math.abs(amount || 0).toFixed(2)}
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: '账户余额',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      render: (balance: number) => `¥${(balance || 0).toFixed(2)}`,
    },
    {
      title: '交易描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 180,
      render: (orderId?: string) => orderId || '-',
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 100,
      render: (method?: string) => method || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Transaction['status']) => getStatusBadge(status),
    },
  ];

  // 过滤逻辑
  useEffect(() => {
    let filtered = transactions;

    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (searchText) {
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchText.toLowerCase()) ||
          t.orderId?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [typeFilter, statusFilter, searchText, transactions]);

  const handleExport = () => {
    // 将交易记录导出为 CSV 文件
    const headers = ['交易ID', '类型', '金额', '余额', '状态', '描述', '交易时间'];
    const typeMap: Record<string, string> = {
      recharge: '充值',
      consumption: '消费',
      refund: '退款',
      freeze: '冻结',
      unfreeze: '解冻',
    };
    const statusMap: Record<string, string> = {
      success: '成功',
      pending: '处理中',
      failed: '失败',
      cancelled: '已取消',
    };

    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map((tx) =>
        [
          tx.id,
          typeMap[tx.type] || tx.type,
          tx.amount,
          tx.balance,
          statusMap[tx.status] || tx.status,
          `"${(tx.description || '').replace(/"/g, '""')}"`, // 转义 CSV 中的引号
          dayjs(tx.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        ].join(',')
      ),
    ].join('\n');

    // 添加 UTF-8 BOM 以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setSearchText('');
  };

  return (
    <Card
      title="交易记录"
      extra={
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
          导出记录
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker />
        <Select
          style={{ width: 120 }}
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="交易类型"
        >
          <Option value="all">全部类型</Option>
          <Option value="recharge">充值</Option>
          <Option value="consumption">消费</Option>
          <Option value="refund">退款</Option>
          <Option value="freeze">冻结</Option>
          <Option value="unfreeze">解冻</Option>
        </Select>
        <Select
          style={{ width: 120 }}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="交易状态"
        >
          <Option value="all">全部状态</Option>
          <Option value="success">成功</Option>
          <Option value="pending">处理中</Option>
          <Option value="failed">失败</Option>
        </Select>
        <Input
          placeholder="搜索描述或订单号"
          prefix={<SearchOutlined />}
          style={{ width: 220 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button icon={<FilterOutlined />} onClick={handleReset}>
          重置
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredTransactions}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条记录`,
          showSizeChanger: true,
        }}
      />
    </Card>
  );
};

export default TransactionHistory;
