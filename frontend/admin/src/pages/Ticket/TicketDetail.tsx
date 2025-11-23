import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { TicketInfoCard, ReplyList, ReplyForm } from '@/components/TicketDetail';
import { useTicketDetail } from '@/hooks/useTicketDetail';

const TicketDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    ticket,
    replies,
    isLoading,
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
  } = useTicketDetail(id || '');

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (!ticket) {
    return <div>工单不存在</div>;
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/admin/operations/tickets')}
        style={{ marginBottom: 16 }}
      >
        返回工单列表
      </Button>

      <TicketInfoCard
        ticket={ticket as any}
        onResolve={handleResolveTicket}
        onClose={handleCloseTicket}
      />

      <div style={{ marginTop: 16 }}>
        <ReplyList replies={replies as any} />
      </div>

      {ticket.status !== 'closed' && (
        <div style={{ marginTop: 16 }}>
          <ReplyForm
            replyContent={replyContent}
            onReplyContentChange={setReplyContent}
            newStatus={newStatus as any}
            onStatusChange={setNewStatus as any}
            isInternalNote={isInternalNote}
            onInternalNoteChange={setIsInternalNote}
            onSubmit={handleSubmitReply}
            submitting={submitting}
          />
        </div>
      )}
    </div>
  );
};

export default TicketDetail;
