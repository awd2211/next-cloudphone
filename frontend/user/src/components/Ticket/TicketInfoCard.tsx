import React from 'react';
import { Card, Descriptions, Tag, Space, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ticketTypeConfig, priorityConfig, statusConfig } from '@/utils/ticketConfig';
import type { Ticket } from '@/services/ticket';

interface TicketInfoCardProps {
  ticket: Ticket;
}

/**
 * 工单信息卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 使用配置数据驱动 Tag 显示
 */
export const TicketInfoCard: React.FC<TicketInfoCardProps> = React.memo(({ ticket }) => {
  return (
    <Card title="工单信息" style={{ marginBottom: '16px' }}>
      <Descriptions column={2}>
        {/* 状态 */}
        <Descriptions.Item label="状态">
          <Tag color={statusConfig[ticket.status]?.color}>
            {statusConfig[ticket.status]?.label}
          </Tag>
        </Descriptions.Item>

        {/* 优先级 */}
        <Descriptions.Item label="优先级">
          <Tag color={priorityConfig[ticket.priority]?.color}>
            {priorityConfig[ticket.priority]?.label}
          </Tag>
        </Descriptions.Item>

        {/* 类型 */}
        <Descriptions.Item label="类型">
          <Tag color={ticketTypeConfig[ticket.type]?.color}>
            {ticketTypeConfig[ticket.type]?.label}
          </Tag>
        </Descriptions.Item>

        {/* 创建时间 */}
        <Descriptions.Item label="创建时间">
          {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm:ss')} (
          {dayjs(ticket.createdAt).fromNow()})
        </Descriptions.Item>

        {/* 处理人（可选） */}
        {ticket.assignedToName && (
          <Descriptions.Item label="处理人">{ticket.assignedToName}</Descriptions.Item>
        )}

        {/* 标签（可选） */}
        {ticket.tags && ticket.tags.length > 0 && (
          <Descriptions.Item label="标签" span={2}>
            {ticket.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Descriptions.Item>
        )}

        {/* 问题描述 */}
        <Descriptions.Item label="问题描述" span={2}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
        </Descriptions.Item>

        {/* 附件（可选） */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <Descriptions.Item label="附件" span={2}>
            <Space wrap>
              {ticket.attachments.map((att) => (
                <Button
                  key={att.id}
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(att.url, '_blank')}
                >
                  {att.filename}
                </Button>
              ))}
            </Space>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
});

TicketInfoCard.displayName = 'TicketInfoCard';
