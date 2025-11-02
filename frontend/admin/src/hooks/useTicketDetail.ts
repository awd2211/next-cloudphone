import { useState } from 'react';
import { message, Modal } from 'antd';
import request from '@/utils/request';
import type { TicketDetail, TicketReply } from '@/types/ticket';

export const useTicketDetail = (ticketId: string) => {
  const [ticket, setTicket] = useState<TicketDetail>({
    id: 'ticket-001',
    ticketNo: 'TKT-20251020-001',
    title: '设备无法启动',
    content:
      '我的设备ID DEV-12345 无法启动，点击启动按钮后没有任何反应。已经尝试重启浏览器和清除缓存，问题依然存在。请协助处理。',
    category: 'technical',
    priority: 'high',
    status: 'in_progress',
    userId: 'user-001',
    userName: '张三',
    userEmail: 'zhangsan@example.com',
    assignedTo: 'admin-001',
    assignedToName: '李工程师',
    createdAt: '2025-10-20 09:30:15',
    updatedAt: '2025-10-20 14:22:30',
    replies: [
      {
        id: 'reply-001',
        userId: 'admin-001',
        userName: '李工程师',
        userType: 'admin',
        content: '您好,我已经查看了您的设备日志。请问您是什么时候开始遇到这个问题的？',
        createdAt: '2025-10-20 10:15:20',
        isInternal: false,
      },
      {
        id: 'reply-002',
        userId: 'user-001',
        userName: '张三',
        userType: 'customer',
        content: '大概是昨天下午开始的，之前一直都正常。',
        createdAt: '2025-10-20 11:20:45',
        isInternal: false,
      },
      {
        id: 'reply-003',
        userId: 'admin-001',
        userName: '李工程师',
        userType: 'admin',
        content: '[内部备注] 发现是容器启动失败，可能是资源不足导致',
        createdAt: '2025-10-20 12:30:10',
        isInternal: true,
      },
      {
        id: 'reply-004',
        userId: 'admin-001',
        userName: '李工程师',
        userType: 'admin',
        content:
          '我已经找到问题了，是由于系统资源分配异常导致的。我已经为您重新分配了资源，请尝试重新启动设备。',
        createdAt: '2025-10-20 14:10:30',
        isInternal: false,
      },
      {
        id: 'reply-005',
        userId: 'user-001',
        userName: '张三',
        userType: 'customer',
        content: '太好了！现在可以正常启动了，谢谢您的帮助！',
        createdAt: '2025-10-20 14:22:30',
        isInternal: false,
      },
    ],
  });

  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }

    setSubmitting(true);
    try {
      // 调用后端 API 提交回复
      const response = await request.post(`/tickets/${ticketId}/replies`, {
        content: replyContent,
        isInternal: isInternalNote,
        newStatus: newStatus,
      });

      const newReply: TicketReply = {
        id: response.data.id,
        userId: response.data.userId,
        userName: response.data.userName,
        userType: 'admin',
        content: response.data.content,
        createdAt: response.data.createdAt,
        isInternal: response.data.isInternal,
      };

      setTicket({
        ...ticket,
        replies: [...ticket.replies, newReply],
        status: response.data.ticketStatus || newStatus,
        updatedAt: response.data.updatedAt || new Date().toLocaleString('zh-CN'),
      });

      setReplyContent('');
      setIsInternalNote(false);
      message.success('回复已提交');
    } catch (error) {
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = () => {
    Modal.confirm({
      title: '确认关闭工单',
      content: '关闭后将无法继续回复，是否确认关闭？',
      onOk: () => {
        setTicket({ ...ticket, status: 'closed' });
        setNewStatus('closed');
        message.success('工单已关闭');
      },
    });
  };

  const handleResolveTicket = () => {
    setTicket({ ...ticket, status: 'resolved' });
    setNewStatus('resolved');
    message.success('工单已标记为已解决');
  };

  return {
    ticket,
    replyContent,
    setReplyContent,
    isInternalNote,
    setIsInternalNote,
    newStatus,
    setNewStatus,
    submitting,
    handleSubmitReply,
    handleCloseTicket,
    handleResolveTicket,
  };
};
