import React from 'react';
import { Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { TicketInfoCard, ReplyList, ReplyForm } from '@/components/TicketDetail';
import { useTicketDetail } from '@/hooks/useTicketDetail';

const TicketDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
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
  } = useTicketDetail(id || '');

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/tickets')}
        style={{ marginBottom: 16 }}
      >
        返回工单列表
      </Button>

      <TicketInfoCard
        ticket={ticket}
        onResolve={handleResolveTicket}
        onClose={handleCloseTicket}
      />

      <div style={{ marginTop: 16 }}>
        <ReplyList replies={ticket.replies} />
      </div>

      {ticket.status !== 'closed' && (
        <div style={{ marginTop: 16 }}>
          <ReplyForm
            replyContent={replyContent}
            onReplyContentChange={setReplyContent}
            newStatus={newStatus}
            onStatusChange={setNewStatus}
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
