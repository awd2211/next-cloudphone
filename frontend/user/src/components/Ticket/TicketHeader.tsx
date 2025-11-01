import React from 'react';
import { Card, Space, Button, Divider } from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { TicketStatus, type Ticket } from '@/services/ticket';

interface TicketHeaderProps {
  ticket: Ticket;
  onBack: () => void;
  onRefresh: () => void;
  onClose: () => void;
  onReopen: () => void;
}

/**
 * 工单详情头部组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染关闭/重开按钮
 */
export const TicketHeader: React.FC<TicketHeaderProps> = React.memo(
  ({ ticket, onBack, onRefresh, onClose, onReopen }) => {
    return (
      <Card style={{ marginBottom: '16px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          {/* 左侧：返回按钮 + 标题 */}
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
              返回列表
            </Button>
            <Divider type="vertical" />
            <h2 style={{ margin: 0 }}>
              #{ticket.id.slice(0, 8)} - {ticket.title}
            </h2>
          </Space>

          {/* 右侧：操作按钮 */}
          <Space>
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              刷新
            </Button>

            {ticket.status === TicketStatus.CLOSED ? (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={onReopen}>
                重新打开
              </Button>
            ) : (
              <Button danger icon={<CloseCircleOutlined />} onClick={onClose}>
                关闭工单
              </Button>
            )}
          </Space>
        </Space>
      </Card>
    );
  }
);

TicketHeader.displayName = 'TicketHeader';
