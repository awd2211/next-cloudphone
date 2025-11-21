import { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import {
  useTicket,
  useTicketReplies,
  useAddTicketReply,
  useCloseTicket,
  useResolveTicket,
} from '@/hooks/queries/useTickets';
import { ReplyType } from '@/types';

/**
 * Ticket 详情页面业务逻辑 Hook
 *
 * 这是一个组合 Hook，整合了:
 * - 数据查询 (useTicket, useTicketReplies)
 * - Mutations (useAddTicketReply, useCloseTicket, useResolveTicket)
 * - 本地UI状态管理
 * - 业务逻辑处理
 */
export const useTicketDetail = (ticketId: string) => {
  // ==================== 数据查询 ====================

  // 获取工单详情
  const { data: ticket, isLoading: ticketLoading } = useTicket(ticketId, {
    enabled: !!ticketId,
  });

  // 获取工单回复列表
  const { data: replies = [], isLoading: repliesLoading } = useTicketReplies(ticketId);

  // ==================== Mutations ====================

  const addReplyMutation = useAddTicketReply();
  const closeTicketMutation = useCloseTicket();
  const resolveTicketMutation = useResolveTicket();

  // ==================== 本地 UI 状态 ====================

  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket?.status);

  // 同步 ticket 状态到本地状态
  useEffect(() => {
    if (ticket?.status) {
      setNewStatus(ticket.status);
    }
  }, [ticket?.status]);

  // ==================== 业务逻辑处理 ====================

  /**
   * 提交回复
   */
  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }

    if (!ticketId) {
      message.error('工单ID不存在');
      return;
    }

    addReplyMutation.mutate(
      {
        ticketId,
        data: {
          content: replyContent,
          isInternal: isInternalNote,
          userId: '', // TODO: Get from auth context
          type: ReplyType.STAFF, // Admin portal replies are from staff
        },
      },
      {
        onSuccess: () => {
          // 清空表单
          setReplyContent('');
          setIsInternalNote(false);

          // 如果需要更新状态
          if (newStatus && newStatus !== ticket?.status) {
            // 这里可以调用更新状态的 mutation
            // updateStatusMutation.mutate({ id: ticketId, status: newStatus });
          }
        },
      }
    );
  };

  /**
   * 关闭工单
   */
  const handleCloseTicket = () => {
    if (!ticketId) return;

    Modal.confirm({
      title: '确认关闭工单',
      content: '关闭后将无法继续回复，是否确认关闭？',
      onOk: () => {
        closeTicketMutation.mutate({ id: ticketId });
      },
    });
  };

  /**
   * 标记为已解决
   */
  const handleResolveTicket = () => {
    if (!ticketId) return;

    const solution = '问题已解决';

    Modal.confirm({
      title: '确认标记为已解决',
      content: '确认此工单已解决？',
      onOk: () => {
        resolveTicketMutation.mutate({ id: ticketId, solution });
      },
    });
  };

  // ==================== 返回值 ====================

  return {
    // 数据
    ticket: ticket || null,
    replies,
    isLoading: ticketLoading || repliesLoading,

    // 表单状态
    replyContent,
    setReplyContent,
    isInternalNote,
    setIsInternalNote,
    newStatus,
    setNewStatus,

    // 提交状态
    submitting: addReplyMutation.isPending,

    // 操作函数
    handleSubmitReply,
    handleCloseTicket,
    handleResolveTicket,
  };
};
