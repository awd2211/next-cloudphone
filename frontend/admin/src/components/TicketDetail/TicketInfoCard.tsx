import React from 'react';
import { Card, Descriptions, Tag, Badge, Button, Space } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { TicketDetail } from '@/types/ticket';

interface TicketInfoCardProps {
  ticket: TicketDetail;
  onResolve: () => void;
  onClose: () => void;
}

export const TicketInfoCard: React.FC<TicketInfoCardProps> = ({
  ticket,
  onResolve,
  onClose,
}) => {
  const getCategoryTag = (category: TicketDetail['category']) => {
    const categoryConfig = {
      technical: { color: 'blue', text: '技术问题' },
      billing: { color: 'orange', text: '账单问题' },
      account: { color: 'green', text: '账号问题' },
      other: { color: 'default', text: '其他' },
    };
    const config = categoryConfig[category];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getPriorityTag = (priority: TicketDetail['priority']) => {
    const priorityConfig = {
      low: { color: 'default', text: '低' },
      medium: { color: 'blue', text: '中' },
      high: { color: 'orange', text: '高' },
      urgent: { color: 'red', text: '紧急' },
    };
    const config = priorityConfig[priority];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getStatusBadge = (status: TicketDetail['status']) => {
    const statusConfig = {
      open: { status: 'error', text: '待处理' },
      in_progress: { status: 'processing', text: '处理中' },
      waiting_customer: { status: 'warning', text: '等待客户' },
      resolved: { status: 'success', text: '已解决' },
      closed: { status: 'default', text: '已关闭' },
    };
    const config = statusConfig[status] as any;
    return <Badge status={config.status} text={config.text} />;
  };

  const showActionButtons =
    ticket.status !== 'closed' || ticket.status !== 'resolved';

  return (
    <Card
      title={`工单详情 - ${ticket.ticketNo}`}
      extra={
        showActionButtons && (
          <Space>
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <Button type="primary" icon={<CheckOutlined />} onClick={onResolve}>
                标记为已解决
              </Button>
            )}
            {ticket.status !== 'closed' && (
              <Button danger icon={<CloseOutlined />} onClick={onClose}>
                关闭工单
              </Button>
            )}
          </Space>
        )
      }
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="工单标题" span={2}>
          {ticket.title}
        </Descriptions.Item>
        <Descriptions.Item label="分类">{getCategoryTag(ticket.category)}</Descriptions.Item>
        <Descriptions.Item label="优先级">{getPriorityTag(ticket.priority)}</Descriptions.Item>
        <Descriptions.Item label="状态">{getStatusBadge(ticket.status)}</Descriptions.Item>
        <Descriptions.Item label="负责人">
          {ticket.assignedToName || <Tag>未分配</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="提交人">{ticket.userName}</Descriptions.Item>
        <Descriptions.Item label="联系邮箱">{ticket.userEmail}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{ticket.createdAt}</Descriptions.Item>
        <Descriptions.Item label="最后更新">{ticket.updatedAt}</Descriptions.Item>
        <Descriptions.Item label="问题描述" span={2}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.content}</div>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};
