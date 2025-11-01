/**
 * TicketDetailDrawer - 工单详情抽屉组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Rate,
  Space,
  Divider,
  Timeline,
  Card,
  Avatar,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { Ticket, TicketReply } from '@/types';
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getCategoryLabel,
  getReplyTypeColor,
} from './ticketLabelUtils';

interface TicketDetailDrawerProps {
  visible: boolean;
  selectedTicket: Ticket | null;
  ticketReplies: TicketReply[];
  onClose: () => void;
}

/**
 * TicketDetailDrawer 组件
 * 显示工单详细信息和回复记录
 */
export const TicketDetailDrawer = memo<TicketDetailDrawerProps>(
  ({ visible, selectedTicket, ticketReplies, onClose }) => {
    return (
      <Drawer title="工单详情" open={visible} onClose={onClose} width={800}>
        {selectedTicket && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="工单编号" span={2}>
                {selectedTicket.ticketNumber}
              </Descriptions.Item>
              <Descriptions.Item label="主题" span={2}>
                {selectedTicket.subject}
              </Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color="cyan">{getCategoryLabel(selectedTicket.category)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={getPriorityColor(selectedTicket.priority)}>
                  {getPriorityLabel(selectedTicket.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={getStatusColor(selectedTicket.status)}>
                  {getStatusLabel(selectedTicket.status)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="用户ID">{selectedTicket.userId}</Descriptions.Item>
              <Descriptions.Item label="分配给">
                {selectedTicket.assignedTo || <span style={{ color: '#999' }}>未分配</span>}
              </Descriptions.Item>
              <Descriptions.Item label="回复数">{selectedTicket.replyCount}</Descriptions.Item>
              <Descriptions.Item label="评分">
                {selectedTicket.rating ? (
                  <Rate disabled value={selectedTicket.rating} />
                ) : (
                  <span style={{ color: '#999' }}>未评分</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {selectedTicket.description}
              </Descriptions.Item>
              {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                <Descriptions.Item label="标签" span={2}>
                  <Space wrap>
                    {selectedTicket.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {new Date(selectedTicket.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(selectedTicket.updatedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            <Divider>回复记录</Divider>

            <Timeline mode="left">
              {ticketReplies.map((reply) => (
                <Timeline.Item
                  key={reply.id}
                  color={getReplyTypeColor(reply.type)}
                  label={new Date(reply.createdAt).toLocaleString('zh-CN')}
                >
                  <Card size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Avatar icon={<UserOutlined />} />
                        <span>{reply.userId}</span>
                        <Tag color={getReplyTypeColor(reply.type)}>{reply.type}</Tag>
                        {reply.isInternal && <Tag color="orange">内部备注</Tag>}
                      </Space>
                      <div>{reply.content}</div>
                    </Space>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          </>
        )}
      </Drawer>
    );
  }
);

TicketDetailDrawer.displayName = 'TicketDetailDrawer';
