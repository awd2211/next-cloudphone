import { memo } from 'react';
import { Modal, Descriptions, Tag } from 'antd';
import type { UserEvent } from '@/types';
import dayjs from 'dayjs';

interface EventDetailModalProps {
  visible: boolean;
  event: UserEvent | null;
  onClose: () => void;
  getEventTypeColor: (type: string) => string;
}

/**
 * 事件详情Modal组件
 * 显示事件的详细信息
 */
export const EventDetailModal = memo<EventDetailModalProps>(
  ({ visible, event, onClose, getEventTypeColor }) => {
    return (
      <Modal title="事件详情" open={visible} onCancel={onClose} footer={null} width={800}>
        {event && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="事件ID">{event.id}</Descriptions.Item>
            <Descriptions.Item label="用户ID">{event.aggregateId}</Descriptions.Item>
            <Descriptions.Item label="事件类型">
              <Tag color={getEventTypeColor(event.eventType)}>{event.eventType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="版本">{event.version}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(event.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="事件数据">
              <pre
                style={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  margin: 0,
                }}
              >
                {JSON.stringify(event.eventData, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    );
  }
);

EventDetailModal.displayName = 'EventDetailModal';
