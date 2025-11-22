import React, { memo } from 'react';
import { Modal, Space, Descriptions, Card, Typography } from 'antd';
import dayjs from 'dayjs';
import type { WebhookLog } from '@/types/webhook';
import { getProviderTag, getStatusTag } from '@/utils/webhook';

const { Paragraph } = Typography;

interface DetailModalProps {
  visible: boolean;
  log: WebhookLog | null;
  onClose: () => void;
}

// ✅ 使用 memo 包装组件，避免不必要的重渲染
export const DetailModal: React.FC<DetailModalProps> = memo(({ visible, log, onClose }) => {
  if (!log) return null;

  return (
    <Modal title="Webhook 日志详情" open={visible} onCancel={onClose} footer={null} width={800}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="日志ID" span={2}>
            {log.id}
          </Descriptions.Item>
          <Descriptions.Item label="提供商">{getProviderTag(log.provider)}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(log.status)}</Descriptions.Item>
          <Descriptions.Item label="事件类型" span={2}>
            {log.event}
          </Descriptions.Item>
          <Descriptions.Item label="重试次数">{log.retryCount}</Descriptions.Item>
          <Descriptions.Item label="接收时间">
            {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="处理时间" span={2}>
            {log.processedAt ? dayjs(log.processedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>

        {log.errorMessage && (
          <Card title="错误信息" size="small">
            <Paragraph copyable style={{ margin: 0, color: '#ff4d4f', whiteSpace: 'pre-wrap' }}>
              {log.errorMessage}
            </Paragraph>
          </Card>
        )}

        <Card title="请求体 (Request Body)" size="small">
          <Paragraph
            copyable
            style={{
              margin: 0,
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px',
              maxHeight: '300px',
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0, fontSize: '12px' }}>
              {JSON.stringify(log.requestBody, null, 2)}
            </pre>
          </Paragraph>
        </Card>

        {log.responseBody && (
          <Card title="响应体 (Response Body)" size="small">
            <Paragraph
              copyable
              style={{
                margin: 0,
                background: '#f5f5f5',
                padding: '12px',
                borderRadius: '4px',
                maxHeight: '300px',
                overflow: 'auto',
              }}
            >
              <pre style={{ margin: 0, fontSize: '12px' }}>
                {JSON.stringify(log.responseBody, null, 2)}
              </pre>
            </Paragraph>
          </Card>
        )}
      </Space>
    </Modal>
  );
});

DetailModal.displayName = 'WebhookLogs.DetailModal';
