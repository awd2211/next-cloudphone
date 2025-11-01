import React from 'react';
import { Card, Timeline, Empty } from 'antd';
import { ReplyItem } from './ReplyItem';
import type { TicketReply } from '@/services/ticket';

interface ReplyTimelineProps {
  replies: TicketReply[];
  loading?: boolean;
}

/**
 * 回复列表时间线组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 空状态展示
 * - 复用 ReplyItem 组件
 */
export const ReplyTimeline: React.FC<ReplyTimelineProps> = React.memo(({ replies, loading }) => {
  return (
    <Card
      title={`回复记录 (${replies.length})`}
      style={{ marginBottom: '16px' }}
      loading={loading}
    >
      {replies.length > 0 ? (
        <Timeline>
          {replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} />
          ))}
        </Timeline>
      ) : (
        <Empty description="暂无回复" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  );
});

ReplyTimeline.displayName = 'ReplyTimeline';
