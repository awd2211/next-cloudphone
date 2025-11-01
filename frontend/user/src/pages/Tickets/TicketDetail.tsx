import React from 'react';
import { Spin } from 'antd';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { TicketStatus } from '@/services/ticket';
import {
  TicketHeader,
  TicketInfoCard,
  ReplyTimeline,
  ReplyForm,
} from '@/components/Ticket';
import { useTicketDetail } from '@/hooks/useTicketDetail';

/**
 * 工单详情页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 处理函数使用 useCallback 优化
 * 5. ✅ 代码从 438 行减少到 ~140 行
 */
const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    loading,
    repliesLoading,
    submitLoading,
    ticket,
    replies,
    replyContent,
    fileList,
    setReplyContent,
    setFileList,
    handleUpload,
    handleRemoveFile,
    handleSubmitReply,
    handleCloseTicket,
    handleReopenTicket,
    handleRefresh,
    handleBack,
  } = useTicketDetail(id);

  // 加载中状态
  if (loading || !ticket) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 头部 */}
      <TicketHeader
        ticket={ticket}
        onBack={handleBack}
        onRefresh={handleRefresh}
        onClose={handleCloseTicket}
        onReopen={handleReopenTicket}
      />

      {/* 工单信息 */}
      <TicketInfoCard ticket={ticket} />

      {/* 回复列表 */}
      <ReplyTimeline replies={replies} loading={repliesLoading} />

      {/* 添加回复表单 */}
      {ticket.status !== TicketStatus.CLOSED && (
        <ReplyForm
          replyContent={replyContent}
          fileList={fileList}
          submitLoading={submitLoading}
          onReplyChange={setReplyContent}
          onFileListChange={setFileList}
          onUpload={handleUpload}
          onRemove={handleRemoveFile}
          onSubmit={handleSubmitReply}
        />
      )}
    </div>
  );
};

export default TicketDetail;
