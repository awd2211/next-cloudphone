import React from 'react';
import { Timeline, Space, Tag, Avatar, Button } from 'antd';
import { UserOutlined, PaperClipOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TicketReply } from '@/services/ticket';

interface ReplyItemProps {
  reply: TicketReply;
}

/**
 * 单个回复项组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 客服和用户回复不同的背景色
 */
export const ReplyItem: React.FC<ReplyItemProps> = React.memo(({ reply }) => {
  return (
    <Timeline.Item
      color={reply.isStaff ? 'blue' : 'green'}
      dot={
        <Avatar
          size="small"
          icon={<UserOutlined />}
          src={reply.userAvatar}
          style={{
            backgroundColor: reply.isStaff ? '#1890ff' : '#52c41a',
          }}
        />
      }
    >
      <div>
        {/* 用户信息 + 时间 */}
        <Space>
          <strong>{reply.userName}</strong>
          {reply.isStaff && <Tag color="blue">客服</Tag>}
          <span style={{ color: '#999', fontSize: '12px' }}>
            {dayjs(reply.createdAt).format('YYYY-MM-DD HH:mm:ss')} (
            {dayjs(reply.createdAt).fromNow()})
          </span>
        </Space>

        {/* 回复内容 */}
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            background: reply.isStaff ? '#e6f7ff' : '#f6ffed',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {reply.content}
        </div>

        {/* 附件（可选） */}
        {reply.attachments && reply.attachments.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <Space wrap>
              {reply.attachments.map((att) => (
                <Button
                  key={att.id}
                  size="small"
                  icon={<PaperClipOutlined />}
                  onClick={() => window.open(att.url, '_blank')}
                >
                  {att.filename}
                </Button>
              ))}
            </Space>
          </div>
        )}
      </div>
    </Timeline.Item>
  );
});

ReplyItem.displayName = 'ReplyItem';
