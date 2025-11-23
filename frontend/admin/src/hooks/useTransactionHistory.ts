import { useState, useEffect, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { useTransactionTableColumns, type Transaction } from '@/components/Billing';

/**
 * 交易统计数据
 */
export interface TransactionStatistics {
  /** 总交易数 */
  totalCount: number;
  /** 总收入（充值+退款+解冻） */
  totalIncome: number;
  /** 总支出（消费+冻结） */
  totalExpense: number;
  /** 成功交易数 */
  successCount: number;
  /** 处理中交易数 */
  pendingCount: number;
  /** 失败交易数 */
  failedCount: number;
}

export const useTransactionHistory = () => {
  // Mock 交易数据
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

  // 计算统计数据
  const statistics = useMemo<TransactionStatistics>(() => {
    const stats: TransactionStatistics = {
      totalCount: filteredTransactions.length,
      totalIncome: 0,
      totalExpense: 0,
      successCount: 0,
      pendingCount: 0,
      failedCount: 0,
    };

    filteredTransactions.forEach((t) => {
      // 统计收入/支出
      if (t.amount > 0) {
        stats.totalIncome += t.amount;
      } else {
        stats.totalExpense += Math.abs(t.amount);
      }

      // 统计状态
      switch (t.status) {
        case 'success':
          stats.successCount++;
          break;
        case 'pending':
          stats.pendingCount++;
          break;
        case 'failed':
          stats.failedCount++;
          break;
      }
    });

    return stats;
  }, [filteredTransactions]);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

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

  // 导出为 CSV
  const handleExport = useCallback(() => {
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
  }, [filteredTransactions]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setTypeFilter('all');
    setStatusFilter('all');
    setSearchText('');
  }, []);

  // 刷新数据（模拟）
  const refetch = useCallback(() => {
    setLoading(true);
    // 模拟 API 请求
    setTimeout(() => {
      // 实际应用中这里会调用 API
      setTransactions((prev) => [...prev]);
      setLoading(false);
    }, 500);
  }, []);

  // 表格列定义
  const columns = useTransactionTableColumns();

  return {
    // 数据状态
    filteredTransactions,
    loading,
    statistics,
    // 筛选状态
    typeFilter,
    statusFilter,
    searchText,
    // 状态更新函数
    setTypeFilter,
    setStatusFilter,
    setSearchText,
    // 表格列
    columns,
    // 操作函数
    handleExport,
    handleReset,
    refetch,
  };
};
