import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, MOCK_TICKETS } from '@/components/TicketList/constants';

export const useTicketList = () => {
  const navigate = useNavigate();
  const [tickets] = useState<Ticket[]>(MOCK_TICKETS);
  const [loading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // 查看详情
  const handleViewDetail = useCallback(
    (ticket: Ticket) => {
      navigate(`/tickets/${ticket.id}`);
    },
    [navigate]
  );

  // 创建工单
  const handleCreateTicket = useCallback(() => {
    navigate('/tickets/create');
  }, [navigate]);

  // 使用 useMemo 缓存过滤后的数据
  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
        if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
        if (
          searchText &&
          !ticket.title.toLowerCase().includes(searchText.toLowerCase()) &&
          !ticket.ticketNo.toLowerCase().includes(searchText.toLowerCase())
        )
          return false;
        return true;
      }),
    [tickets, categoryFilter, statusFilter, priorityFilter, searchText]
  );

  return {
    loading,
    filteredTickets,
    searchText,
    categoryFilter,
    statusFilter,
    priorityFilter,
    setSearchText,
    setCategoryFilter,
    setStatusFilter,
    setPriorityFilter,
    handleViewDetail,
    handleCreateTicket,
  };
};
