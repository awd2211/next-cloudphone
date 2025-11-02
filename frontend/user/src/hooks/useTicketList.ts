import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  getTickets,
  getTicketStats,
  type Ticket,
  type TicketListQuery,
  type TicketStats,
  type TicketType,
  type TicketPriority,
  type TicketStatus,
} from '@/services/ticket';

/**
 * 工单列表 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 * 5. ✅ 查询参数统一管理
 */
export function useTicketList() {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<TicketListQuery>({
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // ===== 数据加载 =====
  /**
   * 加载工单列表
   */
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTickets(query);
      setTickets(response.items);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error.message || '加载工单列表失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  /**
   * 加载统计数据
   */
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getTicketStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  // ===== 搜索和筛选 =====
  /**
   * 处理搜索
   */
  const handleSearch = useCallback((keyword: string) => {
    setQuery((prev) => ({ ...prev, keyword, page: 1 }));
  }, []);

  /**
   * 处理状态筛选
   */
  const handleStatusChange = useCallback((status: TicketStatus | undefined) => {
    setQuery((prev) => ({ ...prev, status, page: 1 }));
  }, []);

  /**
   * 处理类型筛选
   */
  const handleTypeChange = useCallback((type: TicketType | undefined) => {
    setQuery((prev) => ({ ...prev, type, page: 1 }));
  }, []);

  /**
   * 处理优先级筛选
   */
  const handlePriorityChange = useCallback((priority: TicketPriority | undefined) => {
    setQuery((prev) => ({ ...prev, priority, page: 1 }));
  }, []);

  // ===== 分页处理 =====
  /**
   * 处理分页
   */
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    setQuery((prev) => ({ ...prev, page, pageSize: pageSize || prev.pageSize }));
  }, []);

  // ===== 刷新 =====
  /**
   * 处理刷新
   */
  const handleRefresh = useCallback(() => {
    loadTickets();
    loadStats();
  }, [loadTickets, loadStats]);

  // ===== Modal 控制 =====
  /**
   * 打开创建工单 Modal
   */
  const openCreateModal = useCallback(() => {
    setCreateModalVisible(true);
  }, []);

  /**
   * 关闭创建工单 Modal
   */
  const closeCreateModal = useCallback(() => {
    setCreateModalVisible(false);
  }, []);

  /**
   * 处理创建成功
   */
  const handleCreateSuccess = useCallback(() => {
    setCreateModalVisible(false);
    handleRefresh();
  }, [handleRefresh]);

  // ===== 导航 =====
  /**
   * 跳转到详情页
   */
  const goToDetail = useCallback(
    (ticketId: string) => {
      navigate(`/tickets/${ticketId}`);
    },
    [navigate]
  );

  // ===== 副作用 =====
  useEffect(() => {
    loadTickets();
    loadStats();
  }, [loadTickets, loadStats]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    tickets,
    total,
    stats,
    createModalVisible,
    query,

    // 搜索和筛选
    handleSearch,
    handleStatusChange,
    handleTypeChange,
    handlePriorityChange,

    // 分页
    handlePageChange,

    // 刷新
    handleRefresh,

    // Modal 控制
    openCreateModal,
    closeCreateModal,
    handleCreateSuccess,

    // 导航
    goToDetail,
  };
}
