import React from 'react';
import { Modal, Descriptions } from 'antd';
import type { AuditLog } from '@/services/log';
import dayjs from 'dayjs';
import { NEUTRAL_LIGHT } from '@/theme';

interface LogDetailModalProps {
  visible: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = React.memo(
  ({ visible, log, onClose }) => {
    return (
      <Modal
        title="日志详情"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
      >
        {log && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="日志ID" span={2}>
              {log.id}
            </Descriptions.Item>
            <Descriptions.Item label="用户">{log.user?.username || '-'}</Descriptions.Item>
            <Descriptions.Item label="用户邮箱">{log.user?.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作">{log.action}</Descriptions.Item>
            <Descriptions.Item label="资源">{log.resource}</Descriptions.Item>
            <Descriptions.Item label="资源ID" span={2}>
              {log.resourceId || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="请求方法">{log.method}</Descriptions.Item>
            <Descriptions.Item label="请求路径">{log.path}</Descriptions.Item>
            <Descriptions.Item label="IP地址">{log.ip}</Descriptions.Item>
            <Descriptions.Item label="响应状态">{log.responseStatus}</Descriptions.Item>
            <Descriptions.Item label="耗时">{log.duration} ms</Descriptions.Item>
            <Descriptions.Item label="操作时间">
              {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="User Agent" span={2}>
              {log.userAgent}
            </Descriptions.Item>
            {log.requestBody && (
              <Descriptions.Item label="请求数据" span={2}>
                <pre
                  style={{
                    maxHeight: 200,
                    overflow: 'auto',
                    background: NEUTRAL_LIGHT.bg.layout,
                    padding: 8,
                  }}
                >
                  {JSON.stringify(log.requestBody, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    );
  }
);

LogDetailModal.displayName = 'LogDetailModal';
