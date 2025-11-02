import React from 'react';
import { Card, List, Avatar, Tag, Space } from 'antd';
import { UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { TicketReply } from '@/types/ticket';

interface ReplyListProps {
  replies: TicketReply[];
}

export const ReplyList: React.FC<ReplyListProps> = ({ replies }) => {
  return (
    <Card title="回复记录">
      <List
        itemLayout="vertical"
        dataSource={replies}
        renderItem={(reply) => (
          <List.Item
            key={reply.id}
            style={{
              backgroundColor: reply.isInternal ? '#fff7e6' : '#fff',
              padding: 16,
              marginBottom: 8,
              borderRadius: 4,
              border: reply.isInternal ? '1px solid #ffd591' : '1px solid #f0f0f0',
            }}
          >
            <List.Item.Meta
              avatar={<Avatar icon={<UserOutlined />} />}
              title={
                <Space>
                  <span>{reply.userName}</span>
                  <Tag color={reply.userType === 'admin' ? 'blue' : 'green'}>
                    {reply.userType === 'admin' ? '客服' : '客户'}
                  </Tag>
                  {reply.isInternal && <Tag color="orange">内部备注</Tag>}
                </Space>
              }
              description={
                <Space>
                  <ClockCircleOutlined />
                  <span>{reply.createdAt}</span>
                </Space>
              }
            />
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{reply.content}</div>
          </List.Item>
        )}
      />
    </Card>
  );
};
